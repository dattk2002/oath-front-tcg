"use client";
import Link from "next/link";

export const campaignLinks = [
  { id: "home", href: "/", label: "Home" },
  { id: "news", href: "/news", label: "News" },
  {
    id: "features",
    href: "/game-features",
    label: "Game Features",
    short: "Features",
  },
  { id: "heroes", href: "/explore/heroes", label: "Heroes" },
  { id: "events", href: "/events", label: "Events" },
] as const;

export function CampaignHeader({
  active,
  onPlay,
  busy,
  accountLabel,
  onAccount,
}: {
  active: string;
  onPlay: () => void;
  busy: boolean;
  accountLabel: string;
  onAccount: () => void;
}) {
  return (
    <header className="campaign-header" data-pen-node="hsZRy">
      <Link href="/" className="campaign-brand" aria-label="OathFront · Home">
        <img
          src="/assets/pen-v1/logo-light.svg"
          alt="OathFront"
          width="144"
          height="52"
        />
      </Link>
      <nav aria-label="Main navigation" className="campaign-nav">
        {campaignLinks.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            aria-current={active === link.id ? "page" : undefined}
            className={link.id === "home" ? "campaign-home-link" : undefined}
          >
            <span className={"short" in link ? "desktop-label" : undefined}>
              {link.label}
            </span>
            {"short" in link && (
              <span className="mobile-label">{link.short}</span>
            )}
          </Link>
        ))}
      </nav>
      <button className="campaign-account-link" onClick={onAccount}>
        {accountLabel}
      </button>
      <button
        className="campaign-button campaign-header-play"
        disabled={busy}
        onClick={onPlay}
        aria-label="Play now · Navigation"
      >
        {busy ? (
          "Connecting…"
        ) : (
          <>
            Play now <span aria-hidden="true">↗</span>
          </>
        )}
      </button>
    </header>
  );
}
