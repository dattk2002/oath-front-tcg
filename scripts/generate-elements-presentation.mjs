// Public presentation only. Never import the complete gameplay catalog into browser code.
import { writeFileSync } from "node:fs";
import { currentCatalog } from "../packages/game-content/src/index.ts";
import { systemDefinitions } from "../packages/game-content/src/systems.ts";
const artKeys = [
  "briar",
  "aster",
  "lumen",
  "cinder",
  "vesper",
  "morrow",
  "solenne",
  "cairn",
  "zephyr",
  "meridian",
  "mossweld",
  "halcyon",
  "rowan",
  "rook",
  "nyxara",
  "brimstone",
  "sable",
  "vanta",
  "gravemarch",
  "scoria",
];
const data = {
  version: currentCatalog.version,
  systems: systemDefinitions.map(({ id, name, theme, symbol }) => ({
    id,
    name,
    theme,
    symbol,
  })),
  heroes: currentCatalog.heroes.map((hero, i) => ({
    id: hero.id,
    art: artKeys[i],
    faction: hero.faction,
    classes: hero.classes,
    powerIds: hero.powerIds,
    maxHp: hero.maxHp,
  })),
  english: Object.fromEntries(
    [
      ...currentCatalog.cards.filter((c) => c.rarity === "E"),
      ...currentCatalog.powers.filter((p) => p.id.startsWith("P_")),
    ].map((d) => [d.id, { name: d.nameVi, text: d.exactTextVi }]),
  ),
};
writeFileSync(
  new URL(
    "../apps/web/src/content/elements-presentation.json",
    import.meta.url,
  ),
  JSON.stringify(data, null, 2) + "\n",
);
