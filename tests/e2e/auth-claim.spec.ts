import { test, expect } from "@playwright/test";
test("guest can reach Google login and history without making guest play require identity", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Đăng nhập Google", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chơi với bot" }).click();
  await expect(
    page.getByRole("heading", { name: "Chọn người dẫn lối" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Lịch sử", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lịch sử trận đấu" }),
  ).toBeVisible();
  await expect(page.getByText("Chưa có trận đấu.")).toBeVisible();
});
import { randomUUID, randomBytes } from "node:crypto";
import { ownerPool } from "../../packages/db/tests/helpers.js";
import { mkdir, writeFile } from "node:fs/promises";
const evidence =
  ".superpowers/sdd/2026-10-20-oathfront-implementation/task-13-evidence";
const logs = new WeakMap<import("@playwright/test").Page, string[]>();
test.beforeEach(({ page }) => {
  const lines: string[] = [];
  logs.set(page, lines);
  page.on("pageerror", (e) => lines.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") lines.push(m.text());
  });
});
test.afterEach(async ({ page }, info) => {
  const all = logs.get(page) ?? [];
  const unexpected = all.filter(
    (line) =>
      !(
        /status of 401/.test(line) ||
        (/merge choice/.test(info.title) && /status of 409/.test(line)) ||
        (/expired paused/.test(info.title) && /status of 400/.test(line)) ||
        (/throwing storage/.test(info.title) && /net::ERR_FAILED/.test(line))
      ),
  );
  await mkdir(evidence, { recursive: true });
  await writeFile(
    `${evidence}/${info.title.replace(/[^a-z0-9]+/gi, "-")}-console.json`,
    JSON.stringify({ all, unexpected }, null, 2),
  );
  expect(unexpected).toEqual([]);
});

async function guest(page: import("@playwright/test").Page) {
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
async function token(page: import("@playwright/test").Page, subject: string) {
  return (
    await (
      await page.request.post("http://127.0.0.1:3101/__fixture/identity", {
        data: { subject },
      })
    ).json()
  ).token as string;
}
async function callback(
  page: import("@playwright/test").Page,
  identityToken: string,
  session: { csrfToken: string; principal: { id: string; kind: string } },
) {
  await page.route("**/api/auth/token*", (r) =>
    r.fulfill({ json: { token: identityToken } }),
  );
  await page.evaluate((s) => {
    sessionStorage.setItem(
      "oathfront.auth-intent",
      JSON.stringify({
        commandId: crypto.randomUUID(),
        keepMatchId: null,
        sourceId: s.principal.id,
        csrf: s.csrfToken,
        kind: s.principal.kind === "GUEST" ? "claim" : "exchange",
      }),
    );
  }, session);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toBeVisible();
}
test("signed fixture identity claims guest through Next/API/DB, preserves draft, renews a rejected save and isolates logout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const g = await guest(page),
    jwt = await token(page, "save-" + randomUUID());
  await page.goto("/decks/new?hero=H_G_BV");
  // Use the canonical hero picker link to the blank builder.
  await page.goto("/heroes/H_G_BV/decks");
  await page.getByRole("link", { name: "Tạo bộ bài" }).click();
  await page.getByLabel("Tên bộ bài").fill("Bản nháp trước đăng nhập");
  await callback(page, jwt, g);
  await expect(page.getByLabel("Tên bộ bài")).toHaveValue(
    "Bản nháp trước đăng nhập",
  );
  const current = await (await page.request.get("/api/v1/session")).json();
  expect(current.principal.id).toBe(g.principal.id);
  expect(current.principal.kind).toBe("ACCOUNT");
  const owner = ownerPool();
  await owner.query(
    "UPDATE app_sessions SET expires_at=now()-interval '1 second' WHERE principal_id=$1 AND revoked_at IS NULL",
    [g.principal.id],
  );
  await owner.end();
  const payloads: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/v1/decks") && r.method() === "POST")
      payloads.push(r.postData()!);
  });
  const renewed = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/auth/exchange") && r.status() === 200,
  );
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  await renewed;
  await expect(
    page.getByText(
      "Đã khôi phục tài khoản. Bạn có thể thử lại yêu cầu đang giữ.",
    ),
  ).toBeVisible();
  expect(payloads).toHaveLength(1);
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/decks") &&
      r.request().method() === "POST" &&
      r.status() === 201,
  );
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  const savedDeck = await (await saved).json();
  await expect(page).toHaveURL(new RegExp(`/decks/${savedDeck.id}/edit$`));
  await expect(page.getByLabel("Tên bộ bài")).toHaveValue(
    "Bản nháp trước đăng nhập",
  );
  expect(payloads).toHaveLength(2);
  expect(payloads[1]).toBe(payloads[0]);
  await page.route("**/api/auth/sign-out", (r) =>
    r.fulfill({ json: { success: true } }),
  );
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Chơi với bot" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chơi với bot" }).click();
  await expect(
    page.getByRole("heading", { name: "Chọn người dẫn lối" }),
  ).toBeVisible();
  await page.goto("/heroes/H_G_BV/decks");
  await page.getByRole("link", { name: "Tạo bộ bài" }).click();
  await expect(page.getByLabel("Tên bộ bài")).not.toHaveValue(
    "Bản nháp trước đăng nhập",
  );
  expect(errors).toEqual([]);
  await mkdir(evidence, { recursive: true });
  await writeFile(`${evidence}/auth-console.json`, JSON.stringify(errors));
});
test("local auth handler remains separate from the Fastify API rewrite", async ({
  request,
}) => {
  const managed = await request.get("/api/auth/get-session");
  expect(managed.status()).toBe(503);
  expect(await managed.json()).toEqual({ error: "AUTH_UNAVAILABLE" });
  const api = await request.get("/api/v1/catalog/core_v1");
  expect(api.status()).toBe(200);
  expect((await api.json()).version).toBe("core_v1");
});
async function make(page: import("@playwright/test").Page, csrfToken: string) {
  const r = await page.request.post("/api/v1/matches", {
    headers: { Origin: "http://localhost:3100", "X-CSRF-Token": csrfToken },
    data: {
      commandId: randomUUID(),
      mode: "SKIRMISH",
      deck: { kind: "PRESET", presetId: "D_G_BV" },
      opponentHeroId: "H_E_FX",
      difficulty: "EASY",
      expectedContentVersion: "core_v1",
    },
  });
  expect(r.status()).toBe(201);
  return r.json();
}
test("merge choice keeps guest draft and selected match, preserves abandoned history, and fits desktop tablet mobile", async ({
  page,
}) => {
  const jwt = await token(page, "merge-" + randomUUID());
  const account = await (
    await page.request.post("/api/v1/auth/exchange", {
      headers: { Origin: "http://localhost:3100" },
      data: { commandId: randomUUID(), identityToken: jwt },
    })
  ).json();
  const am = await make(page, account.csrfToken);
  expect(
    (
      await page.request.post("/api/v1/auth/logout", {
        headers: {
          Origin: "http://localhost:3100",
          "X-CSRF-Token": account.csrfToken,
        },
        data: {},
      })
    ).status(),
  ).toBe(204);
  const g = await guest(page),
    gm = await make(page, g.csrfToken);
  await page.goto("/decks/new?hero=H_G_BV");
  await page.getByLabel("Tên bộ bài").fill("Bản nháp cần giữ");
  await page.route("**/api/auth/token*", (r) =>
    r.fulfill({ json: { token: jwt } }),
  );
  await page.evaluate(
    (s) =>
      sessionStorage.setItem(
        "oathfront.auth-intent",
        JSON.stringify({
          commandId: crypto.randomUUID(),
          keepMatchId: null,
          sourceId: s.principal.id,
          csrf: s.csrfToken,
          kind: "claim",
        }),
      ),
    g,
  );
  await page.reload();
  const dialog = page.getByRole("dialog", { name: "Chọn trận muốn tiếp tục" });
  await expect(dialog).toBeVisible();
  await mkdir(evidence, { recursive: true });
  await page.screenshot({
    path: `${evidence}/merge-desktop.png`,
    fullPage: false,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: `${evidence}/merge-tablet.png`,
    fullPage: false,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: `${evidence}/merge-mobile.png`,
    fullPage: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: /Trận của khách/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("Tên bộ bài")).toHaveValue("Bản nháp cần giữ");
  const current = await (await page.request.get("/api/v1/session")).json();
  expect(current.principal.id).toBe(account.principal.id);
  expect(current.activeMatchId).toBe(gm.view.matchId);
  const summary = await (
    await page.request.get(`/api/v1/matches/${am.view.matchId}/summary`)
  ).json();
  expect(summary.lifecycle).toBe("ABANDONED");
  expect(summary.outcome.result).toBe("NONE");
  await page.goto("/history");
  await expect(
    page.getByRole("link", { name: /Đã đóng · không tính thua/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `${evidence}/history-mobile.png`,
    fullPage: true,
  });
});
test("expired paused session exposes login inside the modal and explicitly retries the identical command after renewal", async ({
  page,
}) => {
  const jwt = await token(page, "pause-" + randomUUID()),
    g = await guest(page);
  const a = await (
    await page.request.post("/api/v1/auth/claim-guest", {
      headers: { Origin: "http://localhost:3100", "X-CSRF-Token": g.csrfToken },
      data: { commandId: randomUUID(), identityToken: jwt, keepMatchId: null },
    })
  ).json();
  const made = await make(page, a.csrfToken);
  await page.request.post(`/api/v1/matches/${made.view.matchId}/commands`, {
    headers: { Origin: "http://localhost:3100", "X-CSRF-Token": a.csrfToken },
    data: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "PAUSE" },
    },
  });
  await page.goto(`/matches/${made.view.matchId}`);
  const modal = page.getByRole("dialog", { name: "Tạm dừng", exact: true });
  await expect(modal).toBeVisible();
  const owner = ownerPool();
  await owner.query(
    "UPDATE app_sessions SET expires_at=now()-interval '1 second' WHERE principal_id=$1 AND revoked_at IS NULL",
    [a.principal.id],
  );
  await owner.end();
  await page.route("**/api/auth/token*", (r) =>
    r.fulfill({
      status: 401,
      json: { message: "Test identity interaction required" },
    }),
  );
  const sent: string[] = [];
  page.on("request", (r) => {
    if (
      r.url().endsWith("/commands") &&
      r.postDataJSON()?.action.kind === "RESUME"
    )
      sent.push(r.postData()!);
  });
  await modal.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(
    modal.getByRole("button", { name: "Đăng nhập Google" }),
  ).toBeVisible();
  let loginRequested = false;
  await page.route("**/api/auth/sign-in/social", (r) => {
    loginRequested = true;
    expect(r.request().postDataJSON()).toMatchObject({
      provider: "google",
      callbackURL: `http://localhost:3100/matches/${made.view.matchId}`,
    });
    return r.fulfill({
      status: 400,
      json: { message: "Test provider stopped before account selection" },
    });
  });
  await modal.getByRole("button", { name: "Đăng nhập Google" }).click();
  await expect.poll(() => loginRequested).toBe(true);
  await page.unroute("**/api/auth/token*");
  await page.route("**/api/auth/token*", (r) =>
    r.fulfill({ json: { token: jwt } }),
  );
  await modal.getByRole("button", { name: "Khôi phục phiên" }).click();
  await expect(
    modal.getByRole("button", { name: "Thử lại yêu cầu" }),
  ).toBeEnabled();
  expect(sent).toHaveLength(1);
  await modal.getByRole("button", { name: "Thử lại yêu cầu" }).click();
  await expect(modal).not.toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[1]).toBe(sent[0]);
});
test("throwing storage plus uncertain save and create keep the no-reload warning and exact request", async ({
  page,
}) => {
  await guest(page);
  await page.goto("/decks/new?hero=H_G_BV");
  await page.getByLabel("Tên bộ bài").fill("Nháp lỗi bộ nhớ");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("storage unavailable");
    };
  });
  const saved: string[] = [];
  await page.route("**/api/v1/decks", (r) => {
    saved.push(r.request().postData()!);
    return r.abort();
  });
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  await expect(page.locator(".deck-footer").getByRole("status")).toContainText(
    "không tải lại",
  );
  await page.getByRole("button", { name: "Lưu bộ bài", exact: true }).click();
  expect(saved[1]).toBe(saved[0]);
  await page.goto("/heroes/H_G_BV/decks");
  await page.unroute("**/api/v1/decks");
  await page.reload();
  await page
    .getByRole("button", { name: "Dùng bộ bài này", exact: true })
    .click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("storage unavailable");
    };
  });
  const created: string[] = [];
  await page.route("**/api/v1/matches", (r) => {
    created.push(r.request().postData()!);
    return r.abort();
  });
  await page.getByRole("button", { name: "Bắt đầu trận", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Chưa xác định kết quả tạo trận" }),
  ).toContainText("không tải lại");
  await page
    .getByRole("button", { name: "Thử lại tạo trận", exact: true })
    .click();
  expect(created[1]).toBe(created[0]);
});
test("managed callback consumes verifier before token exchange and removes it from the app URL", async ({
  page,
}) => {
  const g = await guest(page),
    jwt = await token(page, "verifier-" + randomUUID());
  await page.goto("/");
  let consumed = false;
  let tokenRequested = false;
  const date = new Date().toISOString();
  await page.route("**/api/auth/get-session?*", (r) => {
    consumed = new URL(r.request().url()).searchParams.has(
      "neon_auth_session_verifier",
    );
    return r.fulfill({
      json: {
        session: {
          id: "provider-session",
          userId: "provider-user",
          token: "fixture-only-provider-token",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          createdAt: date,
          updatedAt: date,
          ipAddress: null,
          userAgent: null,
        },
        user: {
          id: "provider-user",
          name: "Tài khoản kiểm thử",
          email: "test@example.invalid",
          emailVerified: true,
          image: null,
          createdAt: date,
          updatedAt: date,
        },
      },
    });
  });
  await page.route("**/api/auth/token*", (r) => {
    expect(consumed).toBe(true);
    tokenRequested = true;
    return r.fulfill({ json: { token: jwt } });
  });
  await expect(
    page.getByRole("button", { name: "Đăng nhập Google", exact: true }),
  ).toBeEnabled();
  await page.evaluate(
    (s) =>
      sessionStorage.setItem(
        "oathfront.auth-intent",
        JSON.stringify({
          commandId: crypto.randomUUID(),
          keepMatchId: null,
          sourceId: s.principal.id,
          csrf: s.csrfToken,
          kind: "claim",
        }),
      ),
    g,
  );
  await page.goto("/?neon_auth_session_verifier=fixture-only-verifier");
  await expect(
    page.getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toBeVisible();
  expect(consumed).toBe(true);
  expect(tokenRequested).toBe(true);
  expect(
    new URL(page.url()).searchParams.has("neon_auth_session_verifier"),
  ).toBe(false);
});
