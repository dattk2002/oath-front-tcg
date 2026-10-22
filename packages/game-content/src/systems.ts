import type { CardId, HeroId, SystemId, VfxFamily } from "@oathfront/contracts";

export const systemDefinitions = [
  {
    id: "GROVE",
    name: "Grove",
    theme: "Growth, healing and replacement units",
    symbol: "leaf",
    family: "growth",
  },
  {
    id: "TERRA",
    name: "Terra",
    theme: "Armor, Shield and lasting defense",
    symbol: "mountain",
    family: "shield",
  },
  {
    id: "TIDE",
    name: "Tide",
    theme: "Repositioning, protection and recovery",
    symbol: "wave",
    family: "prism",
  },
  {
    id: "TEMPEST",
    name: "Tempest",
    theme: "Movement, tempo and attack pressure",
    symbol: "bolt",
    family: "prism",
  },
  {
    id: "SOLAR",
    name: "Solar",
    theme: "Radiance, heat and direct damage",
    symbol: "sun",
    family: "ember",
  },
  {
    id: "FORGE",
    name: "Forge",
    theme: "Constructs, repairs and resilience",
    symbol: "anvil",
    family: "kinetic",
  },
  {
    id: "ARCANE",
    name: "Arcane",
    theme: "Draw, timing and spell control",
    symbol: "orbit",
    family: "veil",
  },
  {
    id: "UMBRAL",
    name: "Umbral",
    theme: "Poison, weakening and attrition",
    symbol: "eclipse",
    family: "ink",
  },
] as const satisfies readonly {
  id: SystemId;
  name: string;
  theme: string;
  symbol: string;
  family: VfxFamily;
}[];

export const systemCards: Record<SystemId, readonly CardId[]> = {
  GROVE: ["V01", "V02", "V04", "V05", "V06", "V08"],
  TERRA: ["B01", "B02", "B05", "S04", "B07", "B06"],
  TIDE: ["V03", "P02", "S02", "V07", "S07", "S08"],
  TEMPEST: ["P01", "S01", "P05", "S05", "P06", "F07"],
  SOLAR: ["F01", "F02", "F03", "F05", "F06", "F08"],
  FORGE: ["B03", "B04", "P03", "F04", "X03", "B08"],
  ARCANE: ["P04", "X04", "X05", "P07", "P08", "S06"],
  UMBRAL: ["X01", "X02", "S03", "X06", "X07", "X08"],
};
export const heroSystems: Record<HeroId, [SystemId, SystemId]> = {
  H_G_BV: ["GROVE", "TERRA"],
  H_G_BP: ["FORGE", "SOLAR"],
  H_G_VP: ["TEMPEST", "SOLAR"],
  H_E_FX: ["FORGE", "TERRA"],
  H_E_FS: ["TEMPEST", "UMBRAL"],
  H_E_XS: ["ARCANE", "UMBRAL"],
  H_G_SOL: ["SOLAR", "TERRA"],
  H_G_CAI: ["TERRA", "ARCANE"],
  H_G_ZEP: ["TEMPEST", "TIDE"],
  H_G_MER: ["ARCANE", "SOLAR"],
  H_G_MOS: ["FORGE", "GROVE"],
  H_G_HAL: ["TEMPEST", "GROVE"],
  H_G_ROW: ["GROVE", "TIDE"],
  H_E_ROO: ["FORGE", "TEMPEST"],
  H_E_NYX: ["UMBRAL", "GROVE"],
  H_E_BRI: ["SOLAR", "UMBRAL"],
  H_E_SAB: ["TERRA", "UMBRAL"],
  H_E_VAN: ["TIDE", "UMBRAL"],
  H_E_GRA: ["FORGE", "UMBRAL"],
  H_E_SCO: ["SOLAR", "TIDE"],
};
