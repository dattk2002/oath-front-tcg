import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { testOrigin, testApiOrigin } from "./test-origin.js";
import { ownerPool } from "../../packages/db/tests/helpers.js";

test("fresh Google identity replaces a stale browser cookie with a 30-day session that survives reload", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const identity = await page.request.post(
    `${testApiOrigin}/__fixture/identity`,
    {
      data: { subject: "stale-cookie-" + randomUUID() },
    },
  );
  expect(identity.status()).toBe(200);
  const { token } = await identity.json();
  const previous = await page.request.post("/api/v1/auth/exchange", {
    headers: { Origin: testOrigin },
    data: { commandId: randomUUID(), identityToken: token },
  });
  expect(previous.status()).toBe(200);
  const previousState = await previous.json();
  const stale = (await context.cookies()).find(
    (cookie) => cookie.name === "__Host-ngulo-session",
  )!.value;
  const owner = ownerPool();
  try {
    await owner.query("DELETE FROM app_sessions WHERE principal_id=$1", [
      previousState.principal.id,
    ]);
  } finally {
    await owner.end();
  }
  // Only the external identity provider is substituted; Next, API, cookies,
  // identity verification and the isolated PostgreSQL database are real.
  await page.route("**/api/auth/sign-in/social", (route) =>
    route.fulfill({ json: { redirect: false } }),
  );
  await page.route("**/api/auth/token*", (route) =>
    route.fulfill({ json: { token } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const requested = page.waitForResponse("**/api/auth/sign-in/social");
  await page
    .getByRole("button", { name: "Sign in with Google", exact: true })
    .click();
  await requested;
  const exchanged = page.waitForResponse("**/api/v1/auth/exchange");
  await page.reload();
  expect((await exchanged).status()).toBe(200);
  await expect(page.locator(".campaign-account-link")).not.toHaveText(
    "Sign in",
  );
  await expect
    .poll(() =>
      page.evaluate(() => sessionStorage.getItem("oathfront.auth-intent")),
    )
    .toBeNull();
  const current = await page.request.get("/api/v1/session");
  expect(current.status()).toBe(200);
  const state = await current.json();
  expect(state.principal.kind).toBe("ACCOUNT");
  expect(state.principal.id).toBe(previousState.principal.id);
  const lifetime = Date.parse(state.sessionExpiresAt) - Date.now();
  expect(lifetime).toBeGreaterThan(30 * 86400000 - 60000);
  expect(lifetime).toBeLessThanOrEqual(30 * 86400000);
  const cookie = (await context.cookies()).find(
    (c) => c.name === "__Host-ngulo-session",
  )!;
  expect(cookie.value).not.toBe(stale);
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.secure).toBe(true);
  expect(
    Math.abs(cookie.expires - Date.parse(state.sessionExpiresAt) / 1000),
  ).toBeLessThan(2);
  await page.reload();
  await expect(page.locator(".campaign-account-link")).not.toHaveText(
    "Sign in",
  );
  expect((await page.request.get("/api/v1/session")).status()).toBe(200);
  expect(errors).toEqual([]);
});
