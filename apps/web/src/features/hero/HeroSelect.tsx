import { SystemBadges } from "../content/ContentBadges";
import { contentName } from "../../content/english-content";
import { useEffect, useRef, useState } from "react";
import type { HeroId, PublicCatalog } from "@oathfront/contracts/browser";
import { useUiMotion } from "../motion/use-ui-motion";
import HeroInspect from "./HeroInspect";
import ArtImage from "../match/ArtImage";
export default function HeroSelect({
  catalog,
  onPlay,
}: {
  catalog: PublicCatalog;
  onPlay: (heroId: HeroId) => void;
}) {
  const [selected, setSelected] = useState<HeroId>("H_G_BV");
  const [page, setPage] = useState(0),
    [pageSize, setPageSize] = useState(6);
  const root = useRef<HTMLElement>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    let id: string | null = null;
    try {
      id = sessionStorage.getItem("oathfront.hero");
    } catch {
      /* Memory selection remains available. */
    }
    const index = catalog.heroes.findIndex((h) => h.id === id);
    if (index >= 0) {
      setSelected(catalog.heroes[index]!.id);
      selectedRef.current = catalog.heroes[index]!.id;
    }
    const compact = matchMedia("(max-width: 860px)");
    function resize() {
      const size = compact.matches ? 4 : 6;
      setPageSize(size);
      setPage(
        Math.floor(
          Math.max(
            0,
            catalog.heroes.findIndex((h) => h.id === selectedRef.current),
          ) / size,
        ),
      );
    }
    resize();
    compact.addEventListener("change", resize);
    return () => compact.removeEventListener("change", resize);
  }, [catalog]);
  useUiMotion(root, "hero", selected);
  const hero = catalog.heroes.find((h) => h.id === selected)!;
  const pages = Math.ceil(catalog.heroes.length / pageSize);
  const visible = catalog.heroes.slice(page * pageSize, (page + 1) * pageSize);
  function select(id: HeroId) {
    setSelected(id);
    try {
      sessionStorage.setItem("oathfront.hero", id);
    } catch {
      /* Memory selection. */
    }
  }
  return (
    <section className="setup hero-lobby" ref={root}>
      <div className="screen-heading">
        <h1>Choose your hero</h1>
        <p>{catalog.heroes.length} heroes · All unlocked</p>
      </div>
      <div className="hero-select-layout">
        <div className="roster-panel">
          <div
            role="radiogroup"
            aria-label="Choose hero"
            className="hero-grid roster-grid"
            data-roster-page={page}
          >
            {visible.map((h) => (
              <label
                key={h.id}
                className={`hero-tile panel ${h.faction.toLowerCase()} ${h.id === selected ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="hero"
                  aria-label={`${contentName(h.id)} · ${h.faction === "GOOD" ? "Dawnward" : "Ashen Court"}`}
                  value={h.id}
                  checked={selected === h.id}
                  onChange={() => select(h.id)}
                />
                <span className="hero-portrait">
                  <ArtImage
                    artKey={h.portraitKey}
                    name={contentName(h.id)}
                    variant="thumb"
                    retry={false}
                    eager
                  />
                </span>
                <strong
                  className={contentName(h.id).length > 9 ? "long-name" : ""}
                >
                  {contentName(h.id)}
                </strong>
                <SystemBadges systems={h.classes} />
                <span className="hero-selection-status" aria-hidden="true">
                  {h.id === selected ? "Selected" : " "}
                </span>
              </label>
            ))}
          </div>
          <nav className="roster-pagination" aria-label="Hero pages">
            <button
              aria-label="Previous heroes"
              disabled={page === 0}
              onClick={() => setPage((n) => n - 1)}
            >
              ←
            </button>
            <span aria-live="polite" aria-atomic="true">
              {page * pageSize + 1}–
              {Math.min((page + 1) * pageSize, catalog.heroes.length)}{" "}
              <span>of {catalog.heroes.length}</span>
            </span>
            <button
              aria-label="Next heroes"
              disabled={page === pages - 1}
              onClick={() => setPage((n) => n + 1)}
            >
              →
            </button>
          </nav>
        </div>
        <HeroInspect
          key={hero.id}
          hero={hero}
          catalog={catalog}
          onPlay={() => onPlay(hero.id)}
        />
      </div>
    </section>
  );
}
