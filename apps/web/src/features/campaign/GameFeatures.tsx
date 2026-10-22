"use client";
import { CampaignArtwork } from "./CampaignArtwork";
import { FeatureStage } from "./FeatureStage";
import { arenas } from "../match/rendering/arena";
export function GameFeatures({
  onPlay,
  busy,
}: {
  onPlay: () => void;
  busy: boolean;
}) {
  return (
    <div
      className="campaign-features features-expansion"
      data-pen-node="Wcfik"
      data-design-extension="elements-events-v1"
    >
      <FeatureStage />
      <section className="feature-rules campaign-paper">
        <div>
          <p className="kicker">Read the rhythm</p>
          <h2>
            Four phases.
            <br />
            One turning point.
          </h2>
          <p>
            Choose a lane, watch your opponent, and spend your energy when it
            matters. Combat resolves from lane 1 to lane 5.
          </p>
        </div>
        <ol>
          {[
            ["Ashen deployment", "Ashen Court plays units first."],
            ["Dawnward play", "Dawnward plays units and tricks."],
            ["Ashen tricks", "Ashen Court answers with tricks."],
            [
              "Lane combat",
              "In each lane, Ashen attacks, then Dawnward. Both strikes use the combat snapshot; damage resolves together.",
            ],
          ].map(([name, copy]) => (
            <li key={name}>
              <h3>{name}</h3>
              <p>{copy}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="feature-arenas">
        <header>
          <p className="kicker">The Fivefold</p>
          <h2>A world worth defending.</h2>
          <p>
            Four illustrated arenas. The environment sets the scene; revealed
            locations carry the rules.
          </p>
        </header>
        <div className="arena-gallery">
          {arenas.map((arena) => (
            <figure key={arena.key}>
              <CampaignArtwork
                src={arena.medium}
                srcSet={`${arena.small} 768w, ${arena.medium} 1200w`}
                sizes="(min-width:768px) 50vw, 100vw"
                alt={`${arena.name} battlefield`}
              />
              <figcaption>{arena.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="feature-play">
        <p className="kicker">Your oath begins here</p>
        <h2>
          Take your place
          <br />
          on the front.
        </h2>
        <button className="campaign-button" disabled={busy} onClick={onPlay}>
          {busy ? "Preparing…" : "Play now"}
          <span aria-hidden="true">↗</span>
        </button>
        <p>
          Free browser PvE. All twenty heroes and sixty core cards are ready to
          play.
        </p>
      </section>
    </div>
  );
}
