import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
it("retains owner-only rematch summary after details deletion and expires at 180 days", async () => {
  const g = await h.guest(),
    body = createBody();
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: body,
  });
  expect(r.statusCode).toBe(201);
  const id = r.json().view.matchId;
  const ended = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "SURRENDER" },
    },
  });
  expect(ended.statusCode).toBe(200);
  await h.owner.query("DELETE FROM match_checkpoints WHERE match_id=$1", [id]);
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${id}`,
        headers: h.headers(g),
      })
    ).statusCode,
  ).toBe(410);
  const summary = await h.app.inject({
    url: `/api/v1/matches/${id}/summary`,
    headers: h.headers(g),
  });
  expect(summary.statusCode).toBe(200);
  expect(summary.json().rematch).toEqual({
    deck: body.deck,
    opponentHeroId: "H_E_FX",
    difficulty: "EASY",
    expectedContentVersion: "core_v1",
  });
  await h.owner.query(
    "UPDATE match_results SET expires_at=now()-interval '1 minute' WHERE match_id=$1",
    [id],
  );
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${id}/summary`,
        headers: h.headers(g),
      })
    ).statusCode,
  ).toBe(404);
});
it("enforces detail retention deadlines before maintenance physically deletes rows", async () => {
  const g = await h.guest();
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const id = r.json().view.matchId;
  await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "SURRENDER" },
    },
  });
  await h.owner.query(
    "UPDATE matches SET details_expires_at=now()-interval '1 minute' WHERE id=$1",
    [id],
  );
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${id}`,
        headers: h.headers(g),
      })
    ).statusCode,
  ).toBe(410);
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${id}/summary`,
        headers: h.headers(g),
      })
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${id}/events?afterSeq=0&throughSeq=1`,
        headers: h.headers(g),
      })
    ).json().error.code,
  ).toBe("LOG_EXPIRED");
});
it("retains the exact saved deck revision rather than substituting a preset for rematch", async () => {
  const { coreCatalog } = await import("@oathfront/game-content");
  const p = coreCatalog.presets[0]!,
    g = await h.guest(),
    deckId = randomUUID();
  await h.owner.query(
    "INSERT INTO decks(id,owner_id,name,hero_id,current_revision) VALUES($1,$2,$3,$4,2)",
    [deckId, g.id, p.name, p.heroId],
  );
  for (const revision of [1, 2])
    await h.owner.query(
      "INSERT INTO deck_versions(deck_id,revision,content_version,hero_id,entries,validation_status) VALUES($1,$2,'core_v1',$3,$4,'PLAYABLE')",
      [deckId, revision, p.heroId, JSON.stringify(p.entries)],
    );
  const body = {
    ...createBody(),
    deck: { kind: "SAVED", deckId, deckRevision: 1 },
  };
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: body,
  });
  expect(r.statusCode).toBe(201);
  const id = r.json().view.matchId;
  await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "SURRENDER" },
    },
  });
  await h.owner.query("DELETE FROM match_checkpoints WHERE match_id=$1", [id]);
  const summary = await h.app.inject({
    url: `/api/v1/matches/${id}/summary`,
    headers: h.headers(g),
  });
  expect(summary.statusCode).toBe(200);
  expect(summary.json().rematch.deck).toEqual({
    kind: "SAVED",
    deckId,
    deckRevision: 1,
  });
});
