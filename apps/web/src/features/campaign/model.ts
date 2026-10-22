import type { HeroId } from "@oathfront/contracts/browser";

// Public-only metadata mirrors heroes_v1; parity is checked against the current catalog.
export const publicHeroes = [
  {
    id: "H_G_BV",
    art: "briar",
    faction: "GOOD",
    classes: ["BASTION", "VERDANT"],
    powerIds: ["P_B1", "P_V1", "P_V2", "S_G_BV"],
    maxHp: 20,
  },
  {
    id: "H_G_BP",
    art: "aster",
    faction: "GOOD",
    classes: ["BASTION", "PRISM"],
    powerIds: ["P_B1", "P_B2", "P_P2", "S_G_BP"],
    maxHp: 20,
  },
  {
    id: "H_G_VP",
    art: "lumen",
    faction: "GOOD",
    classes: ["VERDANT", "PRISM"],
    powerIds: ["P_V1", "P_P1", "P_P2", "S_G_VP"],
    maxHp: 20,
  },
  {
    id: "H_E_FX",
    art: "cinder",
    faction: "EVIL",
    classes: ["FURNACE", "HEX"],
    powerIds: ["P_F1", "P_F2", "P_X1", "S_E_FX"],
    maxHp: 20,
  },
  {
    id: "H_E_FS",
    art: "vesper",
    faction: "EVIL",
    classes: ["FURNACE", "VEIL"],
    powerIds: ["P_F2", "P_S1", "P_S2", "S_E_FS"],
    maxHp: 20,
  },
  {
    id: "H_E_XS",
    art: "morrow",
    faction: "EVIL",
    classes: ["HEX", "VEIL"],
    powerIds: ["P_X1", "P_X2", "P_S1", "S_E_XS"],
    maxHp: 20,
  },
  {
    id: "H_G_SOL",
    art: "solenne",
    faction: "GOOD",
    classes: ["BASTION", "PRISM"],
    powerIds: ["P_B1", "P_P1", "P_P2", "S_G_SOL"],
    maxHp: 20,
  },
  {
    id: "H_G_CAI",
    art: "cairn",
    faction: "GOOD",
    classes: ["BASTION", "VERDANT"],
    powerIds: ["P_B1", "P_B2", "P_V1", "S_G_CAI"],
    maxHp: 20,
  },
  {
    id: "H_G_ZEP",
    art: "zephyr",
    faction: "GOOD",
    classes: ["VERDANT", "PRISM"],
    powerIds: ["P_V1", "P_V2", "P_P1", "S_G_ZEP"],
    maxHp: 20,
  },
  {
    id: "H_G_MER",
    art: "meridian",
    faction: "GOOD",
    classes: ["BASTION", "PRISM"],
    powerIds: ["P_B2", "P_P1", "P_P2", "S_G_MER"],
    maxHp: 20,
  },
  {
    id: "H_G_MOS",
    art: "mossweld",
    faction: "GOOD",
    classes: ["BASTION", "VERDANT"],
    powerIds: ["P_B1", "P_B2", "P_V2", "S_G_MOS"],
    maxHp: 20,
  },
  {
    id: "H_G_HAL",
    art: "halcyon",
    faction: "GOOD",
    classes: ["VERDANT", "PRISM"],
    powerIds: ["P_V2", "P_P1", "P_P2", "S_G_HAL"],
    maxHp: 20,
  },
  {
    id: "H_G_ROW",
    art: "rowan",
    faction: "GOOD",
    classes: ["BASTION", "VERDANT"],
    powerIds: ["P_B2", "P_V1", "P_V2", "S_G_ROW"],
    maxHp: 20,
  },
  {
    id: "H_E_ROO",
    art: "rook",
    faction: "EVIL",
    classes: ["FURNACE", "VEIL"],
    powerIds: ["P_F1", "P_F2", "P_S1", "S_E_ROO"],
    maxHp: 20,
  },
  {
    id: "H_E_NYX",
    art: "nyxara",
    faction: "EVIL",
    classes: ["HEX", "VEIL"],
    powerIds: ["P_X1", "P_S1", "P_S2", "S_E_NYX"],
    maxHp: 20,
  },
  {
    id: "H_E_BRI",
    art: "brimstone",
    faction: "EVIL",
    classes: ["FURNACE", "HEX"],
    powerIds: ["P_F1", "P_F2", "P_X2", "S_E_BRI"],
    maxHp: 20,
  },
  {
    id: "H_E_SAB",
    art: "sable",
    faction: "EVIL",
    classes: ["HEX", "VEIL"],
    powerIds: ["P_X2", "P_S1", "P_S2", "S_E_SAB"],
    maxHp: 20,
  },
  {
    id: "H_E_VAN",
    art: "vanta",
    faction: "EVIL",
    classes: ["FURNACE", "VEIL"],
    powerIds: ["P_F1", "P_S1", "P_S2", "S_E_VAN"],
    maxHp: 20,
  },
  {
    id: "H_E_GRA",
    art: "gravemarch",
    faction: "EVIL",
    classes: ["FURNACE", "HEX"],
    powerIds: ["P_F1", "P_X1", "P_X2", "S_E_GRA"],
    maxHp: 20,
  },
  {
    id: "H_E_SCO",
    art: "scoria",
    faction: "EVIL",
    classes: ["FURNACE", "HEX"],
    powerIds: ["P_F2", "P_X1", "P_X2", "S_E_SCO"],
    maxHp: 20,
  },
] as const;
export type PublicHero = (typeof publicHeroes)[number];
export type HeroFilter = "ALL" | "GOOD" | "EVIL";
export const publicHero = (id: string) =>
  publicHeroes.find((hero) => hero.id === id);
export const heroFilter = (value?: string): HeroFilter =>
  value === "GOOD" || value === "EVIL" ? value : "ALL";
export const factionName = (faction: string) =>
  faction === "GOOD" ? "Dawnward" : "Ashen Court";
export const classNames = (hero: PublicHero) =>
  hero.classes.map((name) => name[0] + name.slice(1).toLowerCase()).join(" · ");
function environmentKey(hero: PublicHero) {
  if (
    ["briar", "aster", "lumen", "cinder", "vesper", "morrow"].includes(hero.art)
  )
    return hero.art;
  if (hero.faction === "GOOD")
    return hero.classes.some((value) => value === "BASTION")
      ? "briar"
      : "lumen";
  return hero.classes.some((value) => value === "FURNACE")
    ? "cinder"
    : "morrow";
}
export const heroEnvironment = (hero: PublicHero, small = false) =>
  `/assets/pen-v1/${environmentKey(hero)}-environment${small ? "-small" : ""}.webp`;
export const heroPortrait = (hero: PublicHero) =>
  `/assets/heroes-v4/heroes/${hero.art}/bust.webp`;

export function gameEntryDestination(
  activeMatchId: string | null,
  selectedHeroId?: string,
): string {
  if (activeMatchId) return `/matches/${encodeURIComponent(activeMatchId)}`;
  if (!selectedHeroId) return "/heroes";
  if (!publicHero(selectedHeroId)) throw new Error("Unknown hero");
  return `/heroes/${encodeURIComponent(selectedHeroId)}/decks`;
}

export type CampaignView =
  | { kind: "features" }
  | { kind: "news" | "events"; slug?: string; filter?: string }
  | { kind: "heroes"; faction?: HeroFilter }
  | { kind: "hero"; heroId: HeroId; faction?: HeroFilter };
