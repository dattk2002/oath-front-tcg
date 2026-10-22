import { randomUUID } from "node:crypto";
import type { DailyCreateRequest } from "@oathfront/contracts";
import type { Pool, PoolClient } from "@oathfront/db";
import { abandonMatch, hashState } from "@oathfront/game-engine";
import type { MatchConfig, JournalEntry } from "@oathfront/game-engine";
import type { SessionPrincipal } from "../auth/sessions.js";
import { revalidateSession } from "../auth/sessions.js";
import {
  createRepository,
  readRecord,
  persistTransition,
} from "../matches/repository.js";
import { hashJson, insertInitialization } from "../matches/initialization.js";
import { commandResponse } from "../matches/events.js";
import { botScheduler } from "../matches/advance.js";
import type { Scheduler } from "../matches/commands.js";
import { insertMatchReceipt } from "../matches/receipts.js";
import { HttpError, output } from "../http.js";
import { loadScenario } from "./scenarios.js";

async function closeExpiredChallenge(
  tx: PoolClient,
  principalId: string,
  time: Date,
) {
  const active = (
    await tx.query(
      "SELECT id,expires_at,mode FROM matches WHERE human_principal_id=$1 AND status IN ('ACTIVE','PAUSED') FOR UPDATE",
      [principalId],
    )
  ).rows[0];
  if (!active) return;
  if (active.mode !== "DAILY_CHALLENGE" || +active.expires_at > +time)
    throw new HttpError(409, "ACTIVE_MATCH_EXISTS", { matchId: active.id });
  const record = await readRecord(tx, principalId, active.id, true, time),
    transition = abandonMatch(record.state, "EXPIRED");
  const entry: JournalEntry = {
    stepSeq: record.lastStepSeq + 1,
    origin: "AUTO",
    action: { kind: "ADMIN_ABANDON", reason: "EXPIRED" },
    nextBotRandomState: null,
    preStateHash: hashState(record.state),
    postStateHash: hashState(transition.nextState),
    firstEventSeq: transition.events[0]?.sequence ?? null,
    lastEventSeq: transition.events.at(-1)?.sequence ?? null,
  };
  await persistTransition({ client: tx, record }, transition, [entry], null, {
    now: time,
  });
}
export function dailyService(
  pool: Pool,
  now: () => Date,
  scheduler: Scheduler = botScheduler,
) {
  const repository = createRepository(pool, { now });
  return {
    async startDaily(principal: SessionPrincipal, request: DailyCreateRequest) {
      return repository.withPrincipalTransaction([principal.id], async (tx) => {
        const time = now();
        await revalidateSession(tx, principal, time);
        const hash = hashJson({ route: "startDaily", request }),
          receipt = await repository.findReceipt(
            principal.id,
            request.commandId,
            tx,
          );
        if (receipt) {
          if (receipt.requestHash !== hash)
            throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
          return output("CommandResponse", receipt.response);
        }
        if (principal.kind !== "ACCOUNT" && !request.practice)
          throw new HttpError(403, "FORBIDDEN");
        await closeExpiredChallenge(tx, principal.id, time);
        const row = (
          await tx.query(
            "SELECT s.id,s.event_id,s.day_index,e.starts_at,e.ends_at FROM event_scenarios s JOIN weekly_events e ON e.id=s.event_id WHERE s.id=$1 AND e.state='PUBLISHED'",
            [request.scenarioId],
          )
        ).rows[0];
        if (!row) throw new HttpError(404, "NOT_FOUND");
        const start = new Date(+row.starts_at + row.day_index * 86400000),
          end = new Date(+start + 86400000),
          deadline = new Date(+end + 86400000);
        if (+time < +start || (!request.practice && +time >= +end))
          throw new HttpError(409, "DAILY_UNAVAILABLE", {
            reason: "NOT_OPEN",
            retryAvailableAt: null,
          });
        if (
          !request.practice &&
          (
            await tx.query(
              "SELECT 1 FROM reward_ledger WHERE account_id=$1 AND event_id=$2 AND source_key=$3",
              [principal.id, row.event_id, `daily:${row.day_index}`],
            )
          ).rowCount
        )
          throw new HttpError(409, "DAILY_UNAVAILABLE", {
            reason: "COMPLETED",
            retryAvailableAt: null,
          });
        const latest = (
          await tx.query(
            "SELECT max(a.retry_available_at) AS retry_available_at FROM daily_attempts a JOIN match_reward_bindings b ON b.match_id=a.match_id WHERE a.principal_id=$1 AND a.scenario_id=$2 AND b.kind=$3",
            [principal.id, row.id, request.practice ? "PRACTICE" : "DAILY"],
          )
        ).rows[0];
        if (latest?.retry_available_at && +latest.retry_available_at > +time)
          throw new HttpError(409, "DAILY_UNAVAILABLE", {
            reason: "COOLDOWN",
            retryAvailableAt: latest.retry_available_at.toISOString(),
          });
        const scenario = await loadScenario(tx, row.id),
          m = scenario.manifest,
          matchId = randomUUID();
        const config: MatchConfig = {
          matchId,
          mode: "DAILY_CHALLENGE",
          humanSide: m.humanSide,
          difficulty: m.difficulty,
          versions: {
            rules: "rules_v1",
            content: m.contentVersion,
            locations: "locations_v1",
            bot: "bot_v1",
          },
          decks: m.decks,
        };
        const expiresAt = request.practice
          ? new Date(+time + 86400000)
          : new Date(+deadline + 1);
        const result = await insertInitialization(
          tx,
          principal.id,
          config,
          Buffer.from(m.seedHex, "hex"),
          {
            expiresAt,
            rematch: null,
            scenarioId: scenario.id,
            scenarioManifestSha256: scenario.sha256,
          },
          time,
        );
        await tx.query(
          "INSERT INTO match_reward_bindings(match_id,event_id,eligible_account_id,kind,day_index,bound_day_ends_at,completion_deadline) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            matchId,
            row.event_id,
            !request.practice && principal.kind === "ACCOUNT"
              ? principal.id
              : null,
            request.practice ? "PRACTICE" : "DAILY",
            row.day_index,
            end,
            deadline,
          ],
        );
        await tx.query(
          "INSERT INTO daily_attempts(id,match_id,principal_id,scenario_id,status,started_at) VALUES($1,$1,$2,$3,'ACTIVE',$4)",
          [matchId, principal.id, scenario.id, time],
        );
        const response = commandResponse(
          result.nextState,
          0,
          result.events,
          0,
          0,
          scheduler,
        );
        await insertMatchReceipt(tx, {
          principalId: principal.id,
          state: result.nextState,
          revision: 0,
          receipt: {
            commandId: request.commandId,
            requestHash: hash,
            response,
            expiresAt: principal.expiresAt ?? new Date(+time + 30 * 86400000),
          },
          now: time,
        });
        return response;
      });
    },
  };
}
