import { createChallengeMatch } from "@oathfront/game-engine/challenges";
import { loadScenario } from "../events/scenarios.js";
import { isDeepStrictEqual } from "node:util";
import {
  createMatchWithEvents,
  createRandomStreams,
  replayJournal,
  algorithmVersion,
} from "@oathfront/game-engine";
import type { MatchConfig, JournalEntry } from "@oathfront/game-engine";
import type { PoolClient } from "@oathfront/db";
import { safeInteger } from "@oathfront/db";
import type { MatchRecord } from "./repository.js";
import { decodeCheckpoint, PersistenceError } from "./checkpoint.js";
import { hashJson } from "./initialization.js";
/** Explicit diagnostics audit; ordinary requests validate only checkpoint plus bounded append. */
export async function auditReplay(tx: PoolClient, record: MatchRecord) {
  const matchId = record.id;
  const row = (
    await tx.query("SELECT * FROM match_initializations WHERE match_id=$1", [
      matchId,
    ])
  ).rows[0];
  if (!row) throw new PersistenceError("MATCH_DETAILS_EXPIRED");
  const initial = row.initial_state;
  const value =
    initial && typeof initial === "object" && "state" in initial
      ? initial.state
      : undefined;
  // Recreate the trusted v1 initialization from immutable seed/decks, then compare exactly.
  const state = decodeCheckpoint(initial, hashJson(value));
  const config: MatchConfig = {
    matchId: state.matchId,
    mode: state.mode,
    humanSide: state.humanSide,
    difficulty: state.difficulty,
    versions: state.versions,
    decks: state.deckSnapshots,
  };
  const scenario =
    state.mode === "DAILY_CHALLENGE" && state.challenge
      ? await loadScenario(tx, state.challenge.scenarioId)
      : null;
  if (
    scenario &&
    (state.challenge?.manifestSha256 !== scenario.sha256 ||
      Buffer.from(row.private_seed).toString("hex") !==
        scenario.manifest.seedHex)
  )
    throw new PersistenceError("INVALID_INITIALIZATION");
  const regenerated = scenario
    ? createChallengeMatch(config.matchId, scenario)
    : createMatchWithEvents(config, createRandomStreams(row.private_seed));
  if (
    row.rng_algorithm_version !== algorithmVersion ||
    !isDeepStrictEqual(regenerated.nextState, state) ||
    !isDeepStrictEqual(row.deck_snapshots, state.deckSnapshots) ||
    !isDeepStrictEqual(row.heroes, {
      GOOD: state.players.GOOD.heroId,
      EVIL: state.players.EVIL.heroId,
    })
  )
    throw new PersistenceError("INVALID_INITIALIZATION");
  const rows = (
    await tx.query(
      "SELECT step_seq,origin,action,next_bot_random_state,pre_state_hash,post_state_hash,first_event_seq,last_event_seq FROM match_action_journal WHERE match_id=$1 ORDER BY step_seq",
      [matchId],
    )
  ).rows;
  const entries: JournalEntry[] = rows.map((r) => ({
    stepSeq: safeInteger(r.step_seq),
    origin: r.origin,
    action: r.action,
    nextBotRandomState: r.next_bot_random_state,
    preStateHash: r.pre_state_hash,
    postStateHash: r.post_state_hash,
    firstEventSeq:
      r.first_event_seq === null ? null : safeInteger(r.first_event_seq),
    lastEventSeq:
      r.last_event_seq === null ? null : safeInteger(r.last_event_seq),
  }));
  const replay = replayJournal(state, entries);
  if (
    !replay.ok ||
    !isDeepStrictEqual(replay.finalState, record.state) ||
    (replay.ok && replay.botIntentsThisTurn !== record.botIntentsThisTurn)
  )
    throw new PersistenceError("REPLAY_MISMATCH");
  const storedEvents = (
    await tx.query(
      'SELECT event_id AS "eventId",seq AS sequence,root_id AS "rootId",kind,visibility,owner_side AS "ownerSide",payload FROM match_events WHERE match_id=$1 ORDER BY seq',
      [matchId],
    )
  ).rows.map((r) => ({ ...r, sequence: safeInteger(r.sequence) }));
  if (
    !isDeepStrictEqual([...regenerated.events, ...replay.events], storedEvents)
  )
    throw new PersistenceError("REPLAY_EVENTS_MISMATCH");
  return replay;
}
