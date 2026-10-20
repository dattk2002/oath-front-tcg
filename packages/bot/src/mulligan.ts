import type { PlayerView, PlayerAction } from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
export function chooseMulligan(
  view: PlayerView,
  legal: readonly PlayerAction[],
): PlayerAction | null {
  const cards = view.self.hand
    .map((card) => ({
      card,
      definition: coreCatalog.cards.find((d) => d.id === card.definitionId)!,
    }))
    .sort(
      (a, b) =>
        a.definition.cost - b.definition.cost ||
        compare(a.card.definitionId, b.card.definitionId) ||
        compare(a.card.instanceId, b.card.instanceId),
    );
  const cheap = cards.filter(
    (c) => c.definition.type === "UNIT" && c.definition.cost <= 2,
  );
  const kept = new Set<string>();
  // First preserve curve diversity, then fill the second cheap-unit slot.
  for (const cost of [1, 2]) {
    const c = cheap.find((c) => c.definition.cost === cost);
    if (c) kept.add(c.card.instanceId);
  }
  for (const c of cheap) if (kept.size < 2) kept.add(c.card.instanceId);
  if (kept.size) {
    const removal = cards.find(
      (c) =>
        c.definition.type === "TRICK" &&
        c.definition.cost <= 2 &&
        c.definition.effects.some(
          (e) =>
            e.kind === "DAMAGE" &&
            ["SELECTED_UNIT", "ENEMY_CHARACTER"].includes(e.targets),
        ) &&
        ["ENEMY_UNIT", "ANY_UNIT", "ENEMY_CHARACTER"].includes(
          c.definition.targeting.kind,
        ),
    );
    if (removal) kept.add(removal.card.instanceId);
  }
  const replace = view.self.hand
    .filter((c) => !kept.has(c.instanceId))
    .map((c) => c.instanceId)
    .sort(compare);
  return (
    legal.find(
      (a) =>
        a.kind === "MULLIGAN" &&
        a.cardInstanceIds.length === replace.length &&
        a.cardInstanceIds.every((id) => replace.includes(id)),
    ) ?? null
  );
}
export const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
