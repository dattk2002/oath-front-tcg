import type { Pool } from "@oathfront/db";
import { seasonOne, seasonScenarios } from "@oathfront/game-content/events";
import { editorialPosts } from "@oathfront/game-content/editorial";
/** Owner-only fixture. Production import is a separate validated administrative operation. */
export async function seedLiveFixture(db: Pool) {
  for (const p of editorialPosts)
    await db.query(
      "INSERT INTO editorial_posts(slug,revision,title,excerpt,body,category,art_key,state,publish_at,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        p.slug,
        p.revision,
        p.title,
        p.excerpt,
        JSON.stringify(p.body),
        p.category,
        p.artKey,
        p.state,
        p.publishAt,
        p.sha256,
      ],
    );
  for (const w of seasonOne)
    await db.query(
      "INSERT INTO weekly_events(id,season_id,ordinal,slug,title,summary,starts_at,ends_at,reveal_at,featured_card_id,featured_hero_id,systems,rewards,revision,state,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",
      [
        w.id,
        w.seasonId,
        w.ordinal,
        w.slug,
        w.title,
        w.summary,
        w.startsAt,
        w.endsAt,
        w.revealAt,
        w.featuredCardId,
        w.featuredHeroId,
        JSON.stringify(w.systems),
        JSON.stringify(w.rewards),
        w.revision,
        w.state,
        w.sha256,
      ],
    );
  for (const s of seasonScenarios)
    await db.query(
      "INSERT INTO event_scenarios(id,event_id,day_index,title,description,arena_key,content_version,manifest,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        s.id,
        s.eventId,
        s.dayIndex,
        s.title,
        s.description,
        s.arenaKey,
        s.contentVersion,
        JSON.stringify(s.manifest),
        s.sha256,
      ],
    );
}
