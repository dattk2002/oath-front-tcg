import { test, expect, type Page } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { create, command } from "./recovery-fixtures.js";
const dir =
  ".superpowers/sdd/2026-10-20-oathfront-implementation/task-12-evidence";
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
        /offline|rejected|stale/.test(info.title) &&
        /net::ERR_FAILED|status of 409/.test(m)
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
    headers: { Origin: "http://localhost:3100" },
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
  await page.getByRole("link", { name: "Tùy chỉnh" }).click();
  await expect(
    page.getByRole("heading", { name: "Xây dựng bộ bài" }),
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
test("six heroes expose exact four powers and signature without early match creation", async ({
  page,
}) => {
  await guest(page);
  const catalog = await (
    await page.request.get("/api/v1/catalog/core_v1")
  ).json();
  let creates = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/matches")) creates++;
  });
  await page.goto("/heroes");
  await expect(page.getByRole("radio")).toHaveCount(6);
  for (const hero of catalog.heroes) {
    await page.locator(`input[type="radio"][value="${hero.id}"]`).check();
    const detail = page.getByRole("complementary", { name: "Chi tiết hero" });
    await expect(
      detail.getByRole("heading", { name: hero.nameVi, exact: true }),
    ).toBeVisible();
    for (const id of hero.powerIds) {
      const power = catalog.powers.find((p: { id: string }) => p.id === id);
      await expect(
        detail.getByRole("button", { name: new RegExp(power.nameVi) }),
      ).toBeVisible();
    }
    await expect(detail.getByText("Signature", { exact: true })).toHaveCount(1);
  }
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
  await page.getByRole("button", { name: "Chọn bộ bài", exact: true }).click();
  await expect(page.getByRole("link", { name: "Tùy chỉnh" })).toBeVisible();
  expect(creates).toBe(0);
});
test("collection filters curve copies and independent quantity controls across responsive layouts", async ({
  page,
}) => {
  await copy(page);
  const collection = page.getByRole("region", { name: "Bộ sưu tập" });
  await expect(collection.getByText("22 lá phù hợp")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Danh sách bộ bài" }),
  ).toContainText("22 Nhân vật / 8 Trick · Trung bình 2.33");
  await expect(page.getByRole("table").getByRole("cell")).toHaveText([
    "8",
    "12",
    "6",
    "2",
    "0",
    "2",
  ]);
  await collection.getByLabel("Tìm tên hoặc keyword").fill("KY SI LA");
  await collection
    .getByRole("combobox", { name: /^Class/ })
    .selectOption("COMMON");
  await collection
    .getByRole("combobox", { name: /^Loại/ })
    .selectOption("UNIT");
  await collection
    .getByRole("combobox", { name: /^Chi phí/ })
    .selectOption("2");
  await expect(collection.locator("article")).toHaveCount(1);
  const tile = collection.locator("article");
  await expect(
    tile.getByRole("button", { name: "Thêm Kỵ Sĩ Lá" }),
  ).toBeDisabled();
  await tile.getByRole("button", { name: "Bớt Kỵ Sĩ Lá" }).click();
  await expect(
    page.getByRole("heading", { name: "Bộ bài · 29/30" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await tile.getByRole("button", { name: "Thêm Kỵ Sĩ Lá" }).click();
  await tile.getByRole("button", { name: "Kỵ Sĩ Lá", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Không có ability.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await collection.getByLabel("Tìm tên hoặc keyword").fill("không tồn tại");
  await expect(
    collection.getByText("Không có lá phù hợp.", { exact: false }),
  ).toBeVisible();
  await collection.getByLabel("Tìm tên hoặc keyword").fill("");
  await collection
    .getByRole("combobox", { name: /^Class/ })
    .selectOption("ALL");
  await collection.getByRole("combobox", { name: /^Loại/ }).selectOption("ALL");
  await collection
    .getByRole("combobox", { name: /^Chi phí/ })
    .selectOption("ALL");
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await screenshot(page, `builder-${name}`);
    if (name === "mobile") {
      const opener = page.getByRole("button", {
        name: "Bộ bài · 30/30",
        exact: true,
      });
      await opener.click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toContainText("22 Nhân vật / 8 Trick");
      await drawer.getByRole("button", { name: "Bớt Người Gác Đèn" }).click();
      await expect(
        drawer
          .getByRole("heading", { name: "Bộ bài · 29/30", exact: true })
          .first(),
      ).toBeVisible();
      await drawer.getByRole("button", { name: "Thêm Người Gác Đèn" }).click();
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
    .getByLabel("Tên bộ bài", { exact: true })
    .fill("Vườn riêng với tên tiếng Việt dài");
  const c = page.getByRole("region", { name: "Bộ sưu tập" });
  await c.getByRole("button", { name: "Bớt Người Gác Đèn" }).click();
  await expect(
    page.getByRole("button", { name: "Lưu và tiếp tục" }),
  ).toBeDisabled();
  let fail = true;
  await page.route("**/api/v1/decks", (r) =>
    r.request().method() === "POST" && fail ? r.abort("failed") : r.continue(),
  );
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Chưa xác định kết quả lưu" }),
  ).toBeVisible();
  fail = false;
  await page.reload();
  await expect(page.getByLabel("Tên bộ bài", { exact: true })).toHaveValue(
    "Vườn riêng với tên tiếng Việt dài",
  );
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Đã lưu" }),
  ).toBeVisible();
  await c.getByRole("button", { name: "Thêm Người Gác Đèn" }).click();
  await page.getByRole("button", { name: "Lưu và tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Chọn đối thủ" }),
  ).toBeVisible();
  const request = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/matches"),
  );
  await page.getByRole("button", { name: "Bắt đầu trận" }).click();
  const body = (await request).postDataJSON();
  expect(body.deck.kind).toBe("SAVED");
  expect(body.deck.deckRevision).toBe(2);
  await expect(page).toHaveURL(/\/matches\//);
});
test("dirty navigation and focusable name errors preserve draft", async ({
  page,
}) => {
  await copy(page);
  await page.getByLabel("Tên bộ bài", { exact: true }).fill("");
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  await expect(page.locator("#deck-error-summary")).toBeFocused();
  await page.locator("#deck-error-summary a").click();
  await expect(page.getByLabel("Tên bộ bài", { exact: true })).toBeFocused();
  await page
    .getByLabel("Tên bộ bài", { exact: true })
    .fill("Bản nháp chưa lưu");
  await page.getByRole("link", { name: "Quay lại bộ bài" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Lưu", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Rời đi", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Ở lại", exact: true }).click();
  await expect(page.getByLabel("Tên bộ bài", { exact: true })).toHaveValue(
    "Bản nháp chưa lưu",
  );
  await page.getByRole("link", { name: "Quay lại bộ bài" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu", exact: true })
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
    Origin: "http://localhost:3100",
    "X-CSRF-Token": auth.csrfToken,
  };
  const saved = await (
    await page.request.post("/api/v1/decks", {
      headers,
      data: { commandId: randomUUID(), deck },
    })
  ).json();
  await page.goto(`/decks/${saved.id}/edit`);
  await expect(page.getByLabel("Tên bộ bài", { exact: true })).toHaveValue(
    "Bộ gốc",
  );
  await page.getByLabel("Tên bộ bài", { exact: true }).fill("Bản cục bộ");
  await page.request.put(`/api/v1/decks/${saved.id}`, {
    headers,
    data: {
      commandId: randomUUID(),
      expectedDeckRevision: 1,
      deck: { ...deck, name: "Bản tab khác" },
    },
  });
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Bộ bài đã thay đổi ở tab khác");
  await dialog.getByRole("button", { name: "Lưu thành bản sao" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel("Tên bộ bài", { exact: true })).toHaveValue(
    "Bản cục bộ",
  );
  expect(
    (await (await page.request.get(`/api/v1/decks/${saved.id}`)).json()).name,
  ).toBe("Bản tab khác");
  await page.goto(`/decks/${saved.id}/edit`);
  await page.getByLabel("Tên bộ bài", { exact: true }).fill("Lần sửa sau");
  await page.request.put(`/api/v1/decks/${saved.id}`, {
    headers,
    data: {
      commandId: randomUUID(),
      expectedDeckRevision: 2,
      deck: { ...deck, name: "Bản mới nhất" },
    },
  });
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tải bản mới" })
    .click();
  await expect(page.getByLabel("Tên bộ bài", { exact: true })).toHaveValue(
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
      const headers = { Origin: "http://localhost:3100", "X-CSRF-Token": csrf };
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
    await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
    expect(requests).toEqual([]);
    await page.getByRole("link", { name: "Mở bộ bài gốc để xem lại" }).click();
    await expect(
      page.getByRole("heading", { name: "Xem lại bộ bài", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Bộ bài · 30/30" }),
    ).toBeVisible();
    expect(requests).toEqual([]);
    await screenshot(page, `review-${kind.toLowerCase()}`);
    await page
      .getByRole("button", { name: "Chấp nhận và tạo trận mới" })
      .click();
    await expect(page).toHaveURL(/\/matches\//);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      deck: expectedSource,
      expectedContentVersion: "core_v1",
      opponentHeroId: original.opponentHeroId,
      difficulty: original.difficulty,
    });
    expect(
      (await (await page.request.get(`/api/v1/matches/${id}/summary`)).json())
        .rematch,
    ).toEqual(original);
  });
test("throwing storage and rejected create retain no-reload warning and exact retry", async ({
  page,
}) => {
  const { id, csrf } = await create(page);
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
  await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("không tải lại");
  await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
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
  await page.getByRole("link", { name: "Tạo bộ bài", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Bộ bài · 0/30", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tên bộ bài", { exact: true }).fill("");
  await page.reload();
  await expect(page.getByLabel("Tên bộ bài", { exact: true })).toHaveValue("");
  await page.getByLabel("Tên bộ bài", { exact: true }).fill("Giữ khi quay lại");
  await page.evaluate(() => history.back());
  await expect(page.getByRole("dialog")).toContainText(
    "Bộ bài có thay đổi chưa lưu",
  );
  await page.getByRole("button", { name: "Ở lại", exact: true }).click();
  await expect(page.getByLabel("Tên bộ bài", { exact: true })).toHaveValue(
    "Giữ khi quay lại",
  );
  await screenshot(page, "empty-mobile-reduced");
});
test("offline committed saved create reload restores exact source opponent and idempotent retry", async ({
  page,
}) => {
  await guest(page);
  await page.goto("/decks/new?hero=H_E_FX&preset=D_E_FX");
  await page.getByRole("button", { name: "Lưu và tiếp tục" }).click();
  await expect(
    page.getByRole("heading", { name: "Chọn đối thủ", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: /^Hero bot/ })
    .selectOption("H_G_BP");
  await page.getByRole("combobox", { name: /^Độ khó/ }).selectOption("NORMAL");
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
  await page.getByRole("button", { name: "Bắt đầu trận" }).click();
  await expect(page.getByText(/Chưa xác định kết quả tạo trận/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Chọn đối thủ", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: /^Hero bot/ })).toHaveValue(
    "H_G_BP",
  );
  await expect(page.getByRole("combobox", { name: /^Độ khó/ })).toHaveValue(
    "NORMAL",
  );
  await expect(
    page.getByText("Hắc Luyện · Phe Ác", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Thử lại tạo trận", exact: true })
    .click();
  await expect(page).toHaveURL(/\/matches\//);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
});
