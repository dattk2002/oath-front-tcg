import { randomUUID } from "node:crypto";
import { coreCatalog } from "@oathfront/game-content";
import { tutorialManifest } from "@oathfront/game-content/tutorial";
import type { MatchConfig, PlayerId } from "@oathfront/game-engine";
import { hashJson } from "./initialization.js";
export { tutorialManifest };
export const tutorialManifestHash = () => hashJson(tutorialManifest);
/** Only this server registry selects preset decks and scenarios; public creation has no overrides. */
export function createTutorialConfig(side: PlayerId): MatchConfig {
  const deck = (id: string) => {
    const p = coreCatalog.presets.find((p) => p.presetId === id)!;
    return {
      name: p.name,
      heroId: p.heroId,
      entries: structuredClone(p.entries),
      contentVersion: p.contentVersion,
    };
  };
  return {
    matchId: randomUUID(),
    mode: "TUTORIAL",
    humanSide: side,
    difficulty: "EASY",
    versions: {
      rules: coreCatalog.rulesVersion,
      content: coreCatalog.version,
      locations: coreCatalog.locationVersion,
      bot: "bot_v1",
    },
    decks: { GOOD: deck("D_G_BV"), EVIL: deck("D_E_FX") },
  };
}

/** Registry versions are immutable and retained for every still-supported pinned match. */
export function verifyTutorialBinding(
  scenarioId: unknown,
  manifestHash: unknown,
  manifestVersion: unknown,
  side: PlayerId,
) {
  if (
    manifestVersion !== "tutorial_v1" ||
    manifestHash !== tutorialManifestHash() ||
    scenarioId !== (side === "GOOD" ? "tutorial_v1" : "tutorial_evil_v1")
  )
    throw new RangeError("TUTORIAL_MANIFEST_MISMATCH");
}
