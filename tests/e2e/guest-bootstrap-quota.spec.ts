import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { ownerPool } from "../../packages/db/tests/helpers.js";
import { create } from "./recovery-fixtures.js";
import { testOrigin } from "./test-origin.js";

test("a saturated guest quota from a prior fixture does not block a new match", async ({
  page,
}) => {
  await create(page);
  await page.context().clearCookies();

  const owner = ownerPool();
  try {
    const seeded = await owner.query(
      "UPDATE rate_limit_windows SET count=20 WHERE scope='GUEST_BOOTSTRAP' RETURNING count",
    );
    expect(seeded.rows).toEqual([{ count: 20 }]);
  } finally {
    await owner.end();
  }

  const blocked = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(blocked.status()).toBe(429);

  const next = await create(page);
  expect(next.id).toMatch(/^[a-f0-9-]{36}$/);
});
