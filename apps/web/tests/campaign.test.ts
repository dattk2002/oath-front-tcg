import { describe, expect, it } from "vitest";
import {
  gameEntryDestination,
  publicHero,
} from "../src/features/campaign/model";
import { currentCatalog } from "../../../packages/game-content/src/index";

describe("campaign game entry", () => {
  it("resumes an active match even when a different hero profile is selected", () => {
    expect(gameEntryDestination("active/match", "H_E_FS")).toBe(
      "/matches/active%2Fmatch",
    );
  });
  it("uses the existing selector for a new run and selected hero's deck route", () => {
    expect(gameEntryDestination(null)).toBe("/heroes");
    expect(gameEntryDestination(null, "H_G_BV")).toBe("/heroes/H_G_BV/decks");
  });
  it("rejects an unknown hero instead of generating an invalid deck destination", () => {
    expect(publicHero("invented")).toBeUndefined();
    expect(() => gameEntryDestination(null, "invented")).toThrow(
      "Unknown hero",
    );
  });
  it("publishes each actual hero's exact classes, HP and four powers", () => {
    for (const hero of currentCatalog.heroes) {
      expect(publicHero(hero.id)).toMatchObject({
        id: hero.id,
        faction: hero.faction,
        maxHp: hero.maxHp,
        classes: hero.classes,
        powerIds: hero.powerIds,
      });
    }
  });
});
