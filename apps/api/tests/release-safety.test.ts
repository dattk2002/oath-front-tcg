import { it, expect } from "vitest";
import {
  checkSupportedVersions,
  supportedRegistry,
} from "../src/maintenance/versions.js";
import { buildApp } from "../src/app.js";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
it("blocks an unsupported active rules version and missing tutorial binding while ignoring terminal rows", () => {
  const match = {
    id: "test",
    status: "ACTIVE",
    rules: "rules_v1",
    content: "core_v1",
    locations: "locations_v1",
    bot: "bot_v1",
    scenarioId: null,
    manifestHash: null,
    manifestVersion: null,
  };
  expect(
    checkSupportedVersions(supportedRegistry, [
      { ...match, rules: "future_rules" },
    ]).canRelease,
  ).toBe(false);
  expect(
    checkSupportedVersions(supportedRegistry, [
      { ...match, status: "COMPLETED", rules: "future_rules" },
    ]).canRelease,
  ).toBe(true);
  expect(
    checkSupportedVersions(supportedRegistry, [
      {
        ...match,
        scenarioId: "tutorial_v1",
        manifestHash: "0".repeat(64),
        manifestVersion: "tutorial_v1",
      },
    ]).canRelease,
  ).toBe(false);
});
it("keeps private responses no-store, hides owners and secrets, bounds bodies, requires same-origin CSRF, and expires sessions", async () => {
  const g = await h.guest(),
    other = await h.guest();
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  expect(r.headers["cache-control"]).toBe("no-store");
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${r.json().view.matchId}`,
        headers: h.headers(other),
      })
    ).statusCode,
  ).toBe(404);
  for (const headers of [
    { ...h.headers(g), origin: "https://evil.test" },
    { ...h.headers(g), "x-csrf-token": "wrong" },
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
  const huge = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: { secret: "CANARY_SECRET".repeat(4000) },
  });
  expect(huge.statusCode).toBe(400);
  expect(huge.body).not.toContain("CANARY_SECRET");
  h.setTime(new Date(+new Date(g.r.json().principal.expiresAt) + 1));
  expect(
    (await h.app.inject({ url: "/api/v1/session", headers: h.headers(g) }))
      .statusCode,
  ).toBe(401);
});
it("readiness blocks a rollout that drops an active pinned version", async () => {
  const g = await h.guest();
  await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const next = buildApp({
    pool: h.pool,
    origin: "https://oathfront.test",
    secret: "a".repeat(64),
    versionRegistry: { ...supportedRegistry, rules: [] },
  });
  expect(
    await next.ready().then(
      () => null,
      (error: Error) => error.message,
    ),
  ).toBe("VERSION_UNSUPPORTED");
  await next.close();
});
