import { describe, it, expect } from "vitest";
import { currentCatalog } from "../../../packages/game-content/src/index.js";
import {
  publicHeroes,
  publicHero,
  heroPortrait,
  heroEnvironment,
  gameEntryDestination,
} from "../src/features/campaign/model";
import {
  contentName,
  contentText,
  heroTitle,
} from "../src/content/english-content";
import {
  artById,
  resolveArt,
  battleAssetRequests,
} from "../src/features/match/rendering/asset-manifest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const runtime = (url: string) => resolve("apps/web/public", url.slice(1));
describe("playable twenty-hero presentation", () => {
  it("publishes every current hero with exact classes and four powers", () => {
    expect(publicHeroes).toHaveLength(20);
    for (const hero of currentCatalog.heroes) {
      const profile = publicHero(hero.id);
      expect(profile).toMatchObject({
        id: hero.id,
        faction: hero.faction,
        classes: hero.classes,
        powerIds: hero.powerIds,
        maxHp: hero.maxHp,
      });
      expect(contentName(hero.id)).not.toMatch(/Unknown|H_[GE]_/);
      expect(heroTitle(hero.id)).toBeTruthy();
      expect(gameEntryDestination(null, hero.id)).toBe(
        `/heroes/${hero.id}/decks`,
      );
      expect(existsSync(runtime(heroPortrait(profile!)))).toBe(true);
      expect(existsSync(runtime(heroEnvironment(profile!)))).toBe(true);
      for (const id of hero.powerIds)
        expect(contentText(id)).not.toMatch(/^$|Unknown|S_[GE]_/);
    }
  });
  it("resolves every hero portrait and signature to the new art pack", () => {
    for (const hero of currentCatalog.heroes) {
      const art = artById(hero.id);
      expect(art?.thumb).toContain("/heroes-v4/");
      for (const variant of ["thumb", "hud", "inspect", "bust"]) {
        const src = resolveArt(
          hero.portraitKey,
          contentName(hero.id),
          variant,
        ).src;
        expect(src).toContain("/heroes-v4/");
        expect(existsSync(runtime(src))).toBe(true);
      }
      const power = currentCatalog.powers.find(
        (p) => p.id === hero.signaturePowerId,
      )!;
      expect(
        existsSync(runtime(resolveArt(power.artKey, power.nameVi).src)),
      ).toBe(true);
    }
  });
  it("reuses the same public board atlases for both content versions", () => {
    expect(battleAssetRequests("heroes_v1", "high")).toEqual(
      battleAssetRequests("core_v1", "high"),
    );
    expect(() => battleAssetRequests("unknown", "high")).toThrow();
  });
});
