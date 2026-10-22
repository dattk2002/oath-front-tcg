import type { Catalog } from "@oathfront/contracts";
import { coreCatalog } from "./catalog.js";
import { heroesCatalog } from "./heroes-v1.js";

export const currentCatalog = heroesCatalog;
export const supportedCatalogs: readonly Catalog[] = [
  coreCatalog,
  heroesCatalog,
];
export function catalogForVersion(version: string): Catalog | undefined {
  return supportedCatalogs.find((catalog) => catalog.version === version);
}
