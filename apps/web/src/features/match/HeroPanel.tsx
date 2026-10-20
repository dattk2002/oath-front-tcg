import type { HeroView, PublicCatalog, Side } from "@oathfront/contracts";
import { sideLabel } from "./labels";
export default function HeroPanel({
  hero,
  side,
  own,
  catalog,
  targetable,
  onTarget,
}: {
  hero: HeroView;
  side: Side;
  own: boolean;
  catalog: PublicCatalog;
  targetable: boolean;
  onTarget: () => void;
}) {
  return (
    <section
      className={`hero-panel panel ${side.toLowerCase()}`}
      aria-label={`${own ? "Hero của bạn" : "Hero đối thủ"} · Phe ${sideLabel[side]}`}
    >
      <button
        className="hero-target"
        data-target={JSON.stringify({ kind: "HERO", side })}
        data-legal-target={targetable}
        disabled={!targetable}
        onClick={onTarget}
        aria-label={`Chọn hero ${catalog.heroes.find((item) => item.id === hero.heroId)?.nameVi}, ${hero.hp} HP`}
      >
        <strong>
          {catalog.heroes.find((item) => item.id === hero.heroId)?.nameVi}{" "}
          <span>
            · {own ? "Bạn" : "Bot"} · {sideLabel[side]}
          </span>
        </strong>
        <span>
          <b>{hero.hp}</b> / 20 HP
        </span>
      </button>
      <div className="hero-resources">
        <span data-testid={own ? "own-energy" : "opponent-energy"}>
          Năng lượng{" "}
          <b>
            {hero.energy.current} / {hero.energy.max}
          </b>
        </span>
        <span>
          Chặn <b>{hero.block.charge} / 8</b> · Đã dùng {hero.block.used} / 3
        </span>
        <span className="muted">
          Tay {hero.handCount} · Bộ bài {hero.deckCount} · Power{" "}
          {hero.reserveCount}
        </span>
      </div>
    </section>
  );
}
