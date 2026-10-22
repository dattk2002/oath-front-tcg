import type { Catalog } from "@oathfront/contracts";
import { catalogForVersion } from "@oathfront/game-content";

/** Match-bound hero and power rules. Cards and locations are unchanged in heroes_v1. */
export function matchCatalog(state: {
  versions: { content: string };
}): Catalog {
  const catalog = catalogForVersion(state.versions.content);
  if (!catalog) throw new RangeError("Unsupported match version");
  return catalog;
}
