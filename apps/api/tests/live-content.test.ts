import { beforeEach, expect, it } from "vitest";
import { harness } from "./http-helpers.js";
import { seedLiveFixture } from "./live-content-fixture.js";
const h = harness();
beforeEach(() => seedLiveFixture(h.owner));
it("serves real articles only at their publication instant and retains honest legacy news slugs", async () => {
  h.setTime(new Date("2026-10-22T12:29:59Z"));
  let response = await h.app.inject({ url: "/api/v1/news" });
  expect(response.statusCode).toBe(200);
  expect(response.json().items).toHaveLength(0);
  h.setTime(new Date("2026-10-22T12:30:00Z"));
  response = await h.app.inject({ url: "/api/v1/news" });
  expect(response.json().items).toHaveLength(6);
  const detail = await h.app.inject({
    url: "/api/v1/news/two-sides-one-battlefield",
  });
  expect(detail.statusCode).toBe(200);
  expect(detail.json().sections[0].paragraphs[0]).toContain("October 26, 2026");
  expect(
    (await h.app.inject({ url: "/api/v1/news/first-light-week-01" }))
      .statusCode,
  ).toBe(404);
  h.setTime(new Date("2026-10-26T00:00:00Z"));
  expect(
    (await h.app.inject({ url: "/api/v1/news" })).json().items,
  ).toHaveLength(7);
  expect(
    (await h.app.inject({ url: "/api/v1/news?category=GUIDE" })).json().items,
  ).toHaveLength(2);
  expect(
    (await h.app.inject({ url: "/api/v1/news/no-such-story" })).statusCode,
  ).toBe(404);
});
it("reveals one card per week without leaking future titles, art or featured systems", async () => {
  h.setTime(new Date("2026-10-25T23:59:59Z"));
  let response = await h.app.inject({ url: "/api/v1/events" });
  expect(response.statusCode).toBe(200);
  expect(response.json().items).toHaveLength(12);
  expect(
    response
      .json()
      .items.every(
        (e: { cardId: unknown; revealed: boolean }) =>
          !e.revealed && e.cardId === null,
      ),
  ).toBe(true);
  let detail = await h.app.inject({
    url: "/api/v1/events/first-light-week-01",
  });
  expect(detail.json()).toMatchObject({
    description: null,
    featuredHeroId: null,
    systems: [],
  });
  expect(detail.json().event.title).not.toContain("Sentinel");
  expect(
    detail
      .json()
      .scenarios.every((s: { canPractice: boolean }) => !s.canPractice),
  ).toBe(true);
  h.setTime(new Date("2026-10-26T00:00:00Z"));
  detail = await h.app.inject({ url: "/api/v1/events/first-light-week-01" });
  expect(detail.json().event).toMatchObject({
    status: "ACTIVE",
    revealed: true,
    cardId: "E01",
  });
  expect(
    detail
      .json()
      .scenarios.filter((s: { rewardOpen: boolean }) => s.rewardOpen),
  ).toHaveLength(1);
  expect(detail.json().scenarios[0]).toMatchObject({
    canPractice: true,
    rewardOpen: true,
    startsAt: "2026-10-26T00:00:00.000Z",
    endsAt: "2026-10-27T00:00:00.000Z",
  });
  const future = await h.app.inject({
    url: "/api/v1/events/first-light-week-02",
  });
  expect(future.json().event.cardId).toBeNull();
  expect(JSON.stringify(future.json())).not.toContain("Moonpetal Keeper");
  h.setTime(new Date("2027-01-18T00:00:00Z"));
  response = await h.app.inject({ url: "/api/v1/events" });
  expect(
    response
      .json()
      .items.every((e: { status: string }) => e.status === "ENDED"),
  ).toBe(true);
  expect(
    (await h.app.inject({ url: "/api/v1/events/missing-week" })).statusCode,
  ).toBe(404);
});
