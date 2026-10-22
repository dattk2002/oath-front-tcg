import { expect, it } from "vitest";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
it("conceals cross-owner resources and enforces exact Origin, CSRF and closed command schema", async () => {
  const g = await h.guest(),
    other = await h.guest();
  const created = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const id = created.json().view.matchId;
  for (const path of ["", "/summary", "/events?afterSeq=0&throughSeq=1"])
    expect(
      (
        await h.app.inject({
          url: `/api/v1/matches/${id}${path}`,
          headers: h.headers(other),
        })
      ).statusCode,
    ).toBe(404);
  for (const headers of [
    { ...h.headers(g), origin: "https://oathfront.test.evil" },
    { ...h.headers(g), "x-csrf-token": "a".repeat(64) },
  ])
    expect(
      (
        await h.app.inject({
          method: "POST",
          url: "/api/v1/matches",
          headers,
          payload: createBody(),
        })
      ).statusCode,
    ).toBe(403);
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: "/api/v1/matches",
        headers: h.headers(g),
        payload: { ...createBody(), seed: "private" },
      })
    ).statusCode,
  ).toBe(400);
});
it("returns valid presentation catalog and presets, health, history and rejects malformed queries", async () => {
  expect((await h.app.inject({ url: "/health/live" })).json()).toEqual({
    status: "ok",
  });
  expect((await h.app.inject({ url: "/health/ready" })).statusCode).toBe(200);
  const catalog = await h.app.inject({ url: "/api/v1/catalog/core_v1" });
  expect(catalog.statusCode).toBe(200);
  expect(catalog.json().cards).toHaveLength(60);
  expect(catalog.json().heroes).toHaveLength(6);
  expect(catalog.body).not.toContain("effects");
  const g = await h.guest();
  expect(
    (await h.app.inject({ url: "/api/v1/decks", headers: h.headers(g) })).json()
      .presets,
  ).toHaveLength(20);
  for (const query of ["limit=0", "limit=1.2", "cursor=invalid", "unknown=x"])
    expect(
      (
        await h.app.inject({
          url: "/api/v1/matches?" + query,
          headers: h.headers(g),
        })
      ).statusCode,
    ).toBe(400);
});
