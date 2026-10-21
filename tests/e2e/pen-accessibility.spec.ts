import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public account disclosure exposes state and keyboard access", async ({
  page,
}) => {
  await page.goto("/");
  const account = page.getByRole("button", { name: "Sign in", exact: true });
  await expect(account).toHaveAttribute("aria-expanded", "false");
  await account.focus();
  await page.keyboard.press("Enter");
  await expect(account).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Sign in with Google", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Close account controls" }).click();
  await expect(account).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in with Google", exact: true }),
  ).toBeFocused();
});

test("campaign surfaces retain contrast, semantics and reflow", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 720, 375]) {
    await page.setViewportSize({ width, height: width === 720 ? 450 : 900 });
    for (const path of [
      "/",
      "/explore/heroes",
      "/explore/heroes/H_G_BV",
      "/news",
      "/events/first-oath-play-session",
      "/game-features",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        audit.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        `${path} at ${width}`,
      ).toEqual([]);
    }
  }
});

test("missing profile artwork can retry without losing hero identity or actions", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/heroes/briar/bust.webp", (route) =>
    fail ? route.fulfill({ status: 404, body: "missing" }) : route.continue(),
  );
  await page.goto("/explore/heroes/H_G_BV");
  await expect(
    page.getByRole("heading", { name: "Briar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry artwork" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose deck" })).toBeEnabled();
  fail = false;
  await page.getByRole("button", { name: "Retry artwork" }).click();
  await expect
    .poll(() =>
      page
        .locator(".profile-portrait img")
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Retry artwork" })).toHaveCount(
    0,
  );
});

test("hero card motion settles on reduction and rapid route changes preserve content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/explore/heroes");
  const hero = page.getByRole("link", { name: "Briar — The Living Bastion" });
  await hero.focus();
  const art = hero.locator("[data-campaign-card-art]");
  await expect
    .poll(() =>
      art.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m22),
    )
    .toBeGreaterThan(1);
  await page.getByRole("link", { name: "All", exact: true }).focus();
  await expect
    .poll(() =>
      art.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m22),
    )
    .toBe(1);
  await hero.focus();
  await expect
    .poll(() =>
      art.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m22),
    )
    .toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(art).toHaveCSS("transform", "none");
  await expect(hero).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Briar", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All heroes" }).click();
  await page.getByRole("link", { name: "Ashen Court", exact: true }).click();
  await expect(page.locator(".campaign-hero-card")).toHaveCount(3);
  await expect(page.locator("[data-campaign-reveal]")).toHaveCSS(
    "opacity",
    "1",
  );
  expect(errors).toEqual([]);
});
