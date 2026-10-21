"use client";
import Link from "next/link";
import { contentName, heroTitle } from "../../content/english-content";
import { CampaignArtwork } from "./CampaignArtwork";
import { HeroProfile } from "./HeroProfile";
import {
  classNames,
  factionName,
  heroEnvironment,
  heroPortrait,
  publicHero,
  publicHeroes,
  type CampaignView,
} from "./model";

export function CampaignPage({
  view,
  onChooseHero,
  busy,
  resume,
}: {
  view: CampaignView;
  onChooseHero: (id: string) => void;
  busy: boolean;
  resume: boolean;
}) {
  if (view.kind === "hero") {
    const hero = publicHero(view.heroId);
    return hero ? (
      <HeroProfile
        hero={hero}
        onChoose={() => onChooseHero(hero.id)}
        busy={busy}
        resume={resume}
        faction={view.faction ?? "ALL"}
      />
    ) : null;
  }
  const faction = view.faction ?? "ALL";
  const visible = publicHeroes.filter(
    (hero) => faction === "ALL" || hero.faction === faction,
  );
  return (
    <section className="campaign-roster campaign-lilac" data-pen-node="xaC80">
      <div className="campaign-roster-heading" data-campaign-reveal>
        <div>
          <p className="kicker">The six / All unlocked</p>
          <h1>Find your hero.</h1>
          <p>Two factions. Six identities. Choose the way you play.</p>
        </div>
        <nav className="campaign-filters" aria-label="Hero factions">
          {(["ALL", "GOOD", "EVIL"] as const).map((value) => (
            <Link
              key={value}
              href={`/explore/heroes${value === "ALL" ? "" : `?faction=${value}`}`}
              scroll={false}
              aria-current={faction === value ? "true" : undefined}
            >
              {value === "ALL" ? "All" : factionName(value)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="campaign-hero-grid">
        {visible.map((hero) => (
          <Link
            className="campaign-hero-card"
            key={hero.id}
            href={`/explore/heroes/${hero.id}${faction === "ALL" ? "" : `?faction=${faction}`}`}
            aria-label={`${contentName(hero.id)} — ${heroTitle(hero.id)}`}
          >
            <div className="campaign-hero-card-art" data-campaign-card-art>
              <CampaignArtwork
                className="card-environment"
                src={heroEnvironment(hero, true)}
                alt=""
              />
              <CampaignArtwork
                className="card-portrait contain"
                src={heroPortrait(hero)}
                alt=""
              />
            </div>
            <div className="campaign-hero-card-copy">
              <h2>
                {contentName(hero.id)} <span aria-hidden="true">↗</span>
              </h2>
              <p>{heroTitle(hero.id)}</p>
              <small>
                {classNames(hero)} / {factionName(hero.faction)}
              </small>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
