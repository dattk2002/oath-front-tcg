import type {
  CardRarity,
  ClassId,
  HeroDefinitionView,
} from "@oathfront/contracts/browser";
import presentation from "../../content/elements-presentation.json" with { type: "json" };
import rarityTokens from "../../../public/assets/elements-v1/tokens.json" with { type: "json" };
import { classLabel } from "../match/labels";

export function SystemBadge({ system }: { system: ClassId | null }) {
  const definition = presentation.systems.find((s) => s.id === system);
  return (
    <span className="system-badge" data-system={system ?? "NEUTRAL"}>
      {definition && (
        <img
          src={`/assets/elements-v1/systems/${system!.toLowerCase()}.svg`}
          width={20}
          height={20}
          alt=""
        />
      )}
      {system ? classLabel[system] : "Neutral"}
    </span>
  );
}
export function SystemBadges({ systems }: { systems: readonly ClassId[] }) {
  return (
    <span className="system-badges">
      {systems.map((system) => (
        <SystemBadge key={system} system={system} />
      ))}
    </span>
  );
}
export function RarityBadge({
  rarity,
  full = false,
}: {
  rarity?: CardRarity | undefined;
  full?: boolean;
}) {
  const token = rarityTokens.rarities.find((r) => r.code === rarity);
  if (!token) return null;
  return (
    <span
      className="rarity-badge"
      data-rarity={rarity}
      aria-label={`${token.name} rarity`}
      title={token.name}
    >
      <img src={token.icon} width={18} height={18} alt="" />
      {token.code}
      {full ? ` · ${token.name}` : ""}
    </span>
  );
}
export function systemStrategy(hero: Pick<HeroDefinitionView, "classes">) {
  return hero.classes
    .map((id) => presentation.systems.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => `${s!.name}: ${s!.theme.toLowerCase()}.`)
    .join(" ");
}
