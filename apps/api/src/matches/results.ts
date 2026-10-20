import type { Side } from "@oathfront/contracts";
import { validateGameEvent } from "@oathfront/game-engine";
import type { GameEvent, MatchState } from "@oathfront/game-engine";
import type { PoolClient } from "@oathfront/db";
import { safeInteger } from "@oathfront/db";
import { PersistenceError } from "./checkpoint.js";
/** Operational statistics only; never part of deterministic engine hashes. */
export function resultStatistics(
  initial: MatchState,
  final: MatchState,
  events: readonly GameEvent[],
) {
  const owners = new Map<string, Side>();
  for (const lane of initial.board)
    for (const u of [lane.good, lane.evil])
      if (u) owners.set(u.instanceId, u.owner);
  const cardPlayedCounts: Record<string, number> = {},
    revealObservations: { laneId: number; definitionId: string }[] = [];
  let damageDealt = 0;
  for (const e of events) {
    if (e.kind === "UnitCreated")
      owners.set(e.payload.unit.instanceId, e.payload.unit.owner);
    if (e.kind === "CardPlayed" && e.payload.side === final.humanSide)
      cardPlayedCounts[e.payload.definitionId] =
        (cardPlayedCounts[e.payload.definitionId] ?? 0) + 1;
    if (e.kind === "LocationRevealed")
      revealObservations.push({ ...e.payload });
    if (e.kind === "DamageBatchResolved")
      for (const p of e.payload.packets) {
        const sourceSide =
          p.source?.kind === "HERO"
            ? p.source.side
            : p.source?.kind === "UNIT"
              ? owners.get(p.source.instanceId)
              : undefined;
        if (
          p.target.kind === "HERO" &&
          p.target.side !== final.humanSide &&
          sourceSide === final.humanSide &&
          ["COMBAT", "EFFECT"].includes(p.damageType)
        )
          damageDealt += p.finalDamage;
      }
  }
  if (!Number.isSafeInteger(damageDealt))
    throw new PersistenceError("INVALID_RESULT_STATISTIC");
  return {
    damageDealt,
    summary: {
      cardPlayedCounts,
      energyUnused: {
        GOOD: final.players.GOOD.energy.current,
        EVIL: final.players.EVIL.energy.current,
      },
      revealObservations,
      fatigueCounts: {
        GOOD: final.players.GOOD.fatigueCounter,
        EVIL: final.players.EVIL.fatigueCounter,
      },
      blocks: {
        GOOD: final.players.GOOD.block.used,
        EVIL: final.players.EVIL.block.used,
      },
      selectedLocationIds: final.board.flatMap((l) =>
        l.location.state === "NORMAL" ? [] : [l.location.definitionId],
      ),
    },
  };
}
export async function persistResult(
  tx: PoolClient,
  input: {
    matchId: string;
    principalId: string;
    before: MatchState;
    state: MatchState;
    duration: number;
    rematch: unknown;
    now: Date;
  },
) {
  const { matchId, principalId, state, duration, rematch, now } = input;
  const rows = (
    await tx.query(
      'SELECT event_id AS "eventId",seq AS sequence,root_id AS "rootId",kind,visibility,owner_side AS "ownerSide",payload FROM match_events WHERE match_id=$1 ORDER BY seq',
      [matchId],
    )
  ).rows;
  const events: GameEvent[] = rows.map((r) => {
    const e: unknown = { ...r, sequence: safeInteger(r.sequence) };
    if (!validateGameEvent(e))
      throw new PersistenceError("INVALID_EVENT");
    return e;
  });
  const stats = resultStatistics(input.before, state, events),
    bot = state.humanSide === "GOOD" ? "EVIL" : "GOOD";
  await tx.query(
    "INSERT INTO match_results(match_id,owner_id,human_hero_id,bot_hero_id,difficulty,outcome,reason,turns,active_duration_ms,damage_dealt,blocks_used,summary,ended_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
    [
      matchId,
      principalId,
      state.players[state.humanSide].heroId,
      state.players[bot].heroId,
      state.difficulty,
      state.outcome?.result ?? state.lifecycle,
      state.outcome?.reason ?? state.lifecycle,
      state.turn,
      duration,
      stats.damageDealt,
      state.players[state.humanSide].block.used,
      JSON.stringify({ ...stats.summary, rematch }),
      now,
      new Date(now.getTime() + 180 * 86400000),
    ],
  );
}
