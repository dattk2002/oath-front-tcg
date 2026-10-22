"use client";
import Link from "next/link";
import type { ApiClient } from "../match/api-client";
import type { NewsSummary } from "@oathfront/contracts/browser";
import { useLiveRead } from "../content/use-live-read";
import { dateLabel, newsCategory } from "../events/model";
import { CampaignArtwork } from "./CampaignArtwork";
import { resolveArt } from "../match/rendering/asset-manifest";
import { ApiError } from "../match/api-error";
export function NewsCard({
  entry,
  home = false,
}: {
  entry: NewsSummary;
  home?: boolean;
}) {
  const art = resolveArt(entry.artKey, entry.title, "inspect");
  return (
    <Link
      href={`/news/${entry.slug}`}
      className={
        home
          ? "home-story-card editorial-card"
          : "editorial-card live-news-card"
      }
    >
      <CampaignArtwork
        className={home ? "home-story-art" : "live-news-art"}
        src={art.src}
        alt=""
      />
      <div className="editorial-card-copy">
        <p className="kicker">
          {entry.category} ·{" "}
          <time dateTime={entry.publishedAt}>
            {dateLabel(entry.publishedAt)}
          </time>
        </p>
        <h2>
          {entry.title}
          <span aria-hidden="true"> ↗</span>
        </h2>
        <p>{entry.summary}</p>
      </div>
    </Link>
  );
}
export function HomeNews({ api }: { api: ApiClient }) {
  const read = useLiveRead("home-news", () => api.news());
  return (
    <div>
      {read.error ? (
        <ReadError retry={read.refresh} label="Stories could not be loaded." />
      ) : !read.data ? (
        <p role="status">Loading stories…</p>
      ) : !read.data.items.length ? (
        <p>
          No published stories yet. Check back for dispatches from the Fivefold.
        </p>
      ) : (
        <div className="home-story-grid">
          {read.data.items.slice(0, 3).map((entry) => (
            <NewsCard key={entry.slug} entry={entry} home />
          ))}
        </div>
      )}
    </div>
  );
}
export function ReadError({
  retry,
  label,
}: {
  retry: () => void;
  label: string;
}) {
  return (
    <div className="live-read-error" role="alert">
      <p>{label}</p>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}
export function LiveNews({
  api,
  slug,
  filter,
}: {
  api: ApiClient;
  slug?: string | undefined;
  filter?: string | undefined;
}) {
  return slug ? (
    <NewsArticle key={slug} api={api} slug={slug} />
  ) : (
    <NewsIndex api={api} filter={filter} />
  );
}
function NewsArticle({ api, slug }: { api: ApiClient; slug: string }) {
  const read = useLiveRead(`news:${slug}`, () => api.newsPost(slug));
  const missing = read.error instanceof ApiError && read.error.status === 404;
  return (
    <article
      className="campaign-editorial-detail live-article"
      data-pen-node="x67YO7"
    >
      <Link className="editorial-back" href="/news">
        ← All news
      </Link>
      {missing ? (
        <>
          <h1>Article not found</h1>
          <p>This story is not published or no longer exists.</p>
        </>
      ) : read.error ? (
        <ReadError
          retry={read.refresh}
          label="This story could not be loaded."
        />
      ) : !read.data ? (
        <p role="status">Loading story…</p>
      ) : (
        <>
          <p className="kicker">
            {read.data.category} ·{" "}
            <time dateTime={read.data.publishedAt}>
              {dateLabel(read.data.publishedAt)}
            </time>
          </p>
          <h1>{read.data.title}</h1>
          <p className="editorial-detail-intro">{read.data.summary}</p>
          <CampaignArtwork
            className="live-article-art"
            src={resolveArt(read.data.artKey, read.data.title, "inspect").src}
            alt=""
            retry
          />
          {read.data.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((p, i) => (
                <p className="editorial-paragraph" key={i}>
                  {p}
                </p>
              ))}
            </section>
          ))}
        </>
      )}
    </article>
  );
}
function NewsIndex({
  api,
  filter,
}: {
  api: ApiClient;
  filter?: string | undefined;
}) {
  const category = newsCategory(filter);
  const read = useLiveRead(`news:${category ?? "ALL"}`, () =>
    api.news(category),
  );
  return (
    <div className="campaign-editorial news" data-pen-node="BsnWN">
      <header className="editorial-masthead live-masthead">
        <div>
          <p className="kicker">Dispatches from the Fivefold</p>
          <h1>Latest news</h1>
          <p>Updates, design notes and field guides from OathFront.</p>
        </div>
      </header>
      <section className="editorial-list-section" aria-label="News articles">
        <nav
          className="campaign-filters editorial-filters"
          aria-label="News categories"
        >
          {[
            ["", "Latest"],
            ["news", "News"],
            ["updates", "Updates"],
            ["guides", "Guides"],
            ["events", "Events"],
          ].map(([id, label]) => (
            <Link
              key={id}
              href={`/news${id ? `?category=${id}` : ""}`}
              scroll={false}
              aria-current={category === newsCategory(id) ? "true" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        {read.error ? (
          <ReadError retry={read.refresh} label="News could not be loaded." />
        ) : !read.data ? (
          <p role="status">Loading news…</p>
        ) : !read.data.items.length ? (
          <div className="editorial-empty">
            <h2>No published articles in this category yet.</h2>
            <Link href="/news">All news</Link>
          </div>
        ) : (
          <div className="editorial-grid">
            {read.data.items.map((entry) => (
              <NewsCard key={entry.slug} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
