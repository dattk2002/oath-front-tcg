import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { ownerPool } from "../../packages/db/tests/helpers.js";
import { validateWire } from "../../packages/contracts/src/index.js";
const evidence =
  ".superpowers/sdd/2026-10-20-oathfront-implementation/task-9-evidence";
for (const faction of ["GOOD", "EVIL"] as const) {
  test(`guest preset mulligan UNIT and pass as ${faction}`, async ({
    page,
  }) => {
    const unexpected: string[] = [];
    const network: { path: string; status: number }[] = [];
    let commands = 0,
      expectedSessionErrors = 0;
    page.on("pageerror", (error) => unexpected.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        if (message.text().includes("status of 401")) expectedSessionErrors++;
        else unexpected.push(message.text());
      }
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith("/api/v1/")) {
        network.push({ path: url.pathname, status: response.status() });
        expect(url.origin).toBe("http://localhost:3100");
        if (url.pathname.endsWith("/commands")) commands++;
      }
    });
    if (process.env.OATHFRONT_E2E_PRODUCTION === "1")
      await page.route("**/*", async (route) => {
        if (route.request().resourceType() !== "document") {
          await route.continue();
          return;
        }
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: {
            ...response.headers(),
            "content-security-policy":
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'",
          },
        });
      });
    await page.goto("/");
    await page.getByRole("button", { name: "Chơi với bot" }).click();
    await page
      .getByRole("radio", {
        name: faction === "GOOD" ? "An Nhiên" : "Hắc Luyện",
        exact: false,
      })
      .check();
    await page.getByRole("button", { name: "Chọn bộ bài" }).click();
    await expect(page.getByText("30 / 30 lá", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Dùng bộ bài này" }).click();
    await page.getByRole("button", { name: "Bắt đầu trận" }).click();
    await expect(
      page.getByRole("heading", { name: "Đổi bài đầu trận" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận đổi bài" }).click();
    await expect(
      page.getByRole("heading", { name: "Đổi bài đầu trận" }),
    ).not.toBeVisible();
    let played = false;
    for (let step = 0; step < 16 && !played; step++) {
      const pass = page.getByRole("button", {
          name: "Kết thúc hành động",
          exact: true,
        }),
        keep = page.getByRole("button", { name: "Để dành", exact: true });
      await expect
        .poll(
          async () =>
            (await keep.isVisible())
              ? await keep.isEnabled()
              : await pass.isEnabled(),
          { timeout: 15000 },
        )
        .toBe(true);
      if (await keep.isVisible()) {
        await keep.click();
        continue;
      }
      const playable = page.locator('[data-playable-unit="true"]').first();
      if (await playable.count()) {
        // An invalid drag must cancel without a command or optimistic board change.
        const card = await playable.boundingBox();
        expect(card).not.toBeNull();
        const beforeCommands = commands;
        await page.mouse.move(
          card!.x + card!.width / 2,
          card!.y + card!.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(20, 110, { steps: 12 });
        await page.mouse.up();
        await expect(
          page.locator('.hand-card[aria-pressed="true"]'),
        ).toHaveCount(0);
        expect(commands).toBe(beforeCommands);
        const before = await page.getByTestId("own-energy").innerText();
        if (faction === "EVIL") {
          await playable.focus();
          await page.keyboard.press("Enter");
        } else await playable.click();
        const lane = page
          .locator('button[data-legal-target="true"][data-lane-id]')
          .first();
        if (faction === "EVIL") {
          await lane.focus();
          await page.keyboard.press("Enter");
        } else await lane.click();
        await expect(page.locator('[data-own-unit="true"]')).toHaveCount(1);
        await expect(page.getByTestId("own-energy")).not.toHaveText(before);
        played = true;
      } else await pass.click();
    }
    expect(played).toBe(true);
    await mkdir(evidence, { recursive: true });
    for (const [name, width, height] of [
      ["desktop", 1440, 900],
      ["tablet", 1024, 768],
      ["mobile", 375, 812],
    ] as const) {
      await page.setViewportSize({ width, height });
      if (name === "mobile") {
        await expect(
          page.getByRole("heading", {
            name: "Xoay ngang hoặc dùng màn hình lớn để vào trận",
          }),
        ).toBeVisible();
        await page.getByText("Đọc bàn hiện tại", { exact: true }).click();
      } else
        await expect(
          page.getByRole("region", { name: "Bàn năm lộ" }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `${evidence}/${faction.toLowerCase()}-${name}.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("button", { name: "Kết thúc hành động", exact: true })
      .click();
    await expect(page.getByTestId("command-status")).not.toContainText(
      "Đang xác nhận",
    );
    const matchUrl = page.url(),
      id = matchUrl.split("/").at(-1)!;
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Bàn năm lộ" }),
    ).toBeVisible();
    expect(page.url()).toBe(matchUrl);
    const received = await page.request.get(`/api/v1/matches/${id}`);
    expect(received.status()).toBe(200);
    expect(received.headers()["cache-control"]).toContain("no-store");
    const snapshot: unknown = await received.json();
    expect(validateWire("CommandResponse", snapshot)).toBe(true);
    if (!validateWire("CommandResponse", snapshot))
      throw Error("invalid snapshot");
    expect(snapshot.view.self.side).toBe(faction);
    expect(snapshot.revision).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId("phase-label")).toContainText(
      /Triển khai Ác|Lượt Thiện|Mưu kế Ác|Giao tranh|Bắt đầu lượt|Kết thúc lượt/,
    );
    const owner = ownerPool();
    try {
      const rows = (
        await owner.query(
          "SELECT action->'action'->>'kind' AS kind FROM match_action_journal WHERE match_id=$1 AND origin='HUMAN' ORDER BY step_seq",
          [id],
        )
      ).rows;
      expect(rows.map((row) => row.kind)).toEqual(
        expect.arrayContaining(["MULLIGAN", "PLAY_UNIT", "PASS_PHASE"]),
      );
      // The live ADVANCE pump may commit after the GET and before this SQL read.
      const stored = await owner.query(
        "SELECT revision FROM matches WHERE id=$1",
        [id],
      );
      expect(Number(stored.rows[0]?.revision)).toBeGreaterThanOrEqual(
        snapshot.revision,
      );
    } finally {
      await owner.end();
    }
    expect(network).toContainEqual({ path: "/api/v1/decks", status: 200 });
    expect(unexpected).toEqual([]);
    await writeFile(
      `${evidence}/${faction.toLowerCase()}-network.json`,
      JSON.stringify(
        {
          faction,
          revision: snapshot.revision,
          phase: snapshot.view.phase,
          expectedUnauthenticatedSessionResponses: expectedSessionErrors,
          unexpectedConsoleErrors: unexpected,
          network,
        },
        null,
        2,
      ),
    );
  });
}
test("exact versioned proxy preserves JSON and reserves local auth/unknown routes", async ({
  request,
}) => {
  const catalog = await request.get("/api/v1/catalog/core_v1");
  expect(catalog.status()).toBe(200);
  expect(catalog.headers()["content-type"]).toContain("application/json");
  const missing = await request.get("/api/v1/not-a-route");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-type"]).toContain("application/json");
  for (const path of [
    "/api/auth/session",
    "/api/unknown",
    "/unknown-product-route",
  ]) {
    const result = await request.get(path);
    expect(result.status()).toBe(404);
    expect(await result.text()).not.toContain("Mỗi lộ là một lời thề.");
  }
});
test("lost create response restores displayed choices on reload and retries identical request", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Chơi với bot" }).click();
  await page.getByRole("radio", { name: "Hắc Luyện", exact: false }).check();
  await page.getByRole("button", { name: "Chọn bộ bài" }).click();
  await page.getByRole("button", { name: "Dùng bộ bài này" }).click();
  await page
    .getByRole("combobox", { name: /^Hero bot/ })
    .selectOption("H_G_BP");
  await page.getByRole("combobox", { name: /^Độ khó/ }).selectOption("NORMAL");
  const sent: unknown[] = [];
  let drop = true;
  await page.route("**/api/v1/matches", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    sent.push(route.request().postDataJSON());
    if (drop) {
      drop = false;
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Bắt đầu trận" }).click();
  await expect(page.getByText(/Chưa xác định kết quả tạo trận/)).toBeVisible();
  let failDecks = true;
  await page.route("**/api/v1/decks", async (route) => {
    if (failDecks) {
      failDecks = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    } else await route.continue();
  });
  await page.reload();
  await expect(
    page.getByText("Không tải được bộ bài mẫu. Hãy thử lại."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
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
    page.getByRole("combobox", { name: /^Hero bot/ }),
  ).toBeDisabled();
  await expect(
    page.getByText("Hắc Luyện · Phe Ác", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Thử lại tạo trận", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đổi bài đầu trận" }),
  ).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
});
