// Dedicated browser fixture: real compiled production app + explicitly disposable local DB.
// Playwright runs serially after Vitest DB resetters have stopped.
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
const app = buildApp({
  pool,
  origin: "http://localhost:3100",
  secret: randomBytes(32).toString("hex"),
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
