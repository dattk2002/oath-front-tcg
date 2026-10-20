import { coreCatalog } from "@oathfront/game-content";
import type { MatchState } from "./model.js";
import type { RootResolution } from "./effects/resolve.js";
import { drawOnDraft, drainTriggersOnDraft } from "./effects/resolve.js";
import { enqueueHooksOnDraft } from "./effects/triggers.js";
import { orderedUnits } from "./targets.js";
import { scheduledDamageOnDraft } from "./combat.js";
import { expireModifiersOnDraft, emitStats, safeInteger } from "./modifiers.js";
import { getActiveLocation, revealLocationsOnDraft } from "./locations.js";
import { changePhaseOnDraft, refillEnergyOnDraft } from "./phases.js";
import { emitEvent } from "./events.js";
import { finishMatchOnDraft } from "./terminal.js";
export function endTurnOnDraft(state: MatchState, root: RootResolution): void {
  if (!state.endTurn) {
    scheduledDamageOnDraft(
      state,
      root,
      orderedUnits(state)
        .filter((u) => u.statuses.poisoned)
        .map((u) => ({
          source: null,
          target: { kind: "UNIT", instanceId: u.instanceId },
          rawDamage: 1,
          damageType: "POISON",
        })),
    );
    const queueRoot: RootResolution = {
      events: [],
      primitiveCount: 0,
      generation: 0,
      queue: [],
    };
    enqueueHooksOnDraft(state, queueRoot, "ON_TURN_END", orderedUnits(state));
    state.endTurn = {
      stage: "HOOKS",
      jobs: queueRoot.queue.map((j) => ({
        source: j.source,
        abilityId: j.ability.id,
      })),
      locationIndex: 0,
    };
    return;
  }
  const cursor = state.endTurn;
  if (cursor.stage === "HOOKS") {
    const job = cursor.jobs.shift();
    if (job) {
      const ability = coreCatalog.cards
        .find((c) => c.id === job.source.definitionId)
        ?.abilities.find((a) => a.id === job.abilityId);
      if (!ability) throw new RangeError("Unknown end-turn hook");
      root.queue.push({
        source: job.source,
        ability,
        generation: 1,
        damaged: false,
      });
      drainTriggersOnDraft(state, root);
    }
    if (!cursor.jobs.length) cursor.stage = "LOCATIONS";
    return;
  }
  if (cursor.stage === "LOCATIONS") {
    const laneId = [1, 3, 5][cursor.locationIndex++]!;
    const rule = getActiveLocation(state, laneId)?.rule;
    if (rule?.kind === "END_TURN_HEAL")
      for (const u of [
        state.board[laneId - 1]!.evil,
        state.board[laneId - 1]!.good,
      ])
        if (u && u.current.hp > 0) {
          const before = { ...u.current };
          u.current.hp = Math.min(
            u.current.maxHp,
            safeInteger(u.current.hp + rule.amount),
          );
          emitStats(state, root.events, u, before);
        }
    if (cursor.locationIndex === 3) cursor.stage = "EXPIRY";
    return;
  }
  expireModifiersOnDraft(state, root.events);
  delete state.endTurn;
  if (state.players.GOOD.hp <= 0 || state.players.EVIL.hp <= 0) return;
  if (state.turn === 20)
    finishMatchOnDraft(state, root.events, {
      result: "DRAW",
      winner: null,
      reason: "TURN_LIMIT",
    });
  else changePhaseOnDraft(state, root.events, "TURN_START");
}
export function turnStartOnDraft(
  state: MatchState,
  root: RootResolution,
): void {
  state.turn = safeInteger(state.turn + 1);
  state.turnCounters = {};
  emitEvent(state, root.events, {
    kind: "TurnStarted",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { turn: state.turn },
  });
  revealLocationsOnDraft(state, state.turn, root.events);
  refillEnergyOnDraft(state, root.events);
  if (state.turn === 1) {
    changePhaseOnDraft(state, root.events, "EVIL_DEPLOY");
    return;
  }
  const fatigue = [];
  for (const side of ["EVIL", "GOOD"] as const) {
    const p = state.players[side];
    if (p.deck.length) drawOnDraft(state, side, 1, root);
    else {
      p.fatigueCounter = safeInteger(p.fatigueCounter + 1);
      fatigue.push({
        source: null,
        target: { kind: "HERO" as const, side },
        rawDamage: p.fatigueCounter,
        damageType: "FATIGUE" as const,
      });
    }
  }
  if (fatigue.length) scheduledDamageOnDraft(state, root, fatigue);
  if (state.players.GOOD.hp > 0 && state.players.EVIL.hp > 0)
    changePhaseOnDraft(state, root.events, "EVIL_DEPLOY");
}
