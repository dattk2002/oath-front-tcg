import type {
  HeroId,
  ClassId,
  PowerId,
  Side,
} from "@oathfront/contracts/browser";
import presentation from "../../content/elements-presentation.json" with { type: "json" };
import { artById } from "../match/rendering/asset-manifest";

export type PublicHero = {
  id: HeroId;
  art: string;
  faction: Side;
  classes: [ClassId, ClassId];
  powerIds: PowerId[];
  maxHp: number;
};
// Public-only projection; exact parity with elements_v1 is checked in presentation tests.
export const publicHeroes = presentation.heroes as PublicHero[];
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
    return hero.classes.some((value) => value === "TERRA") ? "briar" : "lumen";
  return hero.classes.some((value) => value === "FORGE") ? "cinder" : "morrow";
}
export const heroEnvironment = (hero: PublicHero, small = false) =>
  `/assets/pen-v1/${environmentKey(hero)}-environment${small ? "-small" : ""}.webp`;
export const heroPortrait = (hero: PublicHero) =>
  artById(hero.id)?.bust ?? `/assets/heroes-v4/heroes/${hero.art}/bust.webp`;

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
