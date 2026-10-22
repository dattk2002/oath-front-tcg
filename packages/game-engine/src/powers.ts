import { matchCatalog } from "./catalog.js";
import { tutorialPower } from "./tutorial.js";
import type { ReservePower } from "@oathfront/contracts";
import type { GameEvent, MatchState, PlayerId } from "./model.js";
import { nextInt } from "./rng.js";
import { allocateInstanceId } from "./identity.js";
import { emitEvent } from "./events.js";

/** A grant consumes only this hero's power stream and excludes every previously received ID. */
export function grantPowerOnDraft(
  state: MatchState,
  events: GameEvent[],
  side: PlayerId,
  reason: "INITIAL" | "BLOCK",
): ReservePower {
  const player = state.players[side];
  const hero = matchCatalog(state).heroes.find((h) => h.id === player.heroId);
  const available =
    hero?.powerIds.filter((id) => !player.receivedPowerIds.includes(id)) ?? [];
  if (!available.length) throw new RangeError("No unreceived hero power");
  const scope = side === "EVIL" ? "power:evil" : "power:good";
  const draw = nextInt(state.random.states[scope], available.length);
  state.random.states[scope] = draw.state;
  const power: ReservePower = {
    instanceId: allocateInstanceId(state),
    definitionId: tutorialPower(state, side) ?? available[draw.value]!,
    normalCost: 1,
  };
  player.receivedPowerIds.push(power.definitionId);
  player.reserve.push(power);
  emitEvent(state, events, {
    kind: "PowerGranted",
    visibility: "OWNER",
    ownerSide: side,
    payload: { side, power: { ...power }, reason },
  });
  emitEvent(state, events, {
    kind: "ReserveCountChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { side, reserveCount: player.reserve.length },
  });
  return power;
}
