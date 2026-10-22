import { expect, it } from "vitest";
import { elementsCatalog } from "@oathfront/game-content";
import {
  createMatch,
  createRandomStreams,
  projectPlayerView,
} from "@oathfront/game-engine";
import { chooseMulligan } from "../src/mulligan.js";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
it("mulligans new event units with the match catalog and keeps the cheap repairbot", () => {
  const config = matchConfig();
  config.versions.content = "elements_v1";
  for (const side of ["GOOD", "EVIL"] as const) {
    const p = elementsCatalog.presets.find(
      (p) => p.heroId === (side === "GOOD" ? "H_G_BP" : "H_E_FX"),
    )!;
    config.decks[side] = {
      name: p.name,
      heroId: p.heroId,
      entries: p.entries,
      contentVersion: p.contentVersion,
    };
  }
  const state = createMatch(config, createRandomStreams(seed));
  state.players.GOOD.hand = (["E05", "GC01", "F06", "F08"] as const).map(
    (definitionId, i) => ({
      definitionId,
      instanceId: String(i + 1).padStart(32, "0"),
    }),
  );
  const view = projectPlayerView(state, "GOOD");
  expect(chooseMulligan(view, view.legalActions)).toEqual({
    kind: "MULLIGAN",
    cardInstanceIds: ["4".padStart(32, "0")],
  });
});
