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
