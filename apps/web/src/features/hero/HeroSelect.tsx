import { contentName } from "../../content/english-content";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { HeroId, PublicCatalog } from "@oathfront/contracts/browser";
import { gsap } from "gsap";
import { classLabel } from "../match/labels";
import HeroInspect, { strategies } from "./HeroInspect";
import ArtImage from "../match/ArtImage";
export default function HeroSelect({ catalog }: { catalog: PublicCatalog }) {
  const router = useRouter();
  const [selected, setSelected] = useState<HeroId>("H_G_BV");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const id = sessionStorage.getItem("oathfront.hero");
      if (catalog.heroes.some((h) => h.id === id)) setSelected(id as HeroId);
    } catch {
      /* Selection still works in memory. */
    }
  }, [catalog]);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-detail",
        { opacity: 0.6, y: 4 },
        {
          opacity: 1,
          y: 0,
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 0.18,
        },
      );
    }, root);
    return () => ctx.revert();
  }, [selected]);
  const hero = catalog.heroes.find((h) => h.id === selected)!;
  return (
    <section className="setup" ref={root}>
      <div className="screen-heading">
        <h1>Choose your hero</h1>
        <p>Six heroes · All unlocked</p>
      </div>
      <div className="hero-select-layout">
        <div role="radiogroup" aria-label="Choose hero" className="hero-grid">
          {catalog.heroes.map((h, i) => (
            <label
              key={h.id}
              className={`hero-tile panel ${h.faction.toLowerCase()} ${h.id === selected ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="hero"
                value={h.id}
                checked={selected === h.id}
                onChange={() => {
                  setSelected(h.id);
                  try {
                    sessionStorage.setItem("oathfront.hero", h.id);
                  } catch {
                    /* Memory selection. */
                  }
                }}
              />
              <span className="hero-portrait">
                <ArtImage
                  artKey={h.portraitKey}
                  name={contentName(h.id)}
                  variant="hud"
                  eager
                />
              </span>
              <strong>{contentName(h.id)}</strong>
              <span>{h.classes.map((c) => classLabel[c]).join(" · ")}</span>
              <span>{strategies[h.id]}</span>
              {i === 0 && <small>Recommended for new players</small>}
              {h.id === selected && <b>Selected</b>}
            </label>
          ))}
        </div>
        <HeroInspect key={hero.id} hero={hero} catalog={catalog} />
      </div>
      <div className="deck-footer">
        <button
          className="primary"
          onClick={() => router.push(`/heroes/${selected}/decks`)}
        >
          Choose deck
        </button>
        <button onClick={() => router.push("/")}>Learn to play</button>
      </div>
    </section>
  );
}
