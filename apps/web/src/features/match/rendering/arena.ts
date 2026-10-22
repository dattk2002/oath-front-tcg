import type { PlayerView } from "@oathfront/contracts";
import manifest from "../../../../public/assets/world-v1/manifest.json" with { type: "json" };
const names = [
  "Moonroot Conservatory",
  "Cinder Foundry",
  "Glasswater Sanctum",
  "Astral Causeway",
];
export const arenas = manifest.assets.map((asset, index) => ({
  ...asset,
  name: names[index]!,
}));
const locationArena: Record<string, number> = {
  ancient_forest: 0,
  quiet_meadow: 0,
  volcano: 1,
  desert: 1,
  frozen_lake: 2,
  healing_spring: 2,
  storm_peak: 3,
  ruined_arena: 3,
};
/** Decoration consumes public projection only; hidden location assignments are never accepted. */
export function arenaForView(view: Pick<PlayerView, "board" | "matchId">) {
  const revealed = [...view.board]
    .sort((a, b) => a.laneId - b.laneId)
    .find((lane) => lane.location.state === "REVEALED");
  if (revealed?.location.state === "REVEALED") {
    const index = locationArena[revealed.location.definitionId];
    if (index !== undefined) return arenas[index]!;
  }
  const hash = Array.from(view.matchId).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  return arenas[hash % arenas.length]!;
}
