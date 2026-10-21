import type { HeroId } from "@oathfront/contracts/browser";

// Public profile metadata mirrors immutable core_v1; parity is checked against core.
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
export const heroEnvironment = (hero: PublicHero, small = false) =>
  `/assets/pen-v1/${hero.art}-environment${small ? "-small" : ""}.webp`;
export const heroPortrait = (hero: PublicHero) =>
  `/assets/rivals-v2/heroes/${hero.art}/bust.webp`;

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
