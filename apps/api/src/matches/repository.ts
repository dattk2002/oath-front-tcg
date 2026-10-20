import { isDeepStrictEqual } from "node:util";
import { hashState } from "@oathfront/game-engine";
import type {
  MatchState,
  MatchConfig,
  TransitionResult,
  JournalEntry,
} from "@oathfront/game-engine";
import { coreCatalog } from "@oathfront/game-content";
import { validateWire } from "@oathfront/contracts";
import { transaction, safeInteger } from "@oathfront/db";
import type { Pool, PoolClient } from "@oathfront/db";
import {
  PersistenceError,
  encodeCheckpoint,
  decodeCheckpoint,
} from "./checkpoint.js";
import { validateJournalBatch, appendEvents } from "./journal.js";
import { insertInitialization, registerRelease } from "./initialization.js";
import type { InitializationMetadata } from "./initialization.js";
import { auditReplay } from "./replay.js";
import { persistResult } from "./results.js";
import { insertMatchReceipt } from "./receipts.js";
import type { Receipt } from "./receipts.js";
export type { Receipt } from "./receipts.js";
export interface MatchRecord {
  id: string;
  principalId: string;
  revision: number;
  state: MatchState;
  lastStepSeq: number;
  activeDurationMs: number;
  lastActivityAt: Date;
  botIntentsSinceHuman: number;
  rematch: unknown;
}
export interface MatchTransaction {
  client: PoolClient;
  record: MatchRecord;
}
const days = (now: Date, n: number) => new Date(now.getTime() + n * 86400000);
const json = (value: unknown) => JSON.stringify(value);
export async function lockPrincipals(tx: PoolClient, ids: readonly string[]) {
  if (ids.length === 0 || ids.some((id) => !validateWire("Uuid", id)))
    throw new PersistenceError("INVALID_PRINCIPAL");
  const unique = [...new Set(ids)].sort();
  const result = await tx.query(
    "SELECT id FROM principals WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
    [unique],
  );
  if (result.rowCount !== unique.length)
    throw new PersistenceError("NOT_FOUND");
}
async function readRecord(
  tx: PoolClient,
  principalId: string,
  matchId: string,
  lock: boolean,
  now: Date,
): Promise<MatchRecord> {
  const r = await tx.query(
    `SELECT m.*,c.state,c.state_hash,c.last_event_seq,c.revision AS checkpoint_revision,(SELECT coalesce(max(step_seq),0) FROM match_action_journal j WHERE j.match_id=m.id) AS last_step_seq FROM matches m JOIN match_checkpoints c ON c.match_id=m.id WHERE m.id=$1 AND m.human_principal_id=$2 ${lock ? "FOR UPDATE OF m,c" : ""}`,
    [matchId, principalId],
  );
  const row = r.rows[0];
  if (!row) {
    const exists = await tx.query(
      "SELECT 1 FROM matches WHERE id=$1 AND human_principal_id=$2",
      [matchId, principalId],
    );
    throw new PersistenceError(
      exists.rowCount ? "MATCH_DETAILS_EXPIRED" : "NOT_FOUND",
    );
  }
  if (row.details_expires_at && row.details_expires_at <= now)
    throw new PersistenceError("MATCH_DETAILS_EXPIRED");
  const state = decodeCheckpoint(row.state, row.state_hash),
    revision = safeInteger(row.revision);
  if (
    state.matchId !== row.id ||
    state.humanSide !== row.human_side ||
    state.mode !== row.mode ||
    state.lifecycle !== row.status ||
    state.eventSeq !== safeInteger(row.last_event_seq) ||
    revision !== safeInteger(row.checkpoint_revision) ||
    state.versions.rules !== row.rules_version ||
    state.versions.content !== row.content_version ||
    state.versions.locations !== row.location_version ||
    state.versions.bot !== row.bot_version
  )
    throw new PersistenceError("INVALID_CHECKPOINT");
  if (
    state.versions.content !== coreCatalog.version ||
    state.versions.rules !== coreCatalog.rulesVersion ||
    state.versions.locations !== coreCatalog.locationVersion ||
    state.versions.bot !== "bot_v1"
  )
    throw new PersistenceError("VERSION_UNSUPPORTED");
  return {
    id: row.id,
    principalId: row.human_principal_id,
    revision,
    state,
    lastStepSeq: safeInteger(row.last_step_seq),
    activeDurationMs: safeInteger(row.active_duration_ms),
    lastActivityAt: row.last_activity_at,
    botIntentsSinceHuman: safeInteger(row.bot_intents_since_human),
    rematch: row.rematch,
  };
}
export function createRepository(
  pool: Pool,
  options: { now?: () => Date } = {},
) {
  const now = options.now ?? (() => new Date());
  return {
    async withPrincipalTransaction<T>(
      principalIds: readonly string[],
      fn: (tx: PoolClient) => Promise<T>,
    ): Promise<T> {
      return transaction(pool, async (tx) => {
        await lockPrincipals(tx, principalIds);
        return fn(tx);
      });
    },
    async registerRelease() {
      return registerRelease(pool);
    },
    async createMatch(
      principalId: string,
      config: MatchConfig,
      seed: Uint8Array,
      metadata: InitializationMetadata,
    ) {
      return transaction(pool, async (tx) => {
        await lockPrincipals(tx, [principalId]);
        return insertInitialization(
          tx,
          principalId,
          config,
          seed,
          metadata,
          now(),
        );
      });
    },
    async withLockedMatch<T>(
      principalId: string,
      matchId: string,
      fn: (tx: MatchTransaction, record: MatchRecord) => Promise<T>,
    ): Promise<T> {
      return transaction(pool, async (client) => {
        await lockPrincipals(client, [principalId]);
        const record = await readRecord(
          client,
          principalId,
          matchId,
          true,
          now(),
        );
        return fn({ client, record }, record);
      });
    },
    async loadMatch(principalId: string, matchId: string) {
      return transaction(pool, (tx) =>
        readRecord(tx, principalId, matchId, false, now()),
      );
    },
    async findReceipt(principalId: string, commandId: string, tx?: PoolClient) {
      const result = await (tx ?? pool).query(
        "SELECT request_hash,response,resulting_revision FROM command_receipts WHERE principal_id=$1 AND command_id=$2",
        [principalId, commandId],
      );
      const row = result.rows[0];
      return row
        ? {
            requestHash: String(row.request_hash),
            response: row.response as unknown,
            resultingRevision:
              row.resulting_revision === null
                ? null
                : safeInteger(row.resulting_revision),
          }
        : null;
    },
    async replayMatch(principalId: string, matchId: string) {
      return transaction(pool, async (tx) => {
        await lockPrincipals(tx, [principalId]);
        const record = await readRecord(tx, principalId, matchId, true, now());
        return auditReplay(tx, record);
      });
    },
  };
}
/** Must be called with the transaction returned by withLockedMatch; never auto-commits. */
export async function persistTransition(
  tx: MatchTransaction,
  transition: TransitionResult,
  journal: readonly JournalEntry[],
  receipt: Receipt,
  options: { now?: Date } = {},
) {
  const { record, client } = tx,
    now = options.now ?? new Date();
  validateJournalBatch(record.state, record.lastStepSeq, transition, journal);
  const state = transition.nextState,
    revision = record.revision + 1;
  if (
    !Number.isSafeInteger(revision) ||
    state.matchId !== record.id ||
    state.humanSide !== record.state.humanSide ||
    state.mode !== record.state.mode ||
    !isDeepStrictEqual(state.versions, record.state.versions) ||
    !isDeepStrictEqual(state.deckSnapshots, record.state.deckSnapshots)
  )
    throw new PersistenceError("INVALID_TRANSITION");
  const envelope = encodeCheckpoint(state);
  const terminal = !["ACTIVE", "PAUSED"].includes(state.lifecycle);
  const duration =
    record.activeDurationMs +
    (record.state.lifecycle === "ACTIVE"
      ? Math.min(
          60000,
          Math.max(0, now.getTime() - record.lastActivityAt.getTime()),
        )
      : 0);
  await client.query(
    "UPDATE matches SET status=$2,revision=$3,updated_at=$4,last_activity_at=$4,active_duration_ms=$5,ended_at=$6,details_expires_at=$7,history_expires_at=$8 WHERE id=$1",
    [
      record.id,
      state.lifecycle,
      revision,
      now,
      duration,
      terminal ? now : null,
      terminal ? days(now, 30) : null,
      terminal ? days(now, 180) : null,
    ],
  );
  await client.query(
    "UPDATE match_checkpoints SET revision=$2,state=$3,state_hash=$4,last_event_seq=$5,updated_at=$6 WHERE match_id=$1",
    [
      record.id,
      revision,
      json(envelope),
      hashState(state),
      state.eventSeq,
      now,
    ],
  );
  for (const e of journal)
    await client.query(
      "INSERT INTO match_action_journal(match_id,step_seq,origin,command_id,action,next_bot_random_state,pre_state_hash,post_state_hash,first_event_seq,last_event_seq) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        record.id,
        e.stepSeq,
        e.origin,
        receipt.commandId,
        json(e.action),
        e.nextBotRandomState === null ? null : json(e.nextBotRandomState),
        e.preStateHash,
        e.postStateHash,
        e.firstEventSeq,
        e.lastEventSeq,
      ],
    );
  await appendEvents(client, record.id, transition.events);
  if (terminal) {
    await persistResult(client, {
      matchId: record.id,
      principalId: record.principalId,
      before: record.state,
      state,
      duration,
      rematch: record.rematch,
      now,
    });
    await client.query(
      "UPDATE command_receipts SET expires_at=$2 WHERE principal_id=$1 AND resource_id=$3",
      [record.principalId, days(now, 30), record.id],
    );
  }
  // Receipt is last: any error here must roll back every preceding durable change.
  await insertMatchReceipt(client, {
    principalId: record.principalId,
    state,
    revision,
    receipt: {
      ...receipt,
      expiresAt: terminal ? days(now, 30) : receipt.expiresAt,
    },
    now,
  });
  record.state = state;
  record.revision = revision;
  record.lastStepSeq = journal.at(-1)!.stepSeq;
  record.activeDurationMs = duration;
  record.lastActivityAt = now;
}
