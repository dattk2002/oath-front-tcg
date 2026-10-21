import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { chooseBotAction } from "../../packages/bot/src/index.js";
import { validateWire } from "../../packages/contracts/src/index.js";
import type { CommandResponse, PlayerAction } from "../../packages/contracts/src/index.js";
import { parseConcurrency } from "./concurrency.js";
try {
  process.loadEnvFile(".env.test.local");
} catch {
  /* CI supplies environment. */
}
const concurrency = parseConcurrency(process.argv);
const db = new URL(process.env.TEST_DATABASE_URL ?? "");
if (
  process.env.OATHFRONT_TEST_DATABASE !== "1" ||
  !["localhost", "127.0.0.1"].includes(db.hostname) ||
  !db.pathname.endsWith("_test") ||
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 20
)
  throw Error(
    "Load tool requires explicit local *_test database and concurrency1..20",
  );
const started = performance.now();
const child = spawn(process.execPath, ["apps/api/dist/server.mjs"], {
  env: {
    ...process.env,
    DATABASE_URL: db.href,
    APP_ORIGIN: "https://load.oathfront.test",
    SESSION_SECRET: randomBytes(32).toString("hex"),
    PORT: "0",
    HOST: "127.0.0.1",
    CLIENT_IP_MODE: "direct",
    VERCEL: "0",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stderr.on("data", (c) => {
  logs += String(c);
});
const endpoint = await new Promise<string>((resolve, reject) => {
  const timer = setTimeout(
    () => reject(Error("Local API startup timeout")),
    10000,
  );
  child.once("exit", () => {
    clearTimeout(timer);
    reject(Error("Local API exited"));
  });
  let buffer = "";
  child.stdout.on("data", (c) => {
    buffer += String(c);
    for (const line of buffer.split("\n")) {
      try {
        const row = JSON.parse(line);
        if (row.event === "listening") {
          clearTimeout(timer);
          resolve(`http://127.0.0.1:${row.port}`);
        }
      } catch {
        /* partial JSON */
      }
    }
  });
});
const coldStartMs = performance.now() - started,
  warm: number[] = [],
  automatic: number[] = [];
try {
  await Promise.all(
    Array.from({ length: concurrency }, async (_, index) => {
      const origin = "https://load.oathfront.test";
      const guest = await fetch(endpoint + "/api/v1/guest", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({
          commandId: randomUUID(),
          recoverySecret: randomBytes(32).toString("base64url"),
        }),
      });
      if (guest.status !== 201) throw Error(`Guest HTTP${guest.status}`);
      const session = await guest.json();
      const headers = {
        origin,
        "content-type": "application/json",
        cookie: guest.headers.get("set-cookie")!.split(";")[0]!,
        "x-csrf-token": session.csrfToken,
      };
      const created = await fetch(endpoint + "/api/v1/matches", {
        method: "POST",
        headers,
        body: JSON.stringify({
          commandId: randomUUID(),
          mode: "SKIRMISH",
          deck: { kind: "PRESET", presetId: index % 2 ? "D_E_FX" : "D_G_BV" },
          opponentHeroId: index % 2 ? "H_G_BV" : "H_E_FX",
          difficulty: "NORMAL",
          expectedContentVersion: "core_v1",
        }),
      });
      if (created.status !== 201) throw Error(`Create HTTP${created.status}`);
      let current: CommandResponse = await created.json();
      async function command(action: PlayerAction) {
        const t = performance.now();
        const response = await fetch(
          endpoint + `/api/v1/matches/${current.view.matchId}/commands`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              commandId: randomUUID(),
              expectedRevision: current.revision,
              action,
            }),
          },
        );
        const body: unknown = await response.json();
        const elapsed = performance.now() - t;
        if (response.status !== 200 || !validateWire("CommandResponse", body))
          throw Error(`Command HTTP${response.status}`);
        current = body;
        warm.push(elapsed);
        if (action.kind === "ADVANCE") automatic.push(elapsed);
      }
      for (
        let step = 0;
        step < 24 && current.view.lifecycle === "ACTIVE";
        step++
      )
        await command(
          current.needsAdvance
            ? { kind: "ADVANCE" }
            : chooseBotAction(current.view, current.view.legalActions, {
                difficulty: "NORMAL",
                randomState: [1, 2, 3, 4],
                observationMemory: [],
              }).action,
        );
      if (current.view.lifecycle === "ACTIVE")
        await command({ kind: "SURRENDER" });
    }),
  );
  const p95 = (xs: number[]) =>
    [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1] ?? 0;
  const result = {
    scope:
      "local compiled Node HTTP + PostgreSQL; 24 PvE commands/match then explicit surrender",
    concurrency,
    coldStartMs,
    warmActions: warm.length,
    warmP95Ms: p95(warm),
    autoBatches: automatic.length,
    autoP95Ms: p95(automatic),
    autoMaxMs: Math.max(...automatic),
    warmTargetPassed: p95(warm) <= 500,
    autoTargetPassed: Math.max(...automatic) <= 1000,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.warmTargetPassed || !result.autoTargetPassed)
    process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await once(child, "exit");
  if (logs)
    console.error(
      "API emitted diagnostic output; inspect sanitized local operational log",
    );
}
