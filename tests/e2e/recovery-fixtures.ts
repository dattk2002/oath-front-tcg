import { testOrigin } from "./test-origin.js";
import { expect, type Page } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { ownerPool } from "../../packages/db/tests/helpers.js";
import {
  advanceAutomatic,
  hashState,
} from "../../packages/game-engine/src/index.js";
import { mkdir, writeFile } from "node:fs/promises";
import {
  encodeCheckpoint,
  decodeCheckpoint,
} from "../../apps/api/src/matches/checkpoint.js";
import { ready, card, unit } from "../../packages/game-engine/tests/helpers.js";
import { pierceVolcano } from "../../packages/game-engine/tests/fixtures/combat-pierce-volcano.js";
import {
  validateWire,
  type CommandResponse,
} from "../../packages/contracts/src/index.js";
export async function create(page: Page, faction: "GOOD" | "EVIL" = "GOOD") {
  const guest = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(guest.status()).toBe(201);
  const auth = await guest.json();
  const catalog = await (
    await page.request.get("/api/v1/catalog/core_v1")
  ).json();
  const preset = catalog.presets.find(
    (p: { heroId: string }) =>
      p.heroId === (faction === "GOOD" ? "H_G_BP" : "H_E_FX"),
  );
  const made = await page.request.post("/api/v1/matches", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": auth.csrfToken,
    },
    data: {
      commandId: randomUUID(),
      mode: "SKIRMISH",
      deck: { kind: "PRESET", presetId: preset.presetId },
      opponentHeroId: faction === "GOOD" ? "H_E_FS" : "H_G_BV",
      difficulty: "EASY",
      expectedContentVersion: catalog.version,
    },
  });
  expect(made.status()).toBe(201);
  const dto = await made.json();
  return { id: dto.view.matchId as string, csrf: auth.csrfToken as string };
}
export async function snapshot(
  page: Page,
  id: string,
): Promise<CommandResponse> {
  const result = await page.request.get(`/api/v1/matches/${id}`);
  expect(result.status()).toBe(200);
  const data: unknown = await result.json();
  if (!validateWire("CommandResponse", data)) throw Error("Invalid snapshot");
  return data;
}
export async function blockFixture(page: Page, noTarget = false) {
  const match = await create(page);
  const state = pierceVolcano();
  state.matchId = match.id;
  state.eventSeq = 0;
  state.players.GOOD.energy.current = 0;
  const advanced = advanceAutomatic(state, { maxRoots: 8 });
  if (noTarget) {
    advanced.nextState.board[0]!.good = null;
    // The no-target variant also retains an earlier received reserve power for inspection.
    advanced.nextState.players.GOOD.reserve.push({
      instanceId: "d".repeat(32),
      definitionId: "P_B1",
      normalCost: 1,
    });
  }
  const owner = ownerPool();
  try {
    await owner.query("DELETE FROM match_events WHERE match_id=$1", [match.id]);
    for (const e of advanced.events)
      await owner.query(
        "INSERT INTO match_events(match_id,seq,event_id,root_id,kind,visibility,owner_side,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          match.id,
          e.sequence,
          e.eventId,
          e.rootId,
          e.kind,
          e.visibility,
          e.ownerSide,
          e.payload,
        ],
      );
    await owner.query(
      "UPDATE match_checkpoints SET state=$2,state_hash=$3,last_event_seq=$4 WHERE match_id=$1",
      [
        match.id,
        encodeCheckpoint(advanced.nextState),
        hashState(advanced.nextState),
        advanced.nextState.eventSeq,
      ],
    );
  } finally {
    await owner.end();
  }
  return match;
}
export async function command(
  page: Page,
  id: string,
  csrf: string,
  action: CommandResponse["view"]["legalActions"][number],
) {
  const current = await snapshot(page, id);
  const result = await page.request.post(`/api/v1/matches/${id}/commands`, {
    headers: { Origin: testOrigin, "X-CSRF-Token": csrf },
    data: {
      commandId: randomUUID(),
      expectedRevision: current.revision,
      action,
    },
  });
  expect(result.status()).toBe(200);
  return result.json();
}

export async function cardFixture(page: Page, trick = false) {
  const match = await create(page, "EVIL");
  const state = ready();
  state.matchId = match.id;
  state.humanSide = "EVIL";
  state.phase = trick ? "EVIL_TRICKS" : "EVIL_DEPLOY";
  state.activeSide = "EVIL";
  state.eventSeq = 0;
  state.players.EVIL.hand = [];
  const instanceId = card(state, trick ? "F06" : "EC01", "EVIL");
  if (trick) unit(state, "GC01", "GOOD", 1);
  const owner = ownerPool();
  try {
    await owner.query("DELETE FROM match_events WHERE match_id=$1", [match.id]);
    await owner.query(
      "UPDATE match_checkpoints SET state=$2,state_hash=$3,last_event_seq=0 WHERE match_id=$1",
      [match.id, encodeCheckpoint(state), hashState(state)],
    );
  } finally {
    await owner.end();
  }
  return { ...match, instanceId };
}

export async function captureEvidence(
  page: Page,
  name: string,
  consoleErrors?: readonly string[],
) {
  const dir = `.superpowers/sdd/2026-10-20-oathfront-implementation/task-11-evidence/${process.env.OATHFRONT_E2E_PRODUCTION === "1" ? "final" : "dev"}`;
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  await writeFile(
    `${dir}/${name}-console.json`,
    JSON.stringify(
      {
        url: page.url(),
        unexpectedConsoleErrors: consoleErrors ?? null,
        collection: consoleErrors
          ? "caller supplied; test-wide collector verifies all console messages"
          : "see corresponding test-wide all-console artifact",
      },
      null,
      2,
    ),
  );
}

export async function denseLogFixture(page: Page) {
  const match = await cardFixture(page);
  const owner = ownerPool();
  try {
    const row = (
      await owner.query(
        "SELECT state,state_hash FROM match_checkpoints WHERE match_id=$1",
        [match.id],
      )
    ).rows[0];
    const state = decodeCheckpoint(row.state, row.state_hash);
    state.eventSeq = 205;
    for (let seq = 1; seq <= 205; seq++)
      await owner.query(
        "INSERT INTO match_events(match_id,seq,event_id,root_id,kind,visibility,owner_side,payload) VALUES($1,$2,$3,$4,$5,$6,NULL,$7)",
        [
          match.id,
          seq,
          `${match.id}:${seq}`,
          `${match.id}:1`,
          seq > 100 && seq <= 200 ? "PRIVATE_DIAGNOSTIC" : "HandCountChanged",
          seq > 100 && seq <= 200 ? "SERVER" : "PUBLIC",
          seq > 100 && seq <= 200
            ? { privateCanary: "MUST_NEVER_RENDER" }
            : { side: "EVIL", handCount: 1, deckCount: 26 },
        ],
      );
    await owner.query(
      "UPDATE match_checkpoints SET state=$2,state_hash=$3,last_event_seq=205 WHERE match_id=$1",
      [match.id, encodeCheckpoint(state), hashState(state)],
    );
  } finally {
    await owner.end();
  }
  return match;
}
const consoleByPage = new WeakMap<Page, string[]>();
export function observeConsole(page: Page) {
  const errors: string[] = [];
  consoleByPage.set(page, errors);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
}
export async function finishEvidence(page: Page, name: string) {
  const errors = consoleByPage.get(page) ?? [];
  const expectedNetwork =
    /lost|offline|snapshot history|failed snapshot|history expiry/.test(name);
  const unexpected = errors.filter(
    (error) =>
      !(
        expectedNetwork &&
        /net::ERR_FAILED|net::ERR_INTERNET_DISCONNECTED|status of 410|status of 503/.test(
          error,
        )
      ),
  );
  await captureEvidence(
    page,
    name.replace(/[^a-z0-9]+/gi, "-").slice(0, 115),
    unexpected,
  );
  const dir = `.superpowers/sdd/2026-10-20-oathfront-implementation/task-11-evidence/${process.env.OATHFRONT_E2E_PRODUCTION === "1" ? "final" : "dev"}`;
  await writeFile(
    `${dir}/${name.replace(/[^a-z0-9]+/gi, "-").slice(0, 115)}-all-console.json`,
    JSON.stringify(
      {
        allErrors: errors,
        expectedNetworkInjection: expectedNetwork,
        unexpected,
      },
      null,
      2,
    ),
  );
  expect(unexpected).toEqual([]);
}
