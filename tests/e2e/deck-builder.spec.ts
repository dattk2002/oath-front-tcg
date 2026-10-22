import { selectLobbyHero } from "./lobby-controls.js";
import { evidencePath } from "./evidence-path.js";
import { testOrigin } from "./test-origin.js";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { create, command } from "./recovery-fixtures.js";
import { contentName } from "../../apps/web/src/content/english-content.js";
const dir = evidencePath(
  "task12",
  ".superpowers/sdd/2026-10-20-oathfront-implementation/task-12-evidence",
);
const consoles = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = [];
  consoles.set(page, messages);
  page.on("pageerror", (e) => messages.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") messages.push(m.text());
  });
});
test.afterEach(async ({ page }, info) => {
  await mkdir(dir, { recursive: true });
  const all = consoles.get(page) ?? [];
  const unexpected = all.filter(
    (m) =>
      !(
        /offline|rejected|rejection|stale|429 create/.test(info.title) &&
        /net::ERR_FAILED|status of 409|status of 429/.test(m)
      ),
  );
  await writeFile(
    `${dir}/${info.title.replace(/[^a-z0-9]+/gi, "-")}-console.json`,
    JSON.stringify({ all, unexpected }, null, 2),
  );
  expect(unexpected).toEqual([]);
});
async function guest(page: Page) {
  const r = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(r.status()).toBe(201);
  return r.json();
}
async function copy(page: Page) {
  await guest(page);
  await page.goto("/heroes/H_G_BV/decks");
  await page.getByRole("link", { name: "Customize" }).click();
  await expect(
    page.getByRole("heading", { name: "Build your deck" }),
  ).toBeVisible();
}
async function screenshot(page: Page, name: string) {
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("twenty heroes expose exact four powers and signature without early match creation", async ({
  page,
}) => {
  await guest(page);
  const catalog = await (
    await page.request.get("/api/v1/catalog/elements_v1")
  ).json();
  let creates = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/matches")) creates++;
  });
  await page.goto("/heroes");
  await expect(page.getByRole("radio")).toHaveCount(6);
  for (const hero of catalog.heroes) {
    await selectLobbyHero(page, hero.id);
    const detail = page.getByRole("complementary", { name: "Hero details" });
    await expect(
      detail.getByRole("heading", { name: contentName(hero.id), exact: true }),
    ).toBeVisible();
    for (const id of hero.powerIds) {
      const power = catalog.powers.find((p: { id: string }) => p.id === id);
      await expect(
        detail.getByRole("button", { name: new RegExp(contentName(power.id)) }),
      ).toBeVisible();
    }
    await expect(detail.locator(".signature-power")).toHaveCount(1);
  }
  await selectLobbyHero(page, "H_G_BV");
  await page.getByRole("radio").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
  expect(creates).toBe(0);
  for (const portrait of await page.locator(".hero-portrait").all()) {
    const box = await portrait.boundingBox();
    expect(box?.width).toBeGreaterThan(80);
    expect(box?.height).toBeGreaterThanOrEqual(80);
  }
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await screenshot(page, `heroes-${name}`);
  }
  await page.getByRole("link", { name: "Browse decks", exact: true }).click();
  await expect(page.getByRole("link", { name: "Customize" })).toBeVisible();
  expect(creates).toBe(0);
});
test("collection filters curve copies and independent quantity controls across responsive layouts", async ({
  page,
}) => {
  await copy(page);
  const collection = page.getByRole("region", { name: "Collection" });
  await expect(collection.getByText("24 matching cards")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Deck list" }),
  ).toContainText("22 Units / 8 Tricks · Average 1.93");
  await expect(page.getByRole("table").getByRole("cell")).toHaveText([
    "12",
    "12",
    "2",
    "4",
    "0",
    "0",
  ]);
  await collection
    .getByLabel("Search names, rules or keywords")
    .fill("LEAF KNIGHT");
  await collection
    .getByRole("combobox", { name: /^System/ })
    .selectOption("COMMON");
  await collection
    .getByRole("combobox", { name: /^Type/ })
    .selectOption("UNIT");
  await collection.getByRole("combobox", { name: /^Cost/ }).selectOption("2");
  await expect(collection.locator("article")).toHaveCount(1);
  const tile = collection.locator("article");
  await expect(
    tile.getByRole("button", { name: "Add Leaf Knight" }),
  ).toBeDisabled();
  await tile.getByRole("button", { name: "Remove Leaf Knight" }).click();
  await expect(
    page.getByRole("heading", { name: "Deck · 29/30" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await tile.getByRole("button", { name: "Add Leaf Knight" }).click();
  await tile.getByRole("button", { name: "Leaf Knight", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("No abilities.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await collection
    .getByLabel("Search names, rules or keywords")
    .fill("không tồn tại");
  await expect(
    collection.getByText("No matching cards.", { exact: false }),
  ).toBeVisible();
  await collection.getByLabel("Search names, rules or keywords").fill("");
  await collection
    .getByRole("combobox", { name: /^System/ })
    .selectOption("ALL");
  await collection.getByRole("combobox", { name: /^Type/ }).selectOption("ALL");
  await collection.getByRole("combobox", { name: /^Cost/ }).selectOption("ALL");
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await screenshot(page, `builder-${name}`);
    if (name === "mobile") {
      const opener = page.getByRole("button", {
        name: "Deck · 30/30",
        exact: true,
      });
      await opener.click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toContainText("22 Units / 8 Trick");
      await drawer
        .getByRole("button", { name: "Remove Lanternkeeper" })
        .click();
      await expect(
        drawer
          .getByRole("heading", { name: "Deck · 29/30", exact: true })
          .first(),
      ).toBeVisible();
      await drawer.getByRole("button", { name: "Add Lanternkeeper" }).click();
      await screenshot(page, "builder-mobile-drawer");
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await expect(opener).toBeFocused();
    }
  }
});
test("offline draft survives retry reload, blocks Play under30 and completes saved source", async ({
  page,
}) => {
  await copy(page);
  await page
    .getByLabel("Deck name", { exact: true })
    .fill("Vườn riêng với tên tiếng Việt dài");
  const c = page.getByRole("region", { name: "Collection" });
  await c.getByRole("button", { name: "Remove Lanternkeeper" }).click();
  await expect(
    page.getByRole("button", { name: "Save and continue" }),
  ).toBeDisabled();
  let fail = true;
  await page.route("**/api/v1/decks", (r) =>
    r.request().method() === "POST" && fail ? r.abort("failed") : r.continue(),
  );
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Save result is unconfirmed" }),
  ).toBeVisible();
  fail = false;
  await page.reload();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Vườn riêng với tên tiếng Việt dài",
  );
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await c.getByRole("button", { name: "Add Lanternkeeper" }).click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your opponent" }),
  ).toBeVisible();
  const request = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/matches"),
  );
  await page.getByRole("button", { name: "Start match" }).click();
  const body = (await request).postDataJSON();
  expect(body.deck.kind).toBe("SAVED");
  expect(body.deck.deckRevision).toBe(2);
  await expect(page).toHaveURL(/\/matches\//);
});
test("dirty navigation and focusable name errors preserve draft", async ({
  page,
}) => {
  await copy(page);
  await page.getByLabel("Deck name", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(page.locator("#deck-error-summary")).toBeFocused();
  await page.locator("#deck-error-summary a").click();
  await expect(page.getByLabel("Deck name", { exact: true })).toBeFocused();
  await page.getByLabel("Deck name", { exact: true }).fill("Bản nháp chưa lưu");
  await page.getByRole("link", { name: "Back to decks" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Leave", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Bản nháp chưa lưu",
  );
  await page.getByRole("link", { name: "Back to decks" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page).toHaveURL(/\/heroes\/H_G_BV\/decks/);
  await expect(
    page.getByRole("button", { name: "Bản nháp chưa lưu", exact: true }),
  ).toBeVisible();
});
test("stale revision offers load latest and save copy without overwriting", async ({
  page,
}) => {
  const auth = await guest(page),
    catalog = await (await page.request.get("/api/v1/catalog/core_v1")).json();
  const p = catalog.presets[0];
  const deck = {
    name: "Bộ gốc",
    heroId: p.heroId,
    contentVersion: p.contentVersion,
    entries: p.entries,
  };
  const headers = {
    Origin: testOrigin,
    "X-CSRF-Token": auth.csrfToken,
  };
  const saved = await (
    await page.request.post("/api/v1/decks", {
      headers,
      data: { commandId: randomUUID(), deck },
    })
  ).json();
  await page.goto(`/decks/${saved.id}/edit`);
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Bộ gốc",
  );
  await page.getByLabel("Deck name", { exact: true }).fill("Bản cục bộ");
  await page.request.put(`/api/v1/decks/${saved.id}`, {
    headers,
    data: {
      commandId: randomUUID(),
      expectedDeckRevision: 1,
      deck: { ...deck, name: "Bản tab khác" },
    },
  });
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("This deck changed in another tab");
  await dialog.getByRole("button", { name: "Save as copy" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Bản cục bộ",
  );
  expect(
    (await (await page.request.get(`/api/v1/decks/${saved.id}`)).json()).name,
  ).toBe("Bản tab khác");
  await page.goto(`/decks/${saved.id}/edit`);
  await page.getByLabel("Deck name", { exact: true }).fill("Lần sửa sau");
  await page.request.put(`/api/v1/decks/${saved.id}`, {
    headers,
    data: {
      commandId: randomUUID(),
      expectedDeckRevision: 2,
      deck: { ...deck, name: "Bản mới nhất" },
    },
  });
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Load latest version" })
    .click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Bản mới nhất",
  );
});
for (const kind of ["PRESET", "SAVED"] as const)
  test(`history drift reviews exact ${kind} source before explicit confirmed create`, async ({
    page,
  }) => {
    let id: string, csrf: string, expectedSource: unknown;
    if (kind === "PRESET") {
      const m = await create(page);
      id = m.id;
      csrf = m.csrf;
      expectedSource = { kind: "PRESET", presetId: "D_G_BP" };
    } else {
      const auth = await guest(page);
      csrf = auth.csrfToken;
      const catalog = await (
          await page.request.get("/api/v1/catalog/core_v1")
        ).json(),
        p = catalog.presets[0];
      const headers = { Origin: testOrigin, "X-CSRF-Token": csrf };
      const deck = {
        name: "Nguồn chính xác",
        heroId: p.heroId,
        contentVersion: p.contentVersion,
        entries: p.entries,
      };
      const saved = await (
        await page.request.post("/api/v1/decks", {
          headers,
          data: { commandId: randomUUID(), deck },
        })
      ).json();
      expectedSource = { kind: "SAVED", deckId: saved.id, deckRevision: 1 };
      const made = await (
        await page.request.post("/api/v1/matches", {
          headers,
          data: {
            commandId: randomUUID(),
            mode: "SKIRMISH",
            deck: expectedSource,
            opponentHeroId: "H_E_FX",
            difficulty: "NORMAL",
            expectedContentVersion: catalog.version,
          },
        })
      ).json();
      id = made.view.matchId;
      await page.request.put(`/api/v1/decks/${saved.id}`, {
        headers,
        data: {
          commandId: randomUUID(),
          expectedDeckRevision: 1,
          deck: { ...deck, entries: deck.entries.slice(0, 14) },
        },
      });
    }
    await command(page, id, csrf, { kind: "SURRENDER" });
    const original = (
      await (await page.request.get(`/api/v1/matches/${id}/summary`)).json()
    ).rematch;
    await page.route(`**/api/v1/matches/${id}/summary`, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.rematch.expectedContentVersion = "core_old";
      await route.fulfill({ response, json: body });
    });
    const requests: unknown[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/matches"))
        requests.push(r.postDataJSON());
    });
    await page.goto(`/history/${id}`);
    await page.getByRole("button", { name: "Rematch", exact: true }).click();
    expect(requests).toEqual([]);
    await page
      .getByRole("link", { name: "Open original deck for review" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Review deck", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Deck · 30/30" }),
    ).toBeVisible();
    expect(requests).toEqual([]);
    let reviewedEntries: { cardId: string; quantity: number }[] | undefined;
    if (kind === "SAVED") {
      const accept = page.getByRole("button", {
        name: "Accept and create match",
      });
      await expect(accept).toBeDisabled();
      // Explicitly rebuild the review copy under the new law; the original stays unchanged.
      const catalog = await (
        await page.request.get("/api/v1/catalog/elements_v1")
      ).json();
      reviewedEntries = catalog.presets.find(
        (p: { heroId: string }) => p.heroId === "H_G_BV",
      ).entries;
      const list = page.getByRole("complementary", { name: "Deck list" });
      while (await list.getByRole("button", { name: /^Remove / }).count())
        await list
          .getByRole("button", { name: /^Remove / })
          .first()
          .click();
      const collection = page.getByRole("region", { name: "Collection" });
      for (const entry of reviewedEntries!) {
        for (let n = 0; n < entry.quantity; n++)
          await collection
            .getByRole("button", {
              name: `Add ${contentName(entry.cardId)}`,
              exact: true,
            })
            .click();
      }
      await expect(accept).toBeEnabled();
    }
    await screenshot(page, `review-${kind.toLowerCase()}`);
    await page.getByRole("button", { name: "Accept and create match" }).click();
    await expect(page).toHaveURL(/\/matches\//);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      expectedContentVersion: "elements_v1",
      opponentHeroId: original.opponentHeroId,
      difficulty: original.difficulty,
    });
    const source = (
      requests[0] as {
        deck: { kind: string; deckId: string; deckRevision: number };
      }
    ).deck;
    if (kind === "PRESET") expect(source).toEqual(expectedSource);
    else {
      // Explicit review upgrades a copy of the original revision, not the newer edited deck.
      const oldSource = expectedSource as {
        deckId: string;
        deckRevision: number;
      };
      expect(source.kind).toBe("SAVED");
      expect(source.deckId).not.toBe(oldSource.deckId);
      const originalDeck = await (
        await page.request.get(
          `/api/v1/decks/${oldSource.deckId}?revision=${oldSource.deckRevision}`,
        )
      ).json();
      const migratedDeck = await (
        await page.request.get(
          `/api/v1/decks/${source.deckId}?revision=${source.deckRevision}`,
        )
      ).json();
      expect(originalDeck.contentVersion).toBe("core_v1");
      expect(originalDeck.entries).toHaveLength(15);
      expect(migratedDeck).toMatchObject({
        heroId: originalDeck.heroId,
        contentVersion: "elements_v1",
      });
      expect(
        [...migratedDeck.entries].sort((a, b) =>
          a.cardId.localeCompare(b.cardId),
        ),
      ).toEqual(
        [...reviewedEntries!].sort((a, b) => a.cardId.localeCompare(b.cardId)),
      );
      const latestOriginal = await (
        await page.request.get(`/api/v1/decks/${oldSource.deckId}`)
      ).json();
      expect(latestOriginal.revision).toBe(2);
      expect(latestOriginal.entries).toHaveLength(14);
    }
    expect(
      (await (await page.request.get(`/api/v1/matches/${id}/summary`)).json())
        .rematch,
    ).toEqual(original);
  });
test("throwing storage and rejected create retain no-reload warning and exact retry", async ({
  page,
}) => {
  const { id, csrf } = await create(page, "GOOD", "elements_v1");
  await command(page, id, csrf, { kind: "SURRENDER" });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw Error("storage unavailable");
    };
  });
  const bodies: unknown[] = [];
  await page.route("**/api/v1/matches", (r) => {
    bodies.push(r.request().postDataJSON());
    return r.abort("failed");
  });
  await page.goto(`/history/${id}`);
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(/do not reload/i);
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
});
test("dirty browser Back offers stay and leave; empty new deck remains editable on mobile reduced motion", async ({
  page,
}) => {
  await guest(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/heroes/H_G_BV/decks");
  await page.getByRole("link", { name: "Create deck", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Deck · 0/30", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Deck name", { exact: true }).fill("");
  await page.reload();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue("");
  await page.getByLabel("Deck name", { exact: true }).fill("Giữ khi quay lại");
  await page.evaluate(() => history.back());
  await expect(page.getByRole("dialog")).toContainText(
    "Your deck has unsaved changes",
  );
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Giữ khi quay lại",
  );
  await screenshot(page, "empty-mobile-reduced");
});
test("offline committed saved create reload restores exact source opponent and idempotent retry", async ({
  page,
}) => {
  await guest(page);
  await page.goto("/decks/new?hero=H_E_FX&preset=D_E_FX");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your opponent", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: /^Opponent hero/ })
    .selectOption("H_G_BP");
  await page
    .getByRole("combobox", { name: /^Difficulty/ })
    .selectOption("NORMAL");
  const bodies: unknown[] = [];
  let drop = true;
  await page.route("**/api/v1/matches", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    bodies.push(route.request().postDataJSON());
    if (drop) {
      drop = false;
      expect((await route.fetch()).status()).toBe(201);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Start match" }).click();
  await expect(page.getByText(/Match creation is unconfirmed/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Choose your opponent", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: /^Opponent hero/ }),
  ).toHaveValue("H_G_BP");
  await expect(page.getByRole("combobox", { name: /^Difficulty/ })).toHaveValue(
    "NORMAL",
  );
  await expect(
    page.getByText("Cinder · Ashen Court", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry match creation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/matches\//);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
});

async function savedFixture(page: Page) {
  const auth = await guest(page);
  const catalog = await (
    await page.request.get("/api/v1/catalog/core_v1")
  ).json();
  const p = catalog.presets[0];
  const deck = {
    name: "Bộ lưu ban đầu",
    heroId: p.heroId,
    contentVersion: p.contentVersion,
    entries: p.entries,
  };
  const headers = {
    Origin: testOrigin,
    "X-CSRF-Token": auth.csrfToken,
  };
  const response = await page.request.post("/api/v1/decks", {
    headers,
    data: { commandId: randomUUID(), deck },
  });
  expect(response.status()).toBe(201);
  return { headers, deck, saved: await response.json() };
}
test("draft revision migration: stale load latest edit reload retains new draft", async ({
  page,
}) => {
  const { headers, deck, saved } = await savedFixture(page);
  await page.goto(`/decks/${saved.id}/edit`);
  await page.getByLabel("Deck name", { exact: true }).fill("Sửa cũ");
  expect(
    (
      await page.request.put(`/api/v1/decks/${saved.id}`, {
        headers,
        data: {
          commandId: randomUUID(),
          expectedDeckRevision: 1,
          deck: { ...deck, name: "Phiên bản hai" },
        },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Load latest version", exact: true })
    .click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Phiên bản hai",
  );
  await page
    .getByLabel("Deck name", { exact: true })
    .fill("Sửa sau khi tải bản hai");
  await page.reload();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Sửa sau khi tải bản hai",
  );
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`/api/v1/decks/${saved.id}`)).json())
      .revision,
  ).toBe(3);
});
test("draft revision migration: same route save edit reload retains unsaved edits", async ({
  page,
}) => {
  const { saved } = await savedFixture(page);
  await page.goto(`/decks/${saved.id}/edit`);
  await page
    .getByLabel("Deck name", { exact: true })
    .fill("Đã lưu phiên bản hai");
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await page
    .getByLabel("Deck name", { exact: true })
    .fill("Chưa lưu sau phiên bản hai");
  await page.reload();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Chưa lưu sau phiên bản hai",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "not yet saved to the server" }),
  ).toBeVisible();
});
test("offline committed save reload preserves original receipt and requires stale choice for later revision", async ({
  page,
}) => {
  const { headers, deck, saved } = await savedFixture(page);
  await page.goto(`/decks/${saved.id}/edit`);
  await page
    .getByLabel("Deck name", { exact: true })
    .fill("Yêu cầu lưu nguyên bản");
  const bodies: unknown[] = [];
  let drop = true;
  await page.route(`**/api/v1/decks/${saved.id}`, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    bodies.push(route.request().postDataJSON());
    if (drop) {
      drop = false;
      expect((await route.fetch()).status()).toBe(200);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Save result is unconfirmed" }),
  ).toBeVisible();
  expect(
    (
      await page.request.put(`/api/v1/decks/${saved.id}`, {
        headers,
        data: {
          commandId: randomUUID(),
          expectedDeckRevision: 2,
          deck: { ...deck, name: "Phiên bản ba từ tab khác" },
        },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Yêu cầu lưu nguyên bản",
  );
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(
    (await (await page.request.get(`/api/v1/decks/${saved.id}`)).json())
      .revision,
  ).toBe(3);
  await page
    .getByLabel("Deck name", { exact: true })
    .fill("Thay đổi dựa trên bản hai");
  await page.reload();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Thay đổi dựa trên bản hai",
  );
  await page.getByRole("button", { name: "Save deck", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "This deck changed in another tab",
  );
  expect(
    (await (await page.request.get(`/api/v1/decks/${saved.id}`)).json()).name,
  ).toBe("Phiên bản ba từ tab khác");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Load latest version", exact: true })
    .click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Phiên bản ba từ tab khác",
  );
});
test("definitive create rejection then another hero posts the visibly selected preset", async ({
  page,
}) => {
  const { saved } = await savedFixture(page);
  await page.goto("/heroes/H_G_BV/decks");
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("button", { name: saved.name, exact: true }),
    })
    .getByRole("button", { name: "Use this deck", exact: true })
    .click();
  let reject = true;
  const requests: unknown[] = [];
  await page.route("**/api/v1/matches", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requests.push(route.request().postDataJSON());
    if (reject) {
      reject = false;
      await route.fulfill({
        status: 409,
        json: {
          error: {
            code: "VERSION_UNSUPPORTED",
            messageKey: "error.VERSION_UNSUPPORTED",
            requestId: randomUUID(),
            retryable: false,
            details: {},
          },
        },
      });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByText(/The request was rejected/)).toBeVisible();
  for (const [label, width, height] of [
    ["mobile", 375, 812],
    ["tablet", 1024, 768],
    ["desktop", 1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await screenshot(page, `fix-round1/create-rejection-${label}`);
  }
  const change = page.getByRole("button", {
    name: "Choose another deck",
    exact: true,
  });
  await change.click();
  await expect(
    page.getByRole("heading", { name: "Choose your hero", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Aster/ }).check();
  await page.getByRole("link", { name: "Browse decks", exact: true }).click();
  await page
    .getByRole("button", { name: "Use this deck", exact: true })
    .click();
  await expect(
    page.getByText("Aster · Dawnward", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/matches\//);
  expect(requests).toHaveLength(2);
  expect(requests[0]).toMatchObject({
    deck: { kind: "SAVED", deckId: saved.id, deckRevision: 1 },
  });
  expect(requests[1]).toMatchObject({
    deck: { kind: "PRESET", presetId: "D_G_BP" },
  });
});
test("429 create preserves selected source command id and body for explicit retry", async ({
  page,
}) => {
  await guest(page);
  await page.goto("/heroes/H_G_BP/decks");
  await page
    .getByRole("button", { name: "Use this deck", exact: true })
    .click();
  const requests: unknown[] = [];
  let limit = true;
  await page.route("**/api/v1/matches", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requests.push(route.request().postDataJSON());
    if (limit) {
      limit = false;
      await route.fulfill({
        status: 429,
        json: {
          error: {
            code: "RATE_LIMITED",
            messageKey: "error.RATE_LIMITED",
            requestId: randomUUID(),
            retryable: true,
            details: { retryAfterSeconds: 1 },
          },
        },
      });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry match creation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Aster · Dawnward", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry match creation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/matches\//);
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
});
