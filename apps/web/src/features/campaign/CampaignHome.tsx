"use client";
import Link from "next/link";
import { CampaignArtwork } from "./CampaignArtwork";

export function CampaignHome({
  onPlay,
  onLearn,
  busy,
  resume,
}: {
  onPlay: () => void;
  onLearn: () => void;
  busy: boolean;
  resume: boolean;
}) {
  return (
    <div className="campaign-home" data-pen-node="BXxLv">
      <section className="campaign-home-stage" data-home-stage>
        <CampaignArtwork
          className="campaign-home-art"
          src="/assets/pen-v1/clash-of-the-fivefold.webp"
          srcSet="/assets/pen-v1/clash-of-the-fivefold-small.webp 800w, /assets/pen-v1/clash-of-the-fivefold.webp 1600w"
          sizes="100vw"
          alt="Dawnward and the Ashen Court clash in the Fivefold"
          eager
        />
        <div className="campaign-home-copy" data-campaign-reveal>
          <p className="kicker">Tactical card battles / The Fivefold</p>
          <h1 data-home-headline>
            FIVE LANES.
            <br />
            ONE OATH.
          </h1>
          <p className="campaign-home-intro">
            Lead Dawnward or the Ashen Court. Deploy your units, conserve energy
            and choose the moment to turn the battle.
          </p>
          <div className="campaign-actions">
            <button
              className="campaign-button"
              disabled={busy}
              onClick={onPlay}
              aria-label={resume ? "Continue match" : "Play now · Play vs bot"}
            >
              {busy ? "Connecting…" : resume ? "Continue match" : "Play now"}
            </button>
            <button
              className="campaign-button secondary learn-button"
              disabled={busy}
              onClick={onLearn}
            >
              Learn to play <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>
      <div className="campaign-home-summary">
        <strong>The Fivefold</strong>
        <span>Six heroes · Six preset decks · Easy and Normal bots</span>
        <Link href="/explore/heroes">
          Explore the heroes <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  );
}
