import { createPool } from "@oathfront/db";
import type { Pool } from "@oathfront/db";
import { buildApp } from "./app.js";
let pool: Pool | undefined;
let app: ReturnType<typeof buildApp> | undefined;
try {
  const { DATABASE_URL, APP_ORIGIN, SESSION_SECRET } = process.env;
  if (!DATABASE_URL || !APP_ORIGIN || !SESSION_SECRET)
    throw new Error("Explicit server configuration required");
  pool = createPool({ connectionString: DATABASE_URL, purpose: "runtime" });
  app = buildApp({
    pool,
    origin: APP_ORIGIN,
    secret: SESSION_SECRET,
    logger: true,
  });
  await app.listen({
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? "0.0.0.0",
  });
  const address = app.server.address();
  if (!address || typeof address === "string")
    throw new Error("HTTP listener unavailable");
  process.stdout.write(
    JSON.stringify({ event: "listening", port: address.port }) + "\n",
  );
  async function close() {
    await app?.close();
    await pool?.end();
  }
  const shutdown = () => {
    void close().catch(() => {
      process.stderr.write("HTTP shutdown failed\n");
      process.exitCode = 1;
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
} catch {
  // URL parsers/DB drivers can attach credentials to exception metadata. Never log raw startup errors.
  process.stderr.write("HTTP startup failed\n");
  await app?.close().catch(() => undefined);
  await pool?.end().catch(() => undefined);
  process.exitCode = 1;
}
