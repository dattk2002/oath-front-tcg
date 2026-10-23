import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
const [file, portText] = process.argv.slice(2),
  port = Number(portText ?? 3300);
if (
  !file ||
  !/^\.env\.[a-z0-9-]+\.local$/.test(file) ||
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535
)
  throw Error(
    "Usage: node scripts/create-compose-env.mjs .env.compose.local <free-port>",
  );
const lines = [
  "OATHFRONT_DB_OWNER_PASSWORD",
  "OATHFRONT_DB_RUNTIME_PASSWORD",
  "SESSION_SECRET",
  "UI_PROXY_SECRET",
].map((key) => `${key}=${randomBytes(32).toString("hex")}`);
writeFileSync(
  file,
  lines.join("\n") +
    `\nAPP_ORIGIN=http://localhost:${port}\nUI_PORT=${port}\nPUBLIC_REALTIME_URL=ws://localhost:${port}/realtime/matches\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Created distinct local Compose credentials in ignored0600 env; existing files are never overwritten",
);
