"use client";
import Link from "next/link";
import { useState } from "react";
import { CampaignArtwork } from "./CampaignArtwork";
import { contentName, heroTitle } from "../../content/english-content";
import CardVisual from "../content/CardVisual";
import { useLiveRead } from "../content/use-live-read";
import { HomeNews } from "./LiveNews";
import type { ApiClient } from "../match/api-client";
import { classNames, factionName, heroPortrait, publicHeroes } from "./model";

const phases = [
  {
    name: "Ashen deploy",
    side: "EVIL",
    text: "The Ashen Court goes first. Deploy units into empty lanes; save energy for tricks later.",
  },
  {
    name: "Dawnward play",
    side: "GOOD",
    text: "Dawnward responds with units and tricks. Build your defense or open a lane to the enemy hero.",
  },
  {
    name: "Ashen tricks",
    side: "EVIL",
    text: "The Ashen Court spends its remaining energy on tricks and superpowers. Change the board before combat.",
  },
  {
    name: "Combat",
    side: "BOTH",
    text: "Resolve lanes 1 to 5. Both units strike simultaneously within each lane. An unblocked unit hits the opposing hero.",
  },
] as const;
const featured = ["H_G_BP", "H_G_MOS", "H_E_VAN"].map((id) =>
  publicHeroes.find((h) => h.id === id)!,
);
const showcaseIds = ["GC01", "B03", "GC05"];
function PhaseGuide() {
  const [phase, setPhase] = useState(0);
  return (
    <section
      className="home-gameplay home-section"
      aria-labelledby="home-gameplay-heading"
      data-home-reveal
    >
      <div className="home-section-heading">
        <p className="kicker">A battlefield of decisions</p>
        <h2 id="home-gameplay-heading">
          Small board.
          <br />
          Big turning points.
        </h2>
        <p>
          Five lanes. Two factions. Spend energy now or save it for tricks.
          Learn the rhythm, then make it yours.
        </p>
        <Link href="/game-features" className="home-text-link">
          Explore the game <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="home-tactics">
        <div
          className="home-tactics-board"
          data-phase={phase}
          aria-label="Illustration of five lanes, Ashen Court above and Dawnward below"
        >
          <span className="home-tactics-board-side">Ashen Court</span>
          <div className="home-tactics-board-lanes" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((lane) => (
              <div className="home-tactics-board-lane" key={lane}>
                <span className="home-lane-unit evil">
                  <img
                    src={`/assets/fivefold-cards-v3/cards/${lane % 2 ? "ec01" : "f01"}-thumb.webp`}
                    alt=""
                    loading="lazy"
                    width="96"
                    height="96"
                  />
                </span>
                <strong>0{lane}</strong>
                <span className="home-lane-unit good">
                  <img
                    src={`/assets/fivefold-cards-v3/cards/${lane % 2 ? "gc01" : "b01"}-thumb.webp`}
                    alt=""
                    loading="lazy"
                    width="96"
                    height="96"
                  />
                </span>
              </div>
            ))}
          </div>
          <span className="home-tactics-board-side">Dawnward</span>
        </div>
        <div
          className="home-phase-buttons"
          role="group"
          aria-label="Preview the four turn phases"
        >
          {phases.map((item, i) => (
            <button
              key={item.name}
              aria-pressed={phase === i}
              aria-describedby="home-phase-description"
              onClick={() => setPhase(i)}
            >
              <span aria-hidden="true">0{i + 1}</span>
              {item.name}
            </button>
          ))}
        </div>
        <p
          id="home-phase-description"
          aria-live="polite"
          className="home-phase-description"
        >
          {phases[phase]!.text}
        </p>
        <p className="home-small-note">
          Turn preview · No match is started here.
        </p>
      </div>
    </section>
  );
}
export function CampaignHome({
  api,
  onPlay,
  onLearn,
  busy,
  resume,
}: {
  api: ApiClient;
  onPlay: () => void;
  onLearn: () => void;
  busy: boolean;
  resume: boolean;
}) {
  const showcase = useLiveRead("home-card-catalog", () => api.catalog());
  return (
    <div
      className="campaign-home home-expanded"
      data-design-extension="heroes-home-v2"
    >
      <section className="campaign-home-stage campaign-paper" data-home-stage>
        <CampaignArtwork
          className="campaign-home-art"
          src="/assets/home-v3/ensemble-wide.webp"
          srcSet="/assets/home-v3/ensemble-small.webp 768w, /assets/home-v3/ensemble-medium.webp 1200w, /assets/home-v3/ensemble-wide.webp 1920w"
          sizes="100vw"
          alt="Eight OathFront heroes surge into the Fivefold: Briar, Aster, Lumen, Cinder, Morrow, Vanta, Mossweld and Rowan"
          eager
        />
        <div className="campaign-home-copy" data-campaign-reveal>
          <p className="kicker">OathFront / Tactical card battles</p>
          <h1 data-home-headline>
            FIVE LANES.
            <br />
            ONE OATH.
          </h1>
          <p className="campaign-home-intro">
            Choose your hero. Shape your deck.
            <br />
            Turn a single lane into a winning play.
          </p>
          <div className="campaign-actions">
            <button
              className="campaign-button ink"
              disabled={busy}
              onClick={onPlay}
              aria-label={resume ? "Continue match" : "Play now · Play vs bot"}
            >
              {busy ? "Connecting…" : resume ? "Continue match" : "Play now"}
              <span aria-hidden="true">↗</span>
            </button>
            <button
              className="campaign-button secondary learn-button"
              disabled={busy}
              onClick={onLearn}
            >
              Learn to play <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="home-browser-note">
            Free to play in your browser · PvE
          </p>
        </div>
      </section>
      <div className="campaign-home-summary">
        <strong>Your oath. Your playstyle.</strong>
        <span>
          {publicHeroes.length} heroes · 60 cards · Easy and Normal bots
        </span>
        <Link href="/explore/heroes">
          Meet the roster <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <PhaseGuide />
      <section
        className="home-heroes home-section campaign-lilac"
        aria-labelledby="home-heroes-heading"
        data-home-reveal
      >
        <div className="home-section-heading home-heading-row">
          <div>
            <p className="kicker">Dawnward / Ashen Court</p>
            <h2 id="home-heroes-heading">
              Find your kind
              <br />
              of extraordinary.
            </h2>
          </div>
          <div>
            <p>
              {publicHeroes.length} heroes. Four powers each.
              <br />A different way to turn the tide.
            </p>
            <Link href="/explore/heroes" className="campaign-button ink">
              Explore all heroes <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="home-featured-grid">
          {featured.map((hero) => (
            <Link
              key={hero.id}
              href={`/explore/heroes/${hero.id}`}
              className={`home-featured-hero campaign-hero-card ${hero.faction.toLowerCase()}`}
              aria-label={`${contentName(hero.id)} — ${heroTitle(hero.id)}`}
            >
              <span className="home-featured-number" aria-hidden="true">
                {String(publicHeroes.indexOf(hero) + 1).padStart(2, "0")}
              </span>
              <CampaignArtwork
                className="home-featured-art contain"
                src={heroPortrait(hero)}
                alt=""
              />
              <div className="home-featured-copy">
                <p className="kicker">{factionName(hero.faction)}</p>
                <h3>
                  {contentName(hero.id)} <span aria-hidden="true">↗</span>
                </h3>
                <p>{heroTitle(hero.id)}</p>
                <small>{classNames(hero)}</small>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section
        className="home-decks home-section campaign-paper"
        aria-labelledby="home-decks-heading"
        data-home-reveal
      >
        <div className="home-section-heading">
          <p className="kicker">Build a plan worth playing</p>
          <h2 id="home-decks-heading">
            Every card.
            <br />A new possibility.
          </h2>
          <p>
            Start with a ready-to-play deck, then make it your own. Pick 30
            cards from your hero’s faction and classes, with up to two copies of
            each.
          </p>
          <Link href="/heroes" className="campaign-button ink">
            Choose a hero & deck <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="home-card-fan" aria-label="A sample of Dawnward cards">
          {showcaseIds.map((id) => {
            const card = showcase.data?.cards.find((c) => c.id === id);
            return (
              <figure key={id} className="home-showcase-card">
                {card ? (
                  <CardVisual definition={card} surface="showcase" />
                ) : (
                  <span className="card-showcase-placeholder">
                    {contentName(id)}
                    <small>
                      {showcase.error ? "Artwork unavailable" : "Loading card…"}
                    </small>
                  </span>
                )}
              </figure>
            );
          })}
        </div>
      </section>
      <section
        className="home-world home-section"
        aria-labelledby="home-world-heading"
        data-home-reveal
      >
        <div className="home-section-heading home-heading-row">
          <div>
            <p className="kicker">Beyond the battlefield</p>
            <h2 id="home-world-heading">Enter the Fivefold.</h2>
          </div>
          <Link href="/news" className="home-text-link">
            All stories <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <HomeNews api={api} />
      </section>
      <section
        className="home-closing home-section campaign-paper"
        aria-labelledby="home-closing-heading"
        data-home-reveal
      >
        <p className="kicker">The next move is yours</p>
        <h2 id="home-closing-heading">TAKE YOUR OATH.</h2>
        <p>A hero, a deck, and five lanes of possibility.</p>
        <div className="campaign-actions">
          <button
            className="campaign-button ink"
            disabled={busy}
            onClick={onPlay}
          >
            {busy
              ? "Connecting…"
              : resume
                ? "Continue your match"
                : "Enter the Fivefold"}
            <span aria-hidden="true">↗</span>
          </button>
          <Link href="/game-features" className="campaign-button secondary">
            Discover the game
          </Link>
        </div>
      </section>
    </div>
  );
}
