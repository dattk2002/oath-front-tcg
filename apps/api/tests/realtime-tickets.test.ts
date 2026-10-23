import { createHmac } from "node:crypto";
import { expect, it } from "vitest";
import { verifyTicket } from "../src/realtime/tickets.js";
const secret = "test-session-secret-".repeat(3);
const now = new Date("2026-10-23T00:00:00.000Z");
const valid = {
  audience: "oathfront:match-realtime:v1",
  sessionId: "13c9e34e-b619-4570-9e67-17e1c26ac64f",
  principalId: "e709086b-10e2-4017-8dbf-2f155c93cfd6",
  matchId: "bcfa3c42-dfe0-4ce9-8c42-bcad23b800a8",
  issuedAt: 1792713600000,
  expiresAt: 1792713630000,
};
function signed(claims: unknown, domain = "oathfront:match-realtime:v1") {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(domain + "\0" + payload)
    .digest("base64url");
  return payload + "." + signature;
}
it("accepts the scoped ticket and rejects validly signed claims with wrong audience, lifetime or shape", () => {
  expect(verifyTicket(signed(valid), secret, now).matchId).toBe(
    "bcfa3c42-dfe0-4ce9-8c42-bcad23b800a8",
  );
  for (const claims of [
    { ...valid, audience: "oathfront:csrf:v1" },
    { ...valid, expiresAt: 1792713630001 },
    { ...valid, issuedAt: 1792713600001 },
    { ...valid, expiresAt: 1792713600000 },
    { ...valid, matchId: "invalid" },
    { ...valid, privateState: {} },
  ])
    expect(() => verifyTicket(signed(claims), secret, now)).toThrow();
  expect(() =>
    verifyTicket(signed(valid, "oathfront:csrf:v1"), secret, now),
  ).toThrow();
  expect(() =>
    verifyTicket(signed(valid), "another-secret".repeat(4), now),
  ).toThrow();
});
