import { expect, it } from "vitest";
import { createApiClient } from "../src/features/match/api-client";
import {
  countdownLabel,
  readDailyIntent,
  pendingDailyKey,
  eventCategory,
  dateLabel,
} from "../src/features/events/model";

it("reads published content using encoded paths and keeps daily creation separate from match journals", async () => {
  const seen: { url: string; body: unknown }[] = [];
  const api = createApiClient({
    fetcher: async (input, init) => {
      seen.push({
        url: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return Response.json({ serverNow: "2026-10-26T00:00:00Z", items: [] });
    },
  });
  await api.news("GUIDE");
  await api.newsPost("article/name").catch(() => {});
  await api.weeklyEvents().catch(() => {});
  await api.weeklyEvent("week/one").catch(() => {});
  await api.weeklyProgress("week/one").catch(() => {});
  const request = {
    commandId: "00000000-0000-4000-8000-000000000001",
    scenarioId: "season01-week01-day1",
    practice: true,
  };
  await api.createDaily(request).catch(() => {});
  expect(seen.map((x) => x.url)).toEqual([
    "/api/v1/news?category=GUIDE",
    "/api/v1/news/article%2Fname",
    "/api/v1/events",
    "/api/v1/events/week%2Fone",
    "/api/v1/events/week%2Fone/progress",
    "/api/v1/events/daily-matches",
  ]);
  expect(seen.at(-1)?.body).toEqual(request);
});
it("uses server-relative countdown boundaries and validates persisted exact daily intents", () => {
  expect(
    countdownLabel("2026-10-26T02:00:00Z", Date.parse("2026-10-26T01:00:01Z")),
  ).toBe("1h");
  expect(
    countdownLabel("2026-10-26T02:00:00Z", Date.parse("2026-10-26T02:00:00Z")),
  ).toBe("Ready");
  expect(dateLabel("2026-10-26T00:00:00Z")).toContain("Oct 26, 2026");
  expect(eventCategory("archive")).toBe("ENDED");
  expect(eventCategory("unknown")).toBe("ALL");
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  storage.setItem(
    pendingDailyKey,
    JSON.stringify({
      request: { commandId: "bad", scenarioId: "x", practice: true },
      eventSlug: "x",
    }),
  );
  expect(readDailyIntent(storage)).toBeNull();
  const intent = {
    request: {
      commandId: "00000000-0000-4000-8000-000000000001",
      scenarioId: "season01-week01-day1",
      practice: true,
    },
    eventSlug: "first-light-week-01",
  };
  storage.setItem(pendingDailyKey, JSON.stringify(intent));
  expect(readDailyIntent(storage)).toEqual(intent);
});
import { launchPosts } from "../../../packages/game-content/src/events/editorial";
import { resolveArt } from "../src/features/match/rendering/asset-manifest";
import { existsSync } from "node:fs";
it("resolves every authored news illustration to a shipped image", () => {
  for (const post of launchPosts)
    expect(
      existsSync(
        `apps/web/public${resolveArt(post.artKey, post.title, "inspect").src}`,
      ),
      post.artKey,
    ).toBe(true);
});
