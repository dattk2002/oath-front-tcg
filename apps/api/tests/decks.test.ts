import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { coreCatalog } from "@oathfront/game-content";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
const input = () => {
  const p = coreCatalog.presets[0]!;
  return {
    name: "  Vườn của tôi  ",
    heroId: p.heroId,
    contentVersion: p.contentVersion,
    entries: structuredClone(p.entries),
  };
};
it("guest saves a draft, completes 30 cards and preserves immutable match snapshots", async () => {
  const g = await h.guest();
  const deck = input();
  deck.entries.pop();
  const save = await h.app.inject({
    method: "POST",
    url: "/api/v1/decks",
    headers: h.headers(g),
    payload: { commandId: randomUUID(), deck },
  });
  expect(save.statusCode).toBe(201);
  const draft = save.json();
  expect(draft.validation.playable).toBe(false);
  expect(draft.name).toBe("Vườn của tôi");
  const denied = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: {
      ...createBody(),
      deck: { kind: "SAVED", deckId: draft.id, deckRevision: 1 },
    },
  });
  expect(denied.statusCode).toBe(422);
  const update = await h.app.inject({
    method: "PUT",
    url: `/api/v1/decks/${draft.id}`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedDeckRevision: 1,
      deck: input(),
    },
  });
  expect(update.statusCode).toBe(200);
  expect(update.json().validation.playable).toBe(true);
  const made = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: {
      ...createBody(),
      deck: { kind: "SAVED", deckId: draft.id, deckRevision: 2 },
    },
  });
  expect(made.statusCode).toBe(201);
  const id = made.json().view.matchId;
  const before = (
    await h.owner.query(
      "SELECT deck_snapshots FROM match_initializations WHERE match_id=$1",
      [id],
    )
  ).rows[0];
  const edited = await h.app.inject({
    method: "PUT",
    url: `/api/v1/decks/${draft.id}`,
    headers: h.headers(g),
    payload: { commandId: randomUUID(), expectedDeckRevision: 2, deck },
  });
  expect(edited.statusCode).toBe(200);
  expect(
    (
      await h.owner.query(
        "SELECT deck_snapshots FROM match_initializations WHERE match_id=$1",
        [id],
      )
    ).rows[0],
  ).toEqual(before);
  const old = await h.app.inject({
    url: `/api/v1/decks/${draft.id}?revision=2`,
    headers: h.headers(g),
  });
  expect(old.json().validation.playable).toBe(true);
  expect(
    (
      await h.owner.query(
        "SELECT revision FROM deck_versions WHERE deck_id=$1",
        [draft.id],
      )
    ).rowCount,
  ).toBe(3);
});
it("rejects invalid class, faction, over-30 and duplicate entries while retaining closed schemas", async () => {
  const g = await h.guest();
  for (const entries of [
    [{ cardId: "EC01", quantity: 1 }],
    [{ cardId: "P01", quantity: 1 }],
    [{ cardId: "GC01", quantity: 3 }],
    [
      { cardId: "GC01", quantity: 1 },
      { cardId: "GC01", quantity: 1 },
    ],
    [...input().entries, { cardId: "GC04", quantity: 1 }],
  ]) {
    const r = await h.app.inject({
      method: "POST",
      url: "/api/v1/decks",
      headers: h.headers(g),
      payload: { commandId: randomUUID(), deck: { ...input(), entries } },
    });
    expect([400, 422]).toContain(r.statusCode);
  }
  expect((await h.owner.query("SELECT id FROM decks")).rowCount).toBe(0);
});
it("replays exact durable receipts before stale checks and rejects changed command payload", async () => {
  const g = await h.guest();
  const payload = { commandId: randomUUID(), deck: input() };
  const req = {
    method: "POST" as const,
    url: "/api/v1/decks",
    headers: h.headers(g),
    payload,
  };
  const first = await h.app.inject(req);
  expect(first.statusCode).toBe(201);
  expect((await h.app.inject(req)).json()).toEqual(first.json());
  expect(
    (
      await h.app.inject({
        ...req,
        payload: { ...payload, deck: { ...payload.deck, name: "Khác" } },
      })
    ).statusCode,
  ).toBe(409);
  const id = first.json().id;
  const put = {
    method: "PUT" as const,
    url: `/api/v1/decks/${id}`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedDeckRevision: 1,
      deck: { ...input(), name: "Sửa" },
    },
  };
  const updated = await h.app.inject(put);
  expect(updated.statusCode).toBe(200);
  expect((await h.app.inject(put)).json()).toEqual(updated.json());
  const stale = await h.app.inject({
    ...put,
    payload: { ...put.payload, commandId: randomUUID() },
  });
  expect(stale.statusCode).toBe(409);
  expect(stale.json().error.details.deck.revision).toBe(2);
});
it("conceals other owners and paginates saved decks without losing six presets", async () => {
  const g = await h.guest(),
    other = await h.guest();
  for (let n = 0; n < 3; n++)
    expect(
      (
        await h.app.inject({
          method: "POST",
          url: "/api/v1/decks",
          headers: h.headers(g),
          payload: {
            commandId: randomUUID(),
            deck: { ...input(), name: `Bộ ${n}` },
          },
        })
      ).statusCode,
    ).toBe(201);
  const one = (
    await h.app.inject({ url: "/api/v1/decks?limit=2", headers: h.headers(g) })
  ).json();
  expect(one.presets).toHaveLength(6);
  expect(one.items).toHaveLength(2);
  expect(one.nextCursor).toBeTypeOf("string");
  const two = (
    await h.app.inject({
      url: `/api/v1/decks?limit=2&cursor=${one.nextCursor}`,
      headers: h.headers(g),
    })
  ).json();
  expect(two.items).toHaveLength(1);
  expect(new Set([...one.items, ...two.items].map((d) => d.id)).size).toBe(3);
  expect(
    (
      await h.app.inject({
        url: `/api/v1/decks/${one.items[0].id}`,
        headers: h.headers(other),
      })
    ).statusCode,
  ).toBe(404);
  expect(
    (
      await h.app.inject({
        url: `/api/v1/decks?cursor=${one.nextCursor}`,
        headers: h.headers(other),
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await h.app.inject({
        url: "/api/v1/decks?cursor=invalid",
        headers: h.headers(g),
      })
    ).statusCode,
  ).toBe(400);
});
it("rejects non-owner historical reads and edits, malformed revision and serializes concurrent updates", async () => {
  const g = await h.guest(),
    other = await h.guest();
  const first = await h.app.inject({
    method: "POST",
    url: "/api/v1/decks",
    headers: h.headers(g),
    payload: { commandId: randomUUID(), deck: input() },
  });
  expect(first.statusCode).toBe(201);
  const id = first.json().id;
  expect(
    (
      await h.app.inject({
        url: `/api/v1/decks/${id}?revision=1`,
        headers: h.headers(other),
      })
    ).statusCode,
  ).toBe(404);
  expect(
    (
      await h.app.inject({
        url: `/api/v1/decks/${id}?revision=999`,
        headers: h.headers(g),
      })
    ).statusCode,
  ).toBe(404);
  for (const revision of ["0", "1.5", "no", "2147483648"])
    expect(
      (
        await h.app.inject({
          url: `/api/v1/decks/${id}?revision=${revision}`,
          headers: h.headers(g),
        })
      ).statusCode,
    ).toBe(400);
  const put = (headers: ReturnType<typeof h.headers>) =>
    h.app.inject({
      method: "PUT",
      url: `/api/v1/decks/${id}`,
      headers,
      payload: {
        commandId: randomUUID(),
        expectedDeckRevision: 1,
        deck: input(),
      },
    });
  expect((await put(h.headers(other))).statusCode).toBe(404);
  expect(
    (await put({ ...h.headers(g), "x-csrf-token": "bad" })).statusCode,
  ).toBe(403);
  const results = await Promise.all([put(h.headers(g)), put(h.headers(g))]);
  expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
  expect(
    (
      await h.owner.query(
        "SELECT revision FROM deck_versions WHERE deck_id=$1",
        [id],
      )
    ).rowCount,
  ).toBe(2);
});
