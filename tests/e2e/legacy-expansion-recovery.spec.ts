import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { create, command } from "./recovery-fixtures.js";
import { testOrigin } from "./test-origin.js";
for (const kind of ["rematch", "review-create"] as const)
  test(`legacy ${kind} pending receipt survives current catalog and reload`, async ({
    page,
  }) => {
    const old = await create(page);
    await command(page, old.id, old.csrf, { kind: "SURRENDER" });
    const summary = await (
      await page.request.get(`/api/v1/matches/${old.id}/summary`)
    ).json();
    const session = await (await page.request.get("/api/v1/session")).json();
    const pending = {
      commandId: randomUUID(),
      mode: "SKIRMISH",
      ...summary.rematch,
    };
    expect(pending.expectedContentVersion).toBe("core_v1");
    // Server accepted the command, but the browser did not receive its response.
    const accepted = await page.request.post("/api/v1/matches", {
      headers: { Origin: testOrigin, "X-CSRF-Token": old.csrf },
      data: pending,
    });
    expect(accepted.status()).toBe(201);
    const created = await accepted.json();
    const path =
      kind === "rematch" ? `/history/${old.id}` : `/decks/review/${old.id}`;
    await page.goto(path);
    await page.evaluate(
      ({ key, body }) => sessionStorage.setItem(key, JSON.stringify(body)),
      {
        key: `oathfront.owner.${session.principal.id}.oathfront.${kind}.${old.id}`,
        body: pending,
      },
    );
    await page.reload();
    const bodies: unknown[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/api/v1/matches"))
        bodies.push(r.postDataJSON());
    });
    await page
      .getByRole("button", {
        name: kind === "rematch" ? "Rematch" : "Accept and create match",
        exact: true,
      })
      .click();
    await expect.poll(() => bodies.length).toBe(1);
    expect(bodies[0]).toEqual(pending);
    await expect(page).toHaveURL(
      new RegExp(`/matches/${created.view.matchId}$`),
    );
  });

test("legacy saved-deck review retries accepted receipt even when the current deck law rejects its cards", async ({
  page,
}) => {
  const old = await create(page);
  await command(page, old.id, old.csrf, { kind: "SURRENDER" });
  const catalog = await (
    await page.request.get("/api/v1/catalog/core_v1")
  ).json();
  const preset = catalog.presets.find(
    (p: { heroId: string }) => p.heroId === "H_G_BP",
  );
  const headers = { Origin: testOrigin, "X-CSRF-Token": old.csrf };
  const savedResponse = await page.request.post("/api/v1/decks", {
    headers,
    data: {
      commandId: randomUUID(),
      deck: {
        name: "Legacy original",
        heroId: preset.heroId,
        contentVersion: "core_v1",
        entries: preset.entries,
      },
    },
  });
  expect(savedResponse.status()).toBe(201);
  const saved = await savedResponse.json();
  const body = {
    commandId: randomUUID(),
    mode: "SKIRMISH",
    expectedContentVersion: "core_v1",
    deck: { kind: "SAVED", deckId: saved.id, deckRevision: saved.revision },
    opponentHeroId: "H_E_FS",
    difficulty: "EASY",
  };
  const made = await page.request.post("/api/v1/matches", {
    headers,
    data: body,
  });
  expect(made.status()).toBe(201);
  const match = await made.json();
  await command(page, match.view.matchId, old.csrf, { kind: "SURRENDER" });
  const pending = { ...body, commandId: randomUUID() };
  const accepted = await page.request.post("/api/v1/matches", {
    headers,
    data: pending,
  });
  expect(accepted.status()).toBe(201);
  const target = await accepted.json();
  const session = await (await page.request.get("/api/v1/session")).json();
  await page.goto(`/decks/review/${match.view.matchId}`);
  await page.evaluate(
    ({ key, body }) => sessionStorage.setItem(key, JSON.stringify(body)),
    {
      key: `oathfront.owner.${session.principal.id}.oathfront.review-create.${match.view.matchId}`,
      body: pending,
    },
  );
  await page.reload();
  const requests: unknown[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/v1/matches"))
      requests.push(r.postDataJSON());
  });
  const confirm = page.getByRole("button", {
    name: "Accept and create match",
    exact: true,
  });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page).toHaveURL(new RegExp(`/matches/${target.view.matchId}$`));
  expect(requests).toEqual([pending]);
  const original = await (
    await page.request.get(`/api/v1/decks/${saved.id}`)
  ).json();
  expect(original.contentVersion).toBe("core_v1");
  expect(original.entries).toEqual(saved.entries);
  expect(original.revision).toBe(1);
});
