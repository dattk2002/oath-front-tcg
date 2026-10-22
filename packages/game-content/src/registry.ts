import type { Catalog } from "@oathfront/contracts";
import { coreCatalog } from "./catalog.js";
import { heroesCatalog } from "./heroes-v1.js";

import { elementsCatalog } from "./elements-v1.js";

export const currentCatalog = elementsCatalog;
export const supportedCatalogs: readonly Catalog[] = [
  coreCatalog,
  heroesCatalog,
  elementsCatalog,
];
export function catalogForVersion(version: string): Catalog | undefined {
  return supportedCatalogs.find((catalog) => catalog.version === version);
}
