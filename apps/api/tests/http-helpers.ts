import { beforeAll, beforeEach, afterAll } from "vitest";
import { Pool } from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import {
  ownerPool,
  setupDatabase,
  resetDatabase,
} from "../../../packages/db/tests/helpers.js";
import { buildApp } from "../src/app.js";
export const origin = "https://oathfront.test";
export const createBody = () => ({
  commandId: randomUUID(),
  mode: "SKIRMISH",
  deck: { kind: "PRESET", presetId: "D_G_BV" },
  opponentHeroId: "H_E_FX",
  difficulty: "EASY",
  expectedContentVersion: "core_v1",
});
export function harness(options: { commandDeadlineMs?: number } = {}) {
  const owner = ownerPool();
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    max: 5,
  });
  let time = new Date();
  const app = buildApp({
    ...options,
    pool,
    origin,
    secret: randomBytes(32).toString("hex"),
    now: () => time,
  });
  beforeAll(async () => {
    await setupDatabase(owner);
    await app.ready();
  });
  beforeEach(async () => {
    await resetDatabase(owner);
    await app.services.repository.registerRelease();
    time = new Date();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
    await owner.end();
  });
  async function guest(
    body = {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  ) {
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/guest",
      headers: { origin },
      payload: body,
    });
    return {
      r,
      body,
      cookie: String(r.headers["set-cookie"]).split(";")[0]!,
      csrf: r.json().csrfToken,
      id: r.json().principal?.id,
    };
  }
  return {
    app,
    owner,
    pool,
    guest,
    setTime: (date: Date) => {
      time = date;
    },
    headers: (g: { cookie: string; csrf: string }) => ({
      cookie: g.cookie,
      origin,
      "x-csrf-token": g.csrf,
    }),
  };
}
