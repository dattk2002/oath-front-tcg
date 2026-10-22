import { contentName } from "../../content/english-content";
import type { HeroView, PublicCatalog, Side } from "@oathfront/contracts";
import { sideLabel } from "./labels";
import ArtImage from "./ArtImage";
export default function HeroPanel({
  hero,
  side,
  own,
  catalog,
  targetable,
  onTarget,
  onPreview,
  tutorialEnergyFocus = false,
}: {
  tutorialEnergyFocus?: boolean;
  hero: HeroView;
  side: Side;
  own: boolean;
  catalog: PublicCatalog;
  targetable: boolean;
  onTarget: () => void;
  onPreview: () => void;
}) {
  const definition = catalog.heroes.find((item) => item.id === hero.heroId);
  return (
    <section
      className={`hero-panel panel ${side.toLowerCase()}`}
      data-hero-side={side}
      data-own-hero={own}
      aria-label={`${own ? "Your hero" : "Opponent hero"} · ${sideLabel[side]}`}
    >
      <button
        className="hero-target"
        data-target={JSON.stringify({ kind: "HERO", side })}
        data-legal-target={targetable}
        disabled={!targetable}
        onClick={onTarget}
        onPointerEnter={onPreview}
        onFocus={onPreview}
      >
        <span className="sr-only">Choose hero </span>
        {definition && (
          <span className="hero-hud-art">
            <ArtImage
              artKey={definition.portraitKey}
              name={contentName(definition.id)}
              variant="hud"
              retry={false}
            />
          </span>
        )}
        <strong>
          {contentName(
            catalog.heroes.find((item) => item.id === hero.heroId)?.id ?? "",
          )}{" "}
          <span>
            · {own ? "You" : "Bot"} · {sideLabel[side]}
          </span>
        </strong>
        <span>
          <b>{hero.hp}</b> / 20 HP
        </span>
      </button>
      <div className="hero-resources">
        <span
          data-tutorial-focus={tutorialEnergyFocus}
          data-testid={own ? "own-energy" : "opponent-energy"}
        >
          Energy{" "}
          <b>
            {hero.energy.current} / {hero.energy.max}
          </b>
        </span>
        <span>
          Block <b>{hero.block.charge} / 8</b> · Used {hero.block.used} / 3
        </span>
        <span className="muted">
          Hand {hero.handCount} · Deck {hero.deckCount} · Power{" "}
          {hero.reserveCount}
        </span>
      </div>
    </section>
  );
}
