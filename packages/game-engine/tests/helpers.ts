import type { CardId, Target } from "@oathfront/contracts";
import type {
  MatchState,
  PlayerId,
  UnitState,
  LaneId,
  TransitionResult,
  ActionError,
} from "../src/model.js";
import { createMatch } from "../src/setup.js";
import { createRandomStreams } from "../src/rng.js";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
import { coreCatalog } from "@oathfront/game-content";

export function ready(): MatchState {
  const state = createMatch(matchConfig(), createRandomStreams(seed));
  state.phase = "EVIL_DEPLOY";
  state.turn = 5;
  state.activeSide = "EVIL";
  for (const side of ["EVIL", "GOOD"] as const) {
    state.players[side].energy = { current: 10, max: 10 };
    state.players[side].mulliganCommitted = true;
  }
  for (const lane of state.board) lane.location = { state: "NORMAL" };
  return state;
}
export function unit(
  state: MatchState,
  id: CardId,
  owner: PlayerId,
  laneId: LaneId,
): UnitState {
  const def = coreCatalog.cards.find((c) => c.id === id)!;
  if (!def.printed) throw new Error("not unit");
  const value: UnitState = {
    instanceId: (++state.instanceSeq).toString(16).padStart(32, "0"),
    definitionId: id,
    owner,
    laneId,
    isToken: false,
    creationSeq: ++state.creationSeq,
    printed: { ...def.printed, maxHp: def.printed.hp },
    current: { ...def.printed, maxHp: def.printed.hp },
    statuses: {
      shield: def.keywords.includes("SHIELD"),
      armor: def.keywords.includes("ARMOR") ? 1 : 0,
      poisoned: false,
      stunned: false,
      exhausted: false,
      pierce: def.keywords.includes("PIERCE"),
    },
    modifiers: [],
    lastRegularAttackTurn: null,
  };
  state.board[laneId - 1]![owner === "GOOD" ? "good" : "evil"] = value;
  return value;
}
export function card(state: MatchState, id: CardId, owner: PlayerId): string {
  const instanceId = (++state.instanceSeq).toString(16).padStart(32, "0");
  state.players[owner].hand.push({ instanceId, definitionId: id });
  return instanceId;
}
export function next(result: TransitionResult | ActionError): MatchState {
  expectTransition(result);
  return result.nextState;
}
function expectTransition(
  value: TransitionResult | ActionError,
): asserts value is TransitionResult {
  if (value.kind !== "transition") throw new Error(value.code);
}
export const none: Target = { kind: "NONE" };
