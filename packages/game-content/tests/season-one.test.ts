import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { validateDeck } from "@oathfront/contracts";
import { elementsCatalog } from "../src/elements-v1.js";
import { canonicalJson } from "../../game-engine/src/hash.js";
import { seasonOne, seasonScenarios } from "../src/events/season-one.js";
it("publishes twelve consecutive weeks and eighty-four distinct legal, immutable borrowed scenarios", async () => {
  expect(seasonOne).toHaveLength(12);
  expect(seasonScenarios).toHaveLength(84);
  expect(seasonOne[0]!.startsAt).toBe("2026-10-26T00:00:00.000Z");
  expect(seasonOne[11]!.endsAt).toBe("2027-01-18T00:00:00.000Z");
  expect(
    new Set(seasonScenarios.map((s: { sha256: string }) => s.sha256)).size,
  ).toBe(84);
  for (let i = 0; i < 12; i++) {
    const week = seasonOne[i]!;
    expect(week.featuredCardId).toBe(`E${String(i + 1).padStart(2, "0")}`);
    if (i) expect(week.startsAt).toBe(seasonOne[i - 1]!.endsAt);
    const scenarios = seasonScenarios.filter(
      (s: { eventId: string }) => s.eventId === week.id,
    );
    expect(scenarios).toHaveLength(7);
    expect(
      new Set(
        scenarios.map(
          (s: { manifest: { humanSide: string } }) => s.manifest.humanSide,
        ),
      ).size,
    ).toBe(2);
    for (const scenario of scenarios) {
      expect(
        createHash("sha256")
          .update(canonicalJson(scenario.manifest))
          .digest("hex"),
      ).toBe(scenario.sha256);
      expect(scenario.manifest.board.length).toBeGreaterThan(0);
      for (const side of ["GOOD", "EVIL"] as const)
        expect(
          validateDeck(scenario.manifest.decks[side], elementsCatalog).playable,
        ).toBe(true);
    }
  }
});
