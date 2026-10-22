import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { coreCatalog, heroesCatalog } from "@oathfront/game-content";
import type { PublicCatalog } from "@oathfront/contracts";
import { validateWire } from "@oathfront/contracts";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
it("serves two immutable catalogs with closed version-specific counts and IDs", async () => {
  const old = await h.app.inject({ url: "/api/v1/catalog/core_v1" });
  const current = await h.app.inject({ url: "/api/v1/catalog/heroes_v1" });
  expect(old.statusCode).toBe(200);
  expect(current.statusCode).toBe(200);
  expect(old.json().heroes).toHaveLength(6);
  expect(current.json().heroes).toHaveLength(20);
  expect(current.json().powers).toHaveLength(32);
  expect(current.json().presets).toHaveLength(20);
  expect(old.json().sha256).toBe(
    "37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc",
  );
  expect(current.headers["cache-control"]).toContain("immutable");
  expect(validateWire("PublicCatalog", current.json())).toBe(true);
  expect(
    validateWire("PublicCatalog", {
      ...current.json<PublicCatalog>(),
      version: "core_v1",
    }),
  ).toBe(false);
  const corrupt = old.json();
  corrupt.heroes[0].id = "H_G_SOL";
  expect(validateWire("PublicCatalog", corrupt)).toBe(false);
  expect(
    (await h.app.inject({ url: "/api/v1/catalog/unknown" })).statusCode,
  ).toBe(404);
});
it.each(["H_G_SOL", "H_E_VAN"])(
  "saves %s, creates a match, reloads its version and replays the exact receipt",
  async (heroId) => {
    const g = await h.guest(),
      preset = heroesCatalog.presets.find((p) => p.heroId === heroId)!;
    const deck = {
      name: preset.name,
      heroId,
      entries: preset.entries,
      contentVersion: "heroes_v1",
    };
    const saved = await h.app.inject({
      method: "POST",
      url: "/api/v1/decks",
      headers: h.headers(g),
      payload: { commandId: randomUUID(), deck },
    });
    expect(saved.statusCode).toBe(201);
    expect(saved.json().validation.playable).toBe(true);
    const payload = {
      ...createBody(),
      expectedContentVersion: "heroes_v1",
      opponentHeroId: heroId === "H_G_SOL" ? "H_E_VAN" : "H_G_SOL",
      deck: { kind: "SAVED", deckId: saved.json().id, deckRevision: 1 },
    };
    const request = {
      method: "POST" as const,
      url: "/api/v1/matches",
      headers: h.headers(g),
      payload,
    };
    const made = await h.app.inject(request);
    expect(made.statusCode).toBe(201);
    expect(made.json().view.versions.content).toBe("heroes_v1");
    expect((await h.app.inject(request)).json()).toEqual(made.json());
    const loaded = await h.app.inject({
      url: `/api/v1/matches/${made.json().view.matchId}`,
      headers: h.headers(g),
    });
    expect(loaded.statusCode).toBe(200);
    expect(loaded.json().view.versions.content).toBe("heroes_v1");
    const list = await h.app.inject({
      url: "/api/v1/decks",
      headers: h.headers(g),
    });
    expect(list.json().presets).toHaveLength(20);
    const matchId = made.json().view.matchId;
    const command = await h.app.inject({
      method: "POST",
      url: `/api/v1/matches/${matchId}/commands`,
      headers: h.headers(g),
      payload: {
        commandId: randomUUID(),
        expectedRevision: 0,
        action: { kind: "MULLIGAN", cardInstanceIds: [] },
      },
    });
    expect(command.statusCode).toBe(200);
    const replayed = await h.app.services.repository.replayMatch(g.id, matchId);
    const stored = await h.app.services.repository.loadMatch(g.id, matchId);
    expect(replayed.finalState).toEqual(stored.state);
    expect(stored.rematch).toMatchObject({ expectedContentVersion: "heroes_v1" });
  },
);
it("uses an old saved revision in a new match without rewriting its identity or version", async () => {
  const g = await h.guest(),
    p = coreCatalog.presets[0]!;
  const deck = {
    name: "Legacy",
    heroId: p.heroId,
    entries: p.entries,
    contentVersion: "core_v1",
  };
  const saved = await h.app.inject({
    method: "POST",
    url: "/api/v1/decks",
    headers: h.headers(g),
    payload: { commandId: randomUUID(), deck },
  });
  const id = saved.json().id;
  const before = (
    await h.owner.query("SELECT * FROM deck_versions WHERE deck_id=$1", [id])
  ).rows;
  const made = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: {
      ...createBody(),
      expectedContentVersion: "heroes_v1",
      opponentHeroId: "H_E_NYX",
      deck: { kind: "SAVED", deckId: id, deckRevision: 1 },
    },
  });
  expect(made.statusCode).toBe(201);
  expect(
    (await h.owner.query("SELECT * FROM deck_versions WHERE deck_id=$1", [id]))
      .rows,
  ).toEqual(before);
  const snapshot = (
    await h.owner.query(
      "SELECT deck_snapshots FROM match_initializations WHERE match_id=$1",
      [made.json().view.matchId],
    )
  ).rows[0].deck_snapshots;
  expect(snapshot.GOOD.contentVersion).toBe("core_v1");
});
it("rejects expansion IDs when bound to core_v1 without an internal error or match write", async () => {
  const g = await h.guest();
  for (const body of [
    { ...createBody(), opponentHeroId: "H_E_VAN" },
    { ...createBody(), deck: { kind: "PRESET", presetId: "D_G_SOL" } },
  ]) {
    const r = await h.app.inject({
      method: "POST",
      url: "/api/v1/matches",
      headers: h.headers(g),
      payload: body,
    });
    expect([404, 422]).toContain(r.statusCode);
  }
  const p = heroesCatalog.presets.find((p) => p.heroId === "H_G_SOL")!;
  const saved = await h.app.inject({
    method: "POST",
    url: "/api/v1/decks",
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      deck: {
        name: "Invalid",
        heroId: p.heroId,
        entries: p.entries,
        contentVersion: "core_v1",
      },
    },
  });
  expect(saved.statusCode).toBe(422);
  expect((await h.owner.query("SELECT id FROM matches")).rowCount).toBe(0);
});
