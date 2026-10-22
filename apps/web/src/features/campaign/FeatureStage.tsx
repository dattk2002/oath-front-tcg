"use client";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { CampaignArtwork } from "./CampaignArtwork";
import { useReducedMotion } from "../motion/use-reduced-motion";
import Link from "next/link";
const panels = [
  {
    key: "five-lane-tactics",
    label: "Five-lane tactics",
    title: "Five lanes. Endless decisions.",
    copy: "A unit in the right lane can change everything. Deploy, hold your tricks, and read the battlefield before combat begins.",
    href: "/heroes",
    action: "Choose your hero",
  },
  {
    key: "two-system-heroes",
    label: "Two-system heroes",
    title: "Two systems. One identity.",
    copy: "Twenty original heroes. Eight tactical systems. Combine two strengths, master four superpowers, and build a deck that plays your way.",
    href: "/explore/heroes",
    action: "Meet the heroes",
  },
  {
    key: "collectible-cards",
    label: "Collectible cards",
    title: "Every card. A new possibility.",
    copy: "Start with all sixty core cards. Earn twelve event units through weekly play. Build thirty-card decks with up to two copies of each card.",
    href: "/heroes",
    action: "Build a deck",
  },
  {
    key: "weekly-expeditions",
    label: "Weekly expeditions",
    title: "A fresh challenge. Every day.",
    copy: "Seven prepared battles. One weekly spotlight. Win tickets, reach milestones, and keep the event cards you earn. A new day starts at 07:00 Vietnam time.",
    href: "/events",
    action: "Explore the season",
  },
];
export function FeatureStage() {
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (reduced || !root.current || document.hidden) return;
    const panel = root.current.querySelector(".feature-panel:not([hidden])");
    if (!panel) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        panel.querySelector(".feature-stage-art"),
        { opacity: 0.55, x: 18 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
      gsap.fromTo(
        panel.querySelector(".feature-stage-copy"),
        { opacity: 0.7, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
    }, root);
    const hidden = () => {
      if (document.hidden) context.revert();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      context.revert();
    };
  }, [selected, reduced]);
  function select(index: number, focus = false) {
    const next = (index + panels.length) % panels.length;
    setSelected(next);
    if (focus) tabs.current[next]?.focus();
  }
  return (
    <section
      className="feature-stage"
      ref={root}
      data-reduced={reduced}
      aria-label="Discover OathFront"
    >
      {panels.map((panel, index) => {
        const Heading = reduced && index > 0 ? "h2" : "h1";
        return (
          <section
            key={panel.key}
            className="feature-panel"
            id={`feature-${index}`}
            role={reduced ? undefined : "tabpanel"}
            aria-labelledby={
              reduced ? `feature-title-${index}` : `feature-tab-${index}`
            }
            hidden={!reduced && selected !== index}
          >
            <CampaignArtwork
              className="feature-stage-art"
              src={`/assets/features-v2/${panel.key}-wide.webp`}
              srcSet={`/assets/features-v2/${panel.key}-small.webp 768w, /assets/features-v2/${panel.key}-medium.webp 1200w, /assets/features-v2/${panel.key}-wide.webp 1920w`}
              sizes="100vw"
              alt=""
              eager={index === selected}
            />
            <div className="feature-stage-copy">
              <p className="kicker">{panel.label}</p>
              <Heading id={`feature-title-${index}`}>{panel.title}</Heading>
              <p>{panel.copy}</p>
              <Link className="campaign-button" href={panel.href}>
                {panel.action}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </section>
        );
      })}
      {!reduced && (
        <div className="feature-controls">
          <button
            type="button"
            aria-label="Previous feature"
            onClick={() => select(selected - 1)}
          >
            ←
          </button>
          <div
            role="tablist"
            aria-label="Game features"
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                select(
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 3
                      : selected + (event.key === "ArrowRight" ? 1 : -1),
                  true,
                );
              }
            }}
          >
            {panels.map((panel, index) => (
              <button
                key={panel.key}
                id={`feature-tab-${index}`}
                ref={(el) => {
                  tabs.current[index] = el;
                }}
                type="button"
                role="tab"
                aria-selected={selected === index}
                aria-controls={`feature-${index}`}
                tabIndex={selected === index ? 0 : -1}
                onClick={() => select(index)}
              >
                {panel.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Next feature"
            onClick={() => select(selected + 1)}
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}
