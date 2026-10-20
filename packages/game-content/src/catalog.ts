import type { Catalog } from "@oathfront/contracts";
import { cards } from "./core/cards.js";
import { heroes } from "./core/heroes.js";
import { powers } from "./core/powers.js";
import { locations } from "./core/locations.js";
import { tokens } from "./core/tokens.js";
import { decks } from "./core/decks.js";
export const coreCatalog: Catalog = {
  version: "core_v1",
  rulesVersion: "rules_v1",
  locationVersion: "locations_v1",
  cards,
  heroes,
  powers,
  locations,
  tokens,
  presets: decks,
};
