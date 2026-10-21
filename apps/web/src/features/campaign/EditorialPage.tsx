"use client";
import Link from "next/link";
import { CampaignArtwork } from "./CampaignArtwork";
import {
  editorialFilter,
  editorialFilters,
  filterEditorial,
  findEditorial,
  type EditorialEntry,
  type EditorialSection,
} from "./editorial";

function EditorialCover({
  entry,
  detail = false,
}: {
  entry: EditorialEntry;
  detail?: boolean;
}) {
  return (
    <div
      className={`editorial-cover ${entry.section} ${detail ? "detail-cover" : ""}`}
      aria-hidden="true"
    >
      <img
        className="editorial-cover-logo"
        src={`/assets/pen-v1/logo-${entry.section === "news" ? "dark" : "light"}.svg`}
        width="144"
        height="52"
        alt=""
      />
      <span className="editorial-cover-title">{entry.thumbnailTitle}</span>
      <span className="editorial-cover-edition">
        OathFront /{" "}
        {entry.section === "news" ? "Editorial mock" : "Event concept"}
      </span>
    </div>
  );
}

export function EditorialPage({
  section,
  slug,
  filter: selected,
}: {
  section: EditorialSection;
  slug?: string;
  filter?: string;
}) {
  const isNews = section === "news";
  const filter = editorialFilter(section, selected);
  const base = `/${section}`;
  const back = `${base}${filter === editorialFilters[section][0].id ? "" : `?category=${filter}`}`;
  if (slug) {
    const entry = findEditorial(section, slug);
    if (!entry) return null;
    return (
      <article
        className="campaign-editorial-detail campaign-paper"
        data-pen-node={isNews ? "x67YO7" : "di6Pk"}
      >
        <Link className="editorial-back" href={back}>
          ← All {section}
        </Link>
        <p className="kicker">
          {entry.category} / {isNews ? "Editorial mock" : "Event concept"}
        </p>
        <h1>{entry.title}</h1>
        <p className="editorial-detail-intro">{entry.detailIntro}</p>
        <EditorialCover entry={entry} detail />
        <h2>{entry.sectionHeading}</h2>
        {entry.paragraphs.map((paragraph, i) => (
          <p key={i} className="editorial-paragraph">
            {paragraph}
          </p>
        ))}
        <p className="editorial-disclaimer">
          {isNews
            ? "Mock article for design review. Not a published update."
            : "Mock event only. Registration is not available."}
        </p>
      </article>
    );
  }
  const entries = filterEditorial(section, filter);
  return (
    <div
      className={`campaign-editorial ${section}`}
      data-pen-node={isNews ? "BsnWN" : "QXjQb"}
    >
      <section
        className="editorial-masthead campaign-paper"
        data-campaign-reveal
      >
        <div>
          <p className="kicker">
            {isNews
              ? "Dispatches from the Fivefold"
              : "Come together in the Fivefold"}
          </p>
          <h1>{isNews ? "Latest news" : "Events"}</h1>
          <p>
            {isNews
              ? "Stories, design notes and updates from OathFront."
              : "Community moments, creative challenges and playtest stories."}
          </p>
        </div>
        <div className="editorial-masthead-art" aria-hidden="true">
          <CampaignArtwork
            className="contain"
            src="/assets/rivals-v2/heroes/aster/bust.webp"
            alt=""
          />
          <CampaignArtwork
            className="contain"
            src="/assets/rivals-v2/heroes/vesper/bust.webp"
            alt=""
          />
        </div>
      </section>
      <section
        className="editorial-list-section"
        aria-label={isNews ? "News articles" : "Event concepts"}
      >
        <nav
          className="campaign-filters editorial-filters"
          aria-label={`${isNews ? "News" : "Events"} categories`}
        >
          {editorialFilters[section].map((item) => (
            <Link
              key={item.id}
              href={`${base}${item.id === editorialFilters[section][0].id ? "" : `?category=${item.id}`}`}
              scroll={false}
              aria-current={item.id === filter ? "true" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {entries.length ? (
          <div className="editorial-grid">
            {entries.map((entry) => (
              <Link
                key={entry.slug}
                className="editorial-card"
                href={`${base}/${entry.slug}?category=${filter}`}
                aria-label={entry.title}
              >
                <EditorialCover entry={entry} />
                <div className="editorial-card-copy">
                  <p className="kicker">{entry.category} / Mock</p>
                  <h2>{entry.title}</h2>
                  <p>{entry.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="editorial-empty" role="status">
            <h2>No {isNews ? "articles" : "events"} in this category yet.</h2>
            <p>This editorial preview contains sample content only.</p>
            <Link className="campaign-button" href={base} scroll={false}>
              Show all {section}
            </Link>
          </div>
        )}
        <div className="editorial-list-note">
          <p>
            {isNews
              ? "EDITORIAL PREVIEW · All articles are mock content."
              : "CONCEPT ONLY · Mock events. No dates, registration or rewards are announced."}
          </p>
          <span aria-label="Page 1 of 1">1</span>
        </div>
      </section>
    </div>
  );
}
