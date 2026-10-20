import { coreCatalog } from "../../packages/game-content/src/index.js";
import type { MatchConfig } from "../../packages/game-engine/src/model.js";

export const seed = Uint8Array.from({ length: 32 }, (_, i) => i);
export function matchConfig(): MatchConfig {
  const good = coreCatalog.presets.find((p) => p.presetId === "D_G_BV")!;
  const evil = coreCatalog.presets.find((p) => p.presetId === "D_E_FX")!;
  return {
    matchId: "00000000-0000-4000-8000-000000000001",
    mode: "SKIRMISH",
    humanSide: "GOOD",
    difficulty: "NORMAL",
    versions: {
      rules: "rules_v1",
      content: "core_v1",
      locations: "locations_v1",
      bot: "bot_v1",
    },
    decks: {
      GOOD: {
        name: good.name,
        heroId: good.heroId,
        contentVersion: good.contentVersion,
        entries: structuredClone(good.entries),
      },
      EVIL: {
        name: evil.name,
        heroId: evil.heroId,
        contentVersion: evil.contentVersion,
        entries: structuredClone(evil.entries),
      },
    },
  };
}
