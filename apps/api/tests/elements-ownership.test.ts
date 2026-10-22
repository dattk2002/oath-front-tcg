import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { elementsCatalog } from "@oathfront/game-content";
import type { DeckInput } from "@oathfront/contracts";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
function eventDeck(quantity = 2): DeckInput {
  const p = elementsCatalog.presets.find((p) => p.heroId === "H_G_BV")!;
  const entries = structuredClone(p.entries).filter((e) => e.cardId !== "B01");
  if (quantity === 1) entries.push({ cardId: "B01", quantity: 1 });
  entries.push({ cardId: "E01", quantity });
  return {
    name: "Event trial",
    heroId: p.heroId,
    contentVersion: "elements_v1",
    entries,
  };
}
const save = (g: Awaited<ReturnType<typeof h.guest>>, deck: DeckInput) =>
  h.app.inject({
    method: "POST",
    url: "/api/v1/decks",
    headers: h.headers(g),
    payload: { commandId: randomUUID(), deck },
  });
it("guests cannot save event cards and incomplete free two-system drafts remain editable", async () => {
  const g = await h.guest();
  const denied = await save(g, eventDeck(1));
  expect(denied.statusCode).toBe(422);
  expect(denied.json().error.details.validation.issues).toContainEqual(
    expect.objectContaining({ code: "CARD_NOT_OWNED", cardId: "E01" }),
  );
  const draft = await save(g, {
    ...eventDeck(),
    entries: [{ cardId: "V01", quantity: 1 }],
  });
  expect(draft.statusCode).toBe(201);
  expect(draft.json().validation.playable).toBe(false);
});
it("accounts may use only their owned zero, one or two copies; receipts survive later inventory changes", async () => {
  const g = await h.guest();
  await h.owner.query(
    "UPDATE principals SET kind='ACCOUNT',auth_subject=$2,expires_at=NULL WHERE id=$1",
    [g.id, `test:${g.id}`],
  );
  expect((await save(g, eventDeck(1))).statusCode).toBe(422);
  await h.owner.query(
    "INSERT INTO collection_items(account_id,card_id,quantity) VALUES($1,'E01',1)",
    [g.id],
  );
  expect((await save(g, eventDeck(1))).statusCode).toBe(201);
  expect((await save(g, eventDeck(2))).statusCode).toBe(422);
  await h.owner.query(
    "UPDATE collection_items SET quantity=2 WHERE account_id=$1",
    [g.id],
  );
  const payload = { commandId: randomUUID(), deck: eventDeck(2) },
    request = {
      method: "POST" as const,
      url: "/api/v1/decks",
      headers: h.headers(g),
      payload,
    };
  const accepted = await h.app.inject(request);
  expect(accepted.statusCode).toBe(201);
  expect(accepted.json().validation.playable).toBe(true);
  await h.owner.query(
    "UPDATE collection_items SET quantity=1 WHERE account_id=$1",
    [g.id],
  );
  expect((await h.app.inject(request)).json()).toEqual(accepted.json());
  const made = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: {
      ...createBody(),
      expectedContentVersion: "elements_v1",
      deck: { kind: "SAVED", deckId: accepted.json().id, deckRevision: 1 },
    },
  });
  expect(made.statusCode).toBe(422);
  expect(made.json().error.details.validation.issues[0].code).toBe(
    "CARD_NOT_OWNED",
  );
  const read = await h.app.inject({
    url: `/api/v1/decks/${accepted.json().id}`,
    headers: h.headers(g),
  });
  expect(read.json().validation.playable).toBe(false);
  await h.owner.query(
    "UPDATE collection_items SET quantity=2 WHERE account_id=$1",
    [g.id],
  );
  const successful = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: {
      ...createBody(),
      expectedContentVersion: "elements_v1",
      deck: { kind: "SAVED", deckId: accepted.json().id, deckRevision: 1 },
    },
  });
  expect(successful.statusCode).toBe(201);
  expect(successful.json().view.versions.content).toBe("elements_v1");
});
it("migrations create separate publication, progression and append-only reward boundaries", async () => {
  const tables = [
    "editorial_posts",
    "weekly_events",
    "event_scenarios",
    "daily_attempts",
    "weekly_progress",
    "reward_ledger",
    "collection_items",
    "cosmetic_unlocks",
    "match_reward_bindings",
  ];
  for (const table of tables)
    expect(
      (await h.owner.query("SELECT to_regclass($1) AS name", [table])).rows[0]
        .name,
    ).toBe(table);
  for (const table of ["editorial_posts", "weekly_events", "event_scenarios"]) {
    const row = (
      await h.owner.query(
        "SELECT has_table_privilege('oathfront_runtime',$1,'SELECT') AS read,has_table_privilege('oathfront_runtime',$1,'INSERT') AS write",
        [table],
      )
    ).rows[0];
    expect(row).toEqual({ read: true, write: false });
  }
  const reward = (
    await h.owner.query(
      "SELECT has_table_privilege('oathfront_runtime','reward_ledger','UPDATE') AS update,has_table_privilege('oathfront_runtime','reward_ledger','DELETE') AS delete",
    )
  ).rows[0];
  expect(reward).toEqual({ update: false, delete: false });
  const g = await h.guest();
  await expect(
    h.owner.query(
      "INSERT INTO collection_items(account_id,card_id,quantity) VALUES($1,'E01',3)",
      [g.id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
});
