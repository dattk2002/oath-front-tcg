"use client";
import { SystemBadges, systemStrategy } from "../content/ContentBadges";
import Link from "next/link";
import {
  contentName,
  contentText,
  heroTitle,
} from "../../content/english-content";
import { CampaignArtwork } from "./CampaignArtwork";
import {
  factionName,
  heroEnvironment,
  heroPortrait,
  publicHeroes,
  type HeroFilter,
  type PublicHero,
} from "./model";

export function HeroProfile({
  hero,
  onChoose,
  busy,
  resume,
  faction = "ALL",
}: {
  hero: PublicHero;
  onChoose: () => void;
  busy: boolean;
  resume: boolean;
  faction?: HeroFilter;
}) {
  const index = publicHeroes.findIndex((value) => value.id === hero.id) + 1;
  return (
    <div className="campaign-profile">
      <section className="campaign-profile-stage campaign-paper">
        <div className="campaign-profile-copy" data-campaign-reveal>
          <p className="kicker">
            {factionName(hero.faction)} / {hero.maxHp} HP
          </p>
          <h1>{contentName(hero.id)}</h1>
          <h2>{heroTitle(hero.id)}</h2>
          <p className="campaign-profile-classes">
            <SystemBadges systems={hero.classes} />
          </p>
          <p className="campaign-profile-description">{systemStrategy(hero)}</p>
        </div>
        <div className="campaign-profile-art">
          <CampaignArtwork
            className="profile-environment"
            src={heroEnvironment(hero)}
            alt=""
            eager
          />
          <CampaignArtwork
            className="profile-portrait contain"
            src={heroPortrait(hero)}
            alt={`${contentName(hero.id)} — ${heroTitle(hero.id)}`}
            eager
            retry
          />
          <span className="campaign-hero-index">
            <small>The heroes</small>
            {String(index).padStart(2, "0")} / {publicHeroes.length}
          </span>
        </div>
        <div className="campaign-profile-actions campaign-actions">
          <button
            className="campaign-button ink"
            onClick={onChoose}
            disabled={busy}
          >
            {busy ? "Connecting…" : resume ? "Continue match" : "Choose deck"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          <Link
            className="campaign-button secondary"
            href={`/explore/heroes${faction === "ALL" ? "" : `?faction=${faction}`}`}
          >
            All heroes
          </Link>
        </div>
      </section>
      <section
        className="campaign-power-section"
        aria-label={`${contentName(hero.id)} superpowers`}
      >
        <h2>Four powers. Your timing.</h2>
        <div className="campaign-powers">
          {hero.powerIds.map((id) => (
            <article
              key={id}
              className={id.startsWith("S_") ? "signature" : undefined}
            >
              <p className="kicker">
                {id.startsWith("S_") ? "Signature" : "Superpower"}
              </p>
              <h3>{contentName(id)}</h3>
              <p>{contentText(id)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
