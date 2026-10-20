import type { CardDefinition, TokenDefinition } from "@oathfront/contracts";
import type {
  GameEvent,
  LaneId,
  MatchState,
  PlayerId,
  UnitState,
} from "./model.js";
import { newUnit } from "./rule-math.js";
import { allocateInstanceId } from "./identity.js";
import { emitEvent } from "./events.js";
import { slot } from "./targets.js";
import { unitView } from "./modifiers.js";
/** Draft-only; caller validates vacancy and only action code invokes Location/ON_PLAY. */
export function createUnitOnDraft(
  state: MatchState,
  events: GameEvent[],
  definition: CardDefinition | TokenDefinition,
  owner: PlayerId,
  laneId: LaneId,
  cause: "PLAY" | "SUMMON",
  instanceId?: string,
): UnitState {
  if (!definition.printed) throw new TypeError("Unit definition required");
  if (state.board[laneId - 1]![slot(owner)])
    throw new RangeError("Occupied lane");
  const unit: UnitState = {
    ...newUnit(
      definition,
      owner,
      laneId,
      instanceId ?? allocateInstanceId(state),
    ),
    laneId,
    creationSeq: ++state.creationSeq,
  };
  state.board[laneId - 1]![slot(owner)] = unit;
  emitEvent(state, events, {
    kind: "UnitCreated",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { unit: unitView(unit), cause },
  });
  return unit;
}
