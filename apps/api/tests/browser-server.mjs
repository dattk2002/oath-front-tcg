// Dedicated browser fixture: real compiled production app + explicitly disposable local DB.
// Playwright runs serially after Vitest DB resetters have stopped.
import { testApiPort, testOrigin } from "../../../tests/e2e/test-origin.ts";
import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } from "jose";
import { neonJwtVerifier } from "../src/auth/neon-jwt.ts";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import {
  ownerPool,
  setupDatabase,
  resetDatabase,
} from "../../../packages/db/tests/helpers.ts";
import { buildApp } from "../dist/app.mjs";
import { importLiveContent, liveBundle } from "../src/editorial/admin.ts";
const owner = ownerPool();
await setupDatabase(owner);
await resetDatabase(owner);
const liveContent = process.env.OATHFRONT_E2E_LIVE_CONTENT === "1";
let fixtureTime = Date.parse(
  process.env.OATHFRONT_E2E_CLOCK ?? "2026-10-26T01:00:00Z",
);
if (liveContent) await importLiveContent(owner, liveBundle);
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
  max: 5,
});
const issuer = "https://identity.oathfront.test";
const { privateKey, publicKey } = await generateKeyPair("EdDSA");
const verifyIdentity = neonJwtVerifier({
  ...(liveContent ? { now: () => new Date(fixtureTime) } : {}),
  baseUrl: issuer + "/db/auth",
  jwksUrl: issuer + "/db/auth/jwks",
  key: createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: "fixture", alg: "EdDSA" }],
  }),
});
const app = buildApp({
  ...(liveContent ? { now: () => new Date(fixtureTime) } : {}),
  verifyIdentity,
  ...(process.env.OATHFRONT_E2E_INGRESS === "1"
    ? { ipTrust: { mode: "trusted-next", secret: process.env.UI_PROXY_SECRET } }
    : {}),
  pool,
  realtime: {
    url: `ws://127.0.0.1:${testApiPort}/realtime/matches`,
    databaseUrl: process.env.TEST_DATABASE_URL,
  },
  origin: testOrigin,
  secret: randomBytes(32).toString("hex"),
});
// This route exists only in this explicitly disposable loopback test harness.
app.post("/__fixture/identity", async (req) => {
  const subject =
    typeof req.body?.subject === "string" ? req.body.subject : "browser-test";
  return {
    token: await new SignJWT({ name: "Tài khoản kiểm thử" })
      .setProtectedHeader({ alg: "EdDSA", kid: "fixture" })
      .setSubject(subject)
      .setIssuer(issuer)
      .setAudience(issuer)
      .setIssuedAt(liveContent ? Math.floor(fixtureTime / 1000) : undefined)
      .setExpirationTime(
        liveContent ? Math.floor(fixtureTime / 1000) + 900 : "15m",
      )
      .sign(privateKey),
  };
});
if (liveContent)
  app.post("/__fixture/clock", async (req, reply) => {
    const next = Date.parse(req.body?.now);
    if (!Number.isFinite(next))
      return reply.status(400).send({ error: "Invalid fixture time" });
    fixtureTime = next;
    return { serverNow: new Date(fixtureTime).toISOString() };
  });
await app.services.repository.registerRelease();
await app.listen({ host: "127.0.0.1", port: testApiPort });
console.info("Browser API fixture ready");
async function close() {
  await app.close();
  await pool.end();
  await owner.end();
}
process.once("SIGTERM", () => {
  void close();
});
process.once("SIGINT", () => {
  void close();
});
