import { expect, test } from "@playwright/test";

test("campaign actions remain separate from following sections with enlarged or fallback text", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["double-text", "fallback-font"] as const) {
      for (const [path, content, following] of [
        ["/", ".campaign-home-copy", ".campaign-home-summary"],
        [
          "/explore/heroes/H_G_BV",
          ".campaign-profile-actions",
          ".campaign-power-section",
        ],
        [
          "/game-features",
          ".feature-panel:first-child .feature-stage-copy > .campaign-button",
          ".feature-panel:nth-child(2)",
        ],
        [
          "/news",
          ".editorial-masthead > div:first-child",
          ".editorial-list-section",
        ],
      ]) {
        await page.goto(path!);
        await expect(page.locator("main h1")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        if (mode === "fallback-font") {
          await page.addStyleTag({
            content: 'body { --campaign-display: "Noto Sans", sans-serif; }',
          });
        } else {
          await page.evaluate(() => {
            // Snapshot every original size first; avoid compounding inheritance.
            const text = Array.from(
              document.querySelectorAll<HTMLElement>("body *"),
            )
              .filter((el) =>
                Array.from(el.childNodes).some(
                  (node) =>
                    node.nodeType === Node.TEXT_NODE &&
                    node.textContent?.trim(),
                ),
              )
              .map(
                (el) =>
                  [el, parseFloat(getComputedStyle(el).fontSize)] as const,
              );
            text.forEach(([el, size]) => {
              el.style.fontSize = `${size * 2}px`;
            });
          });
        }
        const end = await page
          .locator(content!)
          .evaluate((el) => el.getBoundingClientRect().bottom);
        const start = await page
          .locator(following!)
          .evaluate((el) => el.getBoundingClientRect().top);
        expect(
          start - end,
          `${path} ${width} ${mode}: section separation`,
        ).toBeGreaterThanOrEqual(24);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${path} ${width} ${mode}: horizontal overflow`,
        ).toBe(true);
      }
    }
  }
});
