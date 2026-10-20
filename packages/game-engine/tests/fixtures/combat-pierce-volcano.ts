import { ready, unit } from "../helpers.js";

export function combatState() {
  const state = ready();
  state.phase = "COMBAT";
  state.activeSide = null;
  state.continuation = {
    laneId: 1,
    stage: "BEFORE_PAIR",
    pendingResponders: [],
  };
  return state;
}

export function pierceVolcano() {
  const state = combatState();
  const evil = unit(state, "EC02", "EVIL", 1);
  evil.current = { attack: 3, hp: 2, maxHp: 2 };
  evil.statuses.pierce = true;
  const good = unit(state, "GC02", "GOOD", 1);
  good.current = { attack: 2, hp: 4, maxHp: 4 };
  state.players.GOOD.block.charge = 6;
  state.board[0]!.location = {
    state: "ACTIVE",
    definitionId: "volcano",
    revealTurn: 1,
  };
  // Only the heal power remains unreceived; RNG still advances through the normal stream.
  state.players.GOOD.heroId = "H_G_BP";
  state.players.GOOD.receivedPowerIds = ["P_B1", "P_P2", "S_G_BP"];
  return state;
}
