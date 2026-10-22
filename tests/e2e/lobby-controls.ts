import { expect, type Page } from "@playwright/test";

export async function selectLobbyHero(page: Page, heroId: string) {
  const radio = page.locator(`input[name="hero"][value="${heroId}"]`);
  const previous = page.getByRole("button", {
    name: "Previous heroes",
    exact: true,
  });
  await expect(previous).toBeVisible();
  while (await previous.isEnabled()) await previous.click();
  const next = page.getByRole("button", { name: "Next heroes", exact: true });
  while (!(await radio.count()) && (await next.isEnabled())) await next.click();
  await radio.check();
}
export async function revealAccountControls(page: Page) {
  const trigger = page.locator(".account-trigger");
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) === "false")
    await trigger.click();
}
