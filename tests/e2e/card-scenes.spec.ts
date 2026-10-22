import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { testOrigin } from "./test-origin.js";
import { evidencePath } from "./evidence-path.js";

const evidence = evidencePath(
  "card-scenes",
  "docs/implementation/evidence/card-scenes",
);

test("illustrated card faces keep rarity centered and inspection usable across screen sizes", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const guest = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(guest.status()).toBe(201);
  await page.goto("/decks/new?hero=H_G_BV");
  await expect(page.locator(".collection-card").first()).toBeVisible();
  await mkdir(evidence, { recursive: true });

  for (const [width, height] of [
    [1440, 900],
    [1024, 640],
    [768, 1024],
    [375, 812],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const geometry = await page
      .locator(".collection-card .card-face")
      .evaluateAll((faces) =>
        faces.map((face) => {
          const body = face.getBoundingClientRect();
          const gem = face
            .querySelector(".rarity-gem")!
            .getBoundingClientRect();
          const plate = face
            .querySelector(".card-face-plate")!
            .getBoundingClientRect();
          const footer = face
            .querySelector(".card-face-footer")!
            .getBoundingClientRect();
          const title = face.querySelector(".card-face-title")!;
          return {
            centerOffset: Math.abs(
              gem.left + gem.width / 2 - body.left - body.width / 2,
            ),
            gemBottom: gem.bottom - body.bottom,
            footerGap: footer.top - plate.bottom,
            titleOverflow: title.scrollWidth - title.clientWidth,
            lowerHalf: gem.top > body.top + body.height / 2,
          };
        }),
      );
    expect(geometry.length).toBeGreaterThan(8);
    for (const item of geometry) {
      expect(item.centerOffset).toBeLessThanOrEqual(2);
      expect(item.gemBottom).toBeLessThanOrEqual(4);
      expect(item.footerGap).toBeGreaterThanOrEqual(-2);
      expect(item.titleOverflow).toBeLessThanOrEqual(1);
      expect(item.lowerHalf).toBe(true);
    }

    for (const kind of ["unit", "trick"]) {
      const card = page
        .locator(`.collection-card:has(.card-face[data-kind="${kind}"])`)
        .first();
      const title = card.getByRole("button").first();
      const name = (await title.innerText()).trim();
      await title.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const face = dialog.locator('.card-face[data-surface="inspect"]');
      await expect(face.locator(".card-face-title")).toHaveText(name);
      await expect(face.locator(".card-face-rules")).not.toBeEmpty();
      await expect(face.locator(".card-face-stat")).toHaveCount(
        kind === "unit" ? 2 : 0,
      );
      await expect(face.locator(".rarity-gem")).toHaveCount(1);
      const fullText = await face
        .locator(".card-face-rules")
        .evaluate((node) => ({
          overflow: node.scrollHeight - node.clientHeight,
          size: parseFloat(getComputedStyle(node).fontSize),
        }));
      expect(fullText.overflow).toBeLessThanOrEqual(1);
      expect(fullText.size).toBeGreaterThanOrEqual(12);
      await page.screenshot({
        path: `${evidence}/${kind}-inspect-${width}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(title).toBeFocused();
    }
  }

  const card = page.locator(".collection-card").first();
  await card.getByRole("button", { name: /^Add / }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.getByLabel("1 of 2 copies")).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
});
