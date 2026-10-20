import type { CardDefinition, TokenDefinition } from "@oathfront/contracts";
import type {
  GameEvent,
  LaneId,
  MatchState,
  PlayerId,
  UnitState,
} from "./model.js";
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
  const printed = { ...definition.printed, maxHp: definition.printed.hp },
    keywords: readonly string[] = definition.keywords;
  const unit: UnitState = {
    instanceId: instanceId ?? allocateInstanceId(state),
    definitionId: definition.id,
    owner,
    laneId,
    isToken: definition.type === "TOKEN",
    creationSeq: ++state.creationSeq,
    printed,
    current: { ...printed },
    statuses: {
      shield: keywords.includes("SHIELD"),
      armor: keywords.includes("ARMOR") ? 1 : 0,
      poisoned: false,
      stunned: false,
      exhausted: false,
      pierce: keywords.includes("PIERCE"),
    },
    modifiers: [],
    lastRegularAttackTurn: null,
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
