"use client";
import { publicHeroes } from "./model";
import { contentName } from "../../content/english-content";
import { CampaignArtwork } from "./CampaignArtwork";

export function GameFeatures({
  onPlay,
  busy,
}: {
  onPlay: () => void;
  busy: boolean;
}) {
  return (
    <div className="campaign-features" data-pen-node="Wcfik">
      <section className="features-hero">
        <CampaignArtwork
          className="features-hero-art"
          src="/assets/pen-v1/twilight-arena.webp"
          srcSet="/assets/pen-v1/twilight-arena-small.webp 800w, /assets/pen-v1/twilight-arena.webp 1600w"
          sizes="100vw"
          alt=""
          eager
        />
        <div data-campaign-reveal>
          <p className="kicker">The tactical card game</p>
          <h1>
            Five lanes.
            <br />
            Endless decisions.
          </h1>
          <p>Lead Dawnward or the Ashen Court. Make every card count.</p>
          <button className="campaign-button" onClick={onPlay} disabled={busy}>
            Play now <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>
      <dl className="features-facts">
        {[
          ["05", "Ordered lanes"],
          [String(publicHeroes.length), "Unlocked heroes"],
          ["60", "Cards"],
          ["PvE", "Easy / Normal bots"],
        ].map(([value, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <section className="features-deck campaign-paper">
        <div>
          <p className="kicker">01 / Your deck</p>
          <h2>
            Build your
            <br />
            way to play.
          </h2>
          <p>
            Choose a hero and a legal 30-card deck. Combine units and tricks,
            with no more than two copies of each card.
          </p>
          <p>Start with a preset, or shape your own collection into a plan.</p>
        </div>
        <div className="features-card-gallery">
          {["GC01", "B03", "GC05"].map((id) => (
            <figure key={id}>
              <CampaignArtwork
                className="contain"
                src={`/assets/fivefold-cards-v3/cards/${id.toLowerCase()}-inspect.webp`}
                alt={`${contentName(id)} illustration`}
              />
              <figcaption>{contentName(id)}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="features-lanes">
        <h2>02 / One shared battlefield</h2>
        <p>
          Five lanes, left to right. Deploy units, conserve energy and choose
          the moment to turn the battle.
        </p>
        <ol aria-label="Five lanes in combat order">
          {[1, 2, 3, 4, 5].map((lane) => (
            <li key={lane}>
              <strong>0{lane}</strong>
              <span>Lane {lane}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
