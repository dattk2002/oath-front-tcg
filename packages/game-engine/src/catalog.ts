import type {
  Catalog,
  CardDefinition,
  PowerDefinition,
  Side,
} from "@oathfront/contracts";
import { catalogForVersion } from "@oathfront/game-content";

/** Resolve immutable rules from the stored match version, never the current release. */
export function matchCatalog(state: {
  versions: { content: string };
}): Catalog {
  const catalog = catalogForVersion(state.versions.content);
  if (!catalog) throw new RangeError("Unsupported match version");
  return catalog;
}

export function canUseCard(
  state: {
    versions: { content: string };
    players: Record<Side, { heroId: string }>;
  },
  actor: Side,
  card: CardDefinition,
): boolean {
  if (state.versions.content !== "elements_v1") return card.faction === actor;
  const hero = matchCatalog(state).heroes.find(
    (h) => h.id === state.players[actor].heroId,
  );
  return (
    !!hero && (card.classId === null || hero.classes.includes(card.classId))
  );
}
export function canUsePower(
  state: {
    versions: { content: string };
    players: Record<Side, { heroId: string }>;
  },
  actor: Side,
  power: PowerDefinition,
): boolean {
  if (state.versions.content !== "elements_v1") return power.faction === actor;
  return (
    matchCatalog(state)
      .heroes.find((h) => h.id === state.players[actor].heroId)
      ?.powerIds.includes(power.id) ?? false
  );
}
export function powerPhase(
  power: PowerDefinition,
  actor: Side,
): "GOOD_PLAY" | "EVIL_TRICKS" {
  return power.validPhase === "OWNER_PLAY"
    ? actor === "GOOD"
      ? "GOOD_PLAY"
      : "EVIL_TRICKS"
    : power.validPhase;
}
