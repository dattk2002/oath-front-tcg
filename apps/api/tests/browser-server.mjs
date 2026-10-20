// Dedicated browser fixture: real compiled production app + explicitly disposable local DB.
// Playwright runs serially after Vitest DB resetters have stopped.
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
const owner = ownerPool();
await setupDatabase(owner);
await resetDatabase(owner);
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
  max: 5,
});
const issuer = "https://identity.oathfront.test";
const { privateKey, publicKey } = await generateKeyPair("EdDSA");
const verifyIdentity = neonJwtVerifier({
  baseUrl: issuer + "/db/auth",
  jwksUrl: issuer + "/db/auth/jwks",
  key: createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: "fixture", alg: "EdDSA" }],
  }),
});
const app = buildApp({
  verifyIdentity,
  pool,
  origin: process.env.OATHFRONT_E2E_ORIGIN ?? "http://localhost:3200",
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
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(privateKey),
  };
});
await app.services.repository.registerRelease();
await app.listen({ host: "127.0.0.1", port: 3101 });
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
