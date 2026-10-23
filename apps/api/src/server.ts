import { waitUntil, attachDatabasePool } from "@vercel/functions";
import { shutdownWithin } from "./shutdown.js";
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
  if (process.env.VERCEL === "1") attachDatabasePool(pool);
  const mode = process.env.CLIENT_IP_MODE ?? "direct";
  if (
    !["direct", "hosted-proxy", "trusted-next"].includes(mode) ||
    (mode === "hosted-proxy" && process.env.VERCEL !== "1") ||
    (mode !== "direct" && (process.env.UI_PROXY_SECRET?.length ?? 0) < 32)
  )
    throw new Error("Invalid trusted ingress configuration");
  app = buildApp({
    pool,
    origin: APP_ORIGIN,
    secret: SESSION_SECRET,
    logger: true,
    ...(process.env.PUBLIC_REALTIME_URL
      ? {
          realtime: {
            url: process.env.PUBLIC_REALTIME_URL,
            databaseUrl: DATABASE_URL,
          },
        }
      : {}),
    ipTrust: {
      mode: mode as "direct" | "hosted-proxy" | "trusted-next",
      ...(process.env.UI_PROXY_SECRET
        ? { secret: process.env.UI_PROXY_SECRET }
        : {}),
    },
    ...(process.env.VERCEL === "1" ? { extendLifetime: waitUntil } : {}),
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
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    void shutdownWithin(
      () => app!.close(),
      () => pool!.end(),
    ).then(
      (drained) => {
        if (!drained) {
          process.stderr.write(
            "HTTP shutdown deadline exceeded; outstanding results unknown\n",
          );
          process.exit(1);
        }
      },
      () => {
        process.stderr.write("HTTP shutdown failed\n");
        process.exit(1);
      },
    );
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
