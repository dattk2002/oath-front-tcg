// Interactive development only: managed identity + the separate persistent loopback app database.
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
const root = new URL("../", import.meta.url);
const read = async (file) =>
  parseEnv(await readFile(new URL(file, root), "utf8"));
try {
  const neon = await read(".env.neon.local"),
    api = await read(".env.auth-app.local");
  if (!["127.0.0.1", "localhost"].includes(new URL(api.DATABASE_URL).hostname))
    throw Error("Loopback app DB required");
  if (!neon.NEON_AUTH_BASE_URL || !neon.NEON_AUTH_JWKS_URL)
    throw Error("Managed auth config required");
  let auth;
  try {
    auth = await read(".env.auth.local");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    auth = { NEON_AUTH_COOKIE_SECRET: randomBytes(32).toString("hex") };
    await writeFile(
      new URL(".env.auth.local", root),
      `NEON_AUTH_COOKIE_SECRET=${auth.NEON_AUTH_COOKIE_SECRET}\n`,
      { mode: 0o600, flag: "wx" },
    );
  }
  if (!auth.NEON_AUTH_COOKIE_SECRET || auth.NEON_AUTH_COOKIE_SECRET.length < 32)
    throw Error("Cookie secret required");
  const env = {
    ...process.env,
    ...neon,
    ...api,
    ...auth,
    OATHFRONT_INTERACTIVE: "1",
    APP_ORIGIN: "http://localhost:3000",
    API_ORIGIN: "http://127.0.0.1:3001",
    PUBLIC_REALTIME_URL: "ws://127.0.0.1:3001/realtime/matches",
  };
  const server = spawn(process.execPath, ["apps/api/dist/server.mjs"], {
    cwd: root,
    env: { ...env, PORT: "3001", HOST: "127.0.0.1" },
    stdio: "inherit",
  });
  const web = spawn(
    "pnpm",
    [
      "--filter",
      "@oathfront/web",
      "exec",
      "next",
      "dev",
      "--webpack",
      "--hostname",
      "localhost",
      "--port",
      "3000",
    ],
    { cwd: root, env, stdio: "inherit" },
  );
  const close = () => {
    server.kill("SIGTERM");
    web.kill("SIGTERM");
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  server.once("exit", close);
  web.once("exit", close);
  console.info(
    "Interactive Google test: http://localhost:3000 (no account selected automatically).",
  );
} catch {
  console.error(
    "Local auth startup failed; verify ignored local environment files and loopback database.",
  );
  process.exitCode = 1;
}
