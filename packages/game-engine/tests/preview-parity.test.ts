import { it, expect, describe } from "vitest";
import { coreCatalog } from "@oathfront/game-content";
import { previewPublicAction } from "../src/preview.js";
import { projectPlayerView } from "../src/projection.js";
import { applyAction, getLegalActions } from "../src/actions.js";
import { ready, card, unit } from "./helpers.js";
function visibleBoard(board: ReturnType<typeof projectPlayerView>["board"]) {
  return board.map((l) => ({
    laneId: l.laneId,
    good: l.good
      ? {
          definitionId: l.good.definitionId,
          current: l.good.current,
          statuses: l.good.statuses,
        }
      : null,
    evil: l.evil
      ? {
          definitionId: l.evil.definitionId,
          current: l.evil.current,
          statuses: l.evil.statuses,
        }
      : null,
  }));
}
describe("shared public primitive parity for all ordinary cards/powers", () => {
  for (const def of [...coreCatalog.cards, ...coreCatalog.powers])
    it(def.id, () => {
      const s = ready(),
        side = def.faction;
      s.phase =
        side === "GOOD"
          ? "GOOD_PLAY"
          : def.type === "UNIT"
            ? "EVIL_DEPLOY"
            : "EVIL_TRICKS";
      s.activeSide = side;
      for (const owner of ["GOOD", "EVIL"] as const) {
        unit(s, owner === "GOOD" ? "GC01" : "EC01", owner, 2);
        s.players[owner].hp = 10;
      }
      const self = s.board[1]![side === "GOOD" ? "good" : "evil"]!;
      self.current.hp = 1;
      let instanceId: string;
      if (def.type === "SUPERPOWER") {
        instanceId = "a".repeat(32);
        s.players[side].reserve = [
          { definitionId: def.id, instanceId, normalCost: 1 },
        ];
      } else instanceId = card(s, def.id, side);
      const action = getLegalActions(s, side).find((a) =>
        "cardInstanceId" in a
          ? a.cardInstanceId === instanceId
          : "powerInstanceId" in a
            ? a.powerInstanceId === instanceId
            : false,
      )!;
      expect(action).toBeDefined();
      const v = projectPlayerView(s, side),
        p = previewPublicAction(v, action);
      const r = applyAction(s, { actor: side, action });
      expect(r.kind).toBe("transition");
      if (r.kind !== "transition") throw Error(r.code);
      expect(p.legal).toBe(true);
      expect(visibleBoard(p.board)).toEqual(
        visibleBoard(projectPlayerView(r.nextState, side).board),
      );
      for (const owner of ["GOOD", "EVIL"] as const)
        expect(p.players[owner]).toEqual(
          projectPlayerView(r.nextState, side).players[owner],
        );
    });
});
