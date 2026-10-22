import type { Pool } from "@oathfront/db";
import type { EventSummary, NewsCategory } from "@oathfront/contracts";
import { checked, HttpError, output } from "../http.js";
import type { FastifyInstance } from "fastify";

interface PostRow {
  slug: string;
  title: string;
  excerpt: string;
  body: unknown;
  category: string;
  art_key: string;
  publish_at: Date;
  revision: number;
}
interface EventRow {
  id: string;
  slug: string;
  season_id: string;
  ordinal: number;
  title: string;
  summary: string;
  starts_at: Date;
  ends_at: Date;
  reveal_at: Date;
  featured_card_id: string;
  featured_hero_id: string;
  systems: unknown;
  rewards: unknown;
}
function newsSummary(row: PostRow) {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.excerpt,
    category: row.category,
    artKey: row.art_key,
    publishedAt: row.publish_at.toISOString(),
    revision: row.revision,
  };
}
export function eventSummary(row: EventRow, time: Date): EventSummary {
  const revealed = +time >= +row.reveal_at;
  return output("EventSummary", {
    id: row.id,
    slug: row.slug,
    seasonId: row.season_id,
    week: row.ordinal,
    title: revealed ? row.title : `Week ${row.ordinal} · Awaiting reveal`,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    revealAt: row.reveal_at.toISOString(),
    status:
      +time < +row.starts_at
        ? "UPCOMING"
        : +time < +row.ends_at
          ? "ACTIVE"
          : "ENDED",
    revealed,
    cardId: revealed ? row.featured_card_id : null,
  });
}
export function liveContentReader(db: Pool, now: () => Date) {
  return {
    async news(category?: NewsCategory) {
      const time = now();
      const rows = (
        await db.query<PostRow>(
          "SELECT * FROM editorial_posts WHERE state IN ('SCHEDULED','PUBLISHED') AND publish_at<=$1 AND ($2::text IS NULL OR category=$2) ORDER BY publish_at DESC,slug LIMIT 100",
          [time, category ?? null],
        )
      ).rows;
      return output("NewsList", {
        serverNow: time.toISOString(),
        items: rows.map(newsSummary),
      });
    },
    async article(slug: string) {
      const rows = (
        await db.query<PostRow>(
          "SELECT * FROM editorial_posts WHERE slug=$1 AND state IN ('SCHEDULED','PUBLISHED') AND publish_at<=$2",
          [slug, now()],
        )
      ).rows;
      const row = rows[0];
      if (!row) throw new HttpError(404, "NOT_FOUND");
      return output("NewsPost", { ...newsSummary(row), sections: row.body });
    },
    async events() {
      const time = now(),
        rows = (
          await db.query<EventRow>(
            "SELECT * FROM weekly_events WHERE state='PUBLISHED' ORDER BY starts_at,id LIMIT 12",
          )
        ).rows;
      return output("EventList", {
        serverNow: time.toISOString(),
        seasonTitle: "First Light, Long Shadows",
        items: rows.map((row) => eventSummary(row, time)),
      });
    },
    async event(slug: string) {
      const time = now(),
        row = (
          await db.query<EventRow>(
            "SELECT * FROM weekly_events WHERE slug=$1 AND state='PUBLISHED'",
            [slug],
          )
        ).rows[0];
      if (!row) throw new HttpError(404, "NOT_FOUND");
      const event = eventSummary(row, time),
        scenarios = (
          await db.query<{
            id: string;
            day_index: number;
            title: string;
            description: string;
            arena_key: string;
          }>(
            "SELECT id,day_index,title,description,arena_key FROM event_scenarios WHERE event_id=$1 ORDER BY day_index",
            [row.id],
          )
        ).rows;
      return output("EventDetail", {
        serverNow: time.toISOString(),
        event,
        description: event.revealed ? row.summary : null,
        featuredHeroId: event.revealed ? row.featured_hero_id : null,
        systems: event.revealed ? row.systems : [],
        rewards: row.rewards,
        scenarios: scenarios.map((s) => {
          const startsAt = new Date(+row.starts_at + s.day_index * 86400000),
            endsAt = new Date(+startsAt + 86400000);
          return {
            id: s.id,
            dayIndex: s.day_index,
            title: s.title,
            description: s.description,
            arenaKey: s.arena_key,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            canPractice: event.revealed && +time >= +startsAt,
            rewardOpen: +time >= +startsAt && +time < +endsAt,
          };
        }),
      });
    },
  };
}
export function registerLiveReadRoutes(
  app: FastifyInstance,
  db: Pool,
  now: () => Date,
) {
  const read = liveContentReader(db, now);
  app.get("/api/v1/news", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    return read.news(checked("NewsQuery", req.query).category);
  });
  app.get("/api/v1/news/:slug", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    return read.article(checked("LiveSlugParams", req.params).slug);
  });
  app.get("/api/v1/events", async (_req, reply) => {
    reply.header("Cache-Control", "no-store");
    return read.events();
  });
  app.get("/api/v1/events/:slug", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    return read.event(checked("LiveSlugParams", req.params).slug);
  });
}
