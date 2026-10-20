import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { root } from "../../../packages/db/tests/helpers.js";
import { inspect } from "./helpers.js";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import * as engine from "@oathfront/game-engine";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
import {
  ownerPool,
  setupDatabase,
  resetDatabase,
} from "../../../packages/db/tests/helpers.js";
import {
  createRepository,
  persistTransition,
} from "../src/matches/repository.js";
import { recordIntent, recordAutomatic } from "../src/matches/journal.js";
const owner = ownerPool();
let pool: Pool;
let repo: ReturnType<typeof createRepository>;
let principal: string;
let matchId: string;
beforeAll(async () => {
  await setupDatabase(owner);
  pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 });
  repo = createRepository(pool);
});
beforeEach(async () => {
  await resetDatabase(owner);
  principal = randomUUID();
  matchId = randomUUID();
  await pool.query(
    "INSERT INTO principals(id,kind,display_name,expires_at) VALUES($1,'GUEST','Guest',now()+interval '7 days')",
    [principal],
  );
  await repo.registerRelease();
});
afterAll(async () => {
  await pool?.end();
  await owner.end();
});
function response(state: engine.MatchState, revision: number) {
  return {
    view: engine.projectPlayerView(state, state.humanSide),
    revision,
    latestSeq: state.eventSeq,
    events: [],
    eventsThroughSeq: state.eventSeq,
    needsAdvance: false,
  };
}
async function create(id = matchId) {
  return repo.createMatch(
    principal,
    { ...matchConfig(), matchId: id, difficulty: "EASY" },
    seed,
    {
      expiresAt: new Date(Date.now() + 86400000),
      rematch: {
        deck: { kind: "PRESET", presetId: "D_G_BV" },
        opponentHeroId: "H_E_FX",
        difficulty: "EASY",
        expectedContentVersion: "core_v1",
      },
    },
  );
}
async function step(
  action: engine.EngineAction,
  origin: "HUMAN" | "BOT" = "HUMAN",
) {
  return repo.withLockedMatch(principal, matchId, async (tx, record) => {
    const rng =
      origin === "BOT"
        ? engine.nextUint32(record.state.random.states["bot:easy"]).state
        : null;
    const r = recordIntent(
      record.state,
      action,
      origin,
      record.lastStepSeq + 1,
      rng,
    );
    await persistTransition(tx, r.transition, [r.entry], {
      commandId: randomUUID(),
      requestHash: "b".repeat(64),
      response: response(r.transition.nextState, record.revision + 1),
      expiresAt: new Date(Date.now() + 86400000),
    });
    return r;
  });
}
it("persists immutable initial state and exactly one active/paused match under concurrent creates", async () => {
  const result = await Promise.allSettled([create(), create(randomUUID())]);
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (await pool.query("SELECT count(*)::int AS n FROM matches")).rows[0].n,
  ).toBe(1);
  const id = (await pool.query("SELECT id FROM matches")).rows[0].id;
  await expect(
    owner.query(
      "UPDATE match_initializations SET heroes='{}' WHERE match_id=$1",
      [id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    owner.query("UPDATE matches SET bot_version='changed' WHERE id=$1", [id]),
  ).rejects.toMatchObject({ code: "23514" });
});
it("rolls back checkpoint, journal, events, result and receipt when receipt insert fails after append", async () => {
  await create();
  const before = await inspect(pool, principal, matchId);
  const commandId = randomUUID();
  await pool.query(
    "INSERT INTO command_receipts(principal_id,command_id,request_hash,resource_id,response,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 day')",
    [principal, commandId, "a".repeat(64), matchId, {}],
  );
  const beforeWithReceipt = await inspect(pool, principal, matchId);
  await expect(
    repo.withLockedMatch(principal, matchId, async (tx, record) => {
      const r = recordIntent(
        record.state,
        { actor: "GOOD", action: { kind: "SURRENDER" } },
        "HUMAN",
        1,
        null,
      );
      await persistTransition(tx, r.transition, [r.entry], {
        commandId,
        requestHash: "b".repeat(64),
        response: response(r.transition.nextState, record.revision + 1),
        expiresAt: new Date(Date.now() + 86400000),
      });
    }),
  ).rejects.toMatchObject({ code: "23505" });
  const after = await inspect(pool, principal, matchId);
  expect(after).toEqual(beforeWithReceipt);
  expect(after.checkpoint).toEqual(before.checkpoint);
  expect(after.results).toEqual([]);
  expect(after.journal).toEqual([]);
});
it("records Easy bot RNG atomically and replays each root after loading a durable pending continuation", async () => {
  await create();
  await step({
    actor: "GOOD",
    action: { kind: "MULLIGAN", cardInstanceIds: [] },
  });
  await step(
    { actor: "EVIL", action: { kind: "MULLIGAN", cardInstanceIds: [] } },
    "BOT",
  );
  for (const actor of ["EVIL", "GOOD", "EVIL"] as const)
    await step(
      { actor, action: { kind: "PASS_PHASE" } },
      actor === "GOOD" ? "HUMAN" : "BOT",
    );
  await repo.withLockedMatch(principal, matchId, async (tx, record) => {
    const r = recordAutomatic(record.state, record.lastStepSeq + 1);
    await persistTransition(tx, r.transition, [r.entry], {
      commandId: randomUUID(),
      requestHash: "c".repeat(64),
      response: response(r.transition.nextState, record.revision + 1),
      expiresAt: new Date(Date.now() + 86400000),
    });
  });
  const record = await repo.loadMatch(principal, matchId);
  expect(record.state.difficulty).toBe("EASY");
  expect(record.state.phase).toBe("COMBAT");
  expect(record.state.continuation).not.toBeNull();
  const replayed = await repo.replayMatch(principal, matchId);
  expect(replayed.finalState).toEqual(record.state);
  expect(replayed.events).toEqual(
    (await inspect(pool, principal, matchId)).events.slice(11),
  );
  const state = record.state;
  const rng = engine.nextUint32(state.random.states["bot:easy"]).state;
  expect(() =>
    recordIntent(
      state,
      { actor: "GOOD", action: { kind: "PAUSE" } },
      "BOT",
      7,
      null,
    ),
  ).toThrow(/RNG/);
  expect(rng).not.toEqual(state.random.states["bot:easy"]);
});
it("scopes checkpoints/receipts to owner and fails closed on checkpoint schema or state/hash corruption", async () => {
  await create();
  await expect(repo.loadMatch(randomUUID(), matchId)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await owner.query(
    "UPDATE match_checkpoints SET state=jsonb_set(state,'{stateSchemaVersion}','\"bad\"') WHERE match_id=$1",
    [matchId],
  );
  await expect(repo.loadMatch(principal, matchId)).rejects.toMatchObject({
    code: "INVALID_CHECKPOINT",
  });
});
it("recovers and advances the committed private cursor in a separate production Node process without tsx or aliases", async () => {
  await create();
  await step({
    actor: "GOOD",
    action: { kind: "MULLIGAN", cardInstanceIds: [] },
  });
  await step(
    { actor: "EVIL", action: { kind: "MULLIGAN", cardInstanceIds: [] } },
    "BOT",
  );
  for (const actor of ["EVIL", "GOOD", "EVIL"] as const)
    await step(
      { actor, action: { kind: "PASS_PHASE" } },
      actor === "GOOD" ? "HUMAN" : "BOT",
    );
  const before = await repo.loadMatch(principal, matchId);
  const expected = engine.advanceAutomatic(before.state, { maxRoots: 1 });
  const script = `import {createPool,createRepository,recordAutomatic,persistTransition,projectPlayerView,hashState} from './apps/api/dist/persistence.mjs';
 const pool=createPool({connectionString:process.env.TEST_DATABASE_URL,purpose:'runtime'});const repo=createRepository(pool);
 try {await repo.withLockedMatch(process.env.RECOVERY_PRINCIPAL,process.env.RECOVERY_MATCH,async(tx,r)=>{const step=recordAutomatic(r.state,r.lastStepSeq+1);const s=step.transition.nextState;
 await persistTransition(tx,step.transition,[step.entry],{commandId:process.env.RECOVERY_COMMAND,requestHash:'d'.repeat(64),response:{view:projectPlayerView(s,s.humanSide),revision:r.revision+1,latestSeq:s.eventSeq,events:[],eventsThroughSeq:s.eventSeq,needsAdvance:false},expiresAt:new Date(Date.now()+86400000)});console.log(JSON.stringify({hash:hashState(s)}));});}finally{await pool.end();}`;
  const { stdout } = await promisify(execFile)(
    process.execPath,
    ["--input-type=module", "-e", script],
    {
      cwd: root,
      env: {
        ...process.env,
        RECOVERY_PRINCIPAL: principal,
        RECOVERY_MATCH: matchId,
        RECOVERY_COMMAND: randomUUID(),
      },
    },
  );
  expect(JSON.parse(stdout).hash).toBe(engine.hashState(expected.nextState));
  expect((await repo.loadMatch(principal, matchId)).state).toEqual(
    expected.nextState,
  );
  expect((await repo.replayMatch(principal, matchId)).finalState).toEqual(
    expected.nextState,
  );
});
it("rejects corrupt or aggregated journal rows before any durable append and protects receipt privacy", async () => {
  await create();
  const before = await inspect(pool, principal, matchId);
  await expect(
    repo.withLockedMatch(principal, matchId, async (tx, r) => {
      const step = recordIntent(
        r.state,
        { actor: "GOOD", action: { kind: "MULLIGAN", cardInstanceIds: [] } },
        "HUMAN",
        1,
        null,
      );
      step.entry.postStateHash = "a".repeat(64);
      await persistTransition(tx, step.transition, [step.entry], {
        commandId: randomUUID(),
        requestHash: "b".repeat(64),
        response: response(step.transition.nextState, 1),
        expiresAt: new Date(Date.now() + 86400000),
      });
    }),
  ).rejects.toMatchObject({ code: "INVALID_JOURNAL_TRANSITION" });
  expect(await inspect(pool, principal, matchId)).toEqual(before);
  await expect(
    repo.withLockedMatch(principal, matchId, async (tx, r) => {
      const step = recordIntent(
        r.state,
        { actor: "GOOD", action: { kind: "MULLIGAN", cardInstanceIds: [] } },
        "HUMAN",
        1,
        null,
      );
      const reply = {
        ...response(step.transition.nextState, 1),
        privateState: step.transition.nextState,
      };
      await persistTransition(tx, step.transition, [step.entry], {
        commandId: randomUUID(),
        requestHash: "b".repeat(64),
        response: reply,
        expiresAt: new Date(Date.now() + 86400000),
      });
    }),
  ).rejects.toMatchObject({ code: "INVALID_RECEIPT" });
});
it("validates required BOT RNG, event bounds, deferred checkpoint revision and immutable deck snapshots in real SQL", async () => {
  await create();
  await expect(
    pool.query(
      "INSERT INTO match_action_journal(match_id,step_seq,origin,action,pre_state_hash,post_state_hash) VALUES($1,1,'BOT','{}',$2,$2)",
      [matchId, "a".repeat(64)],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    pool.query(
      "INSERT INTO match_action_journal(match_id,step_seq,origin,action,pre_state_hash,post_state_hash,first_event_seq,last_event_seq) VALUES($1,1,'AUTO','{}',$2,$2,NULL,2)",
      [matchId, "a".repeat(64)],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    owner.query("UPDATE matches SET revision=1 WHERE id=$1", [matchId]),
  ).rejects.toMatchObject({ code: "23503" });
  const deckId = randomUUID();
  await pool.query(
    "INSERT INTO decks(id,owner_id,name,hero_id,current_revision) VALUES($1,$2,'Deck','H_G_BV',1)",
    [deckId, principal],
  );
  await pool.query(
    "INSERT INTO deck_versions(deck_id,revision,content_version,hero_id,entries,validation_status) VALUES($1,1,'core_v1','H_G_BV','[]','DRAFT')",
    [deckId],
  );
  await expect(
    owner.query("UPDATE deck_versions SET entries='[]' WHERE deck_id=$1", [
      deckId,
    ]),
  ).rejects.toMatchObject({ code: "23514" });
});
it("retains PAUSED uniqueness and commits one terminal result with replayable state and expiry metadata", async () => {
  await create();
  await step({ actor: "GOOD", action: { kind: "PAUSE" } });
  await expect(create(randomUUID())).rejects.toMatchObject({ code: "23505" });
  await step({ actor: "GOOD", action: { kind: "SURRENDER" } });
  const stored = await inspect(pool, principal, matchId);
  expect(stored.results).toHaveLength(1);
  expect(stored.results[0]).toMatchObject({
    outcome: "LOSS",
    reason: "SURRENDER",
    damage_dealt: "0",
    blocks_used: 0,
  });
  expect(stored.results[0].summary.rematch).toMatchObject({
    deck: { kind: "PRESET", presetId: "D_G_BV" },
  });
  expect((await repo.replayMatch(principal, matchId)).finalState).toEqual(
    (await repo.loadMatch(principal, matchId)).state,
  );
  expect(
    new Date(stored.results[0].expires_at).getTime() -
      new Date(stored.results[0].ended_at).getTime(),
  ).toBe(180 * 86400000);
  await expect(create(randomUUID())).resolves.toMatchObject({
    kind: "transition",
  });
});
it("rejects a private checkpoint mutation even when shape is valid and refuses unsupported envelope versions", async () => {
  await create();
  const before = await inspect(pool, principal, matchId);
  await owner.query(
    "UPDATE match_checkpoints SET state=jsonb_set(state,'{state,eventSeq}','999') WHERE match_id=$1",
    [matchId],
  );
  await expect(repo.loadMatch(principal, matchId)).rejects.toMatchObject({
    code: "INVALID_CHECKPOINT",
  });
  await owner.query("UPDATE match_checkpoints SET state=$2 WHERE match_id=$1", [
    matchId,
    JSON.stringify(before.checkpoint.state),
  ]);
  await owner.query(
    "UPDATE match_checkpoints SET state=jsonb_set(state,'{state,random,states,bot:easy}','[0,0,0,0]') WHERE match_id=$1",
    [matchId],
  );
  await expect(repo.loadMatch(principal, matchId)).rejects.toMatchObject({
    code: "INVALID_CHECKPOINT",
  });
});
it("stores each no-event automatic cursor root with null event bounds and globally ordered journal steps", async () => {
  await create();
  await step({
    actor: "GOOD",
    action: { kind: "MULLIGAN", cardInstanceIds: [] },
  });
  await step(
    { actor: "EVIL", action: { kind: "MULLIGAN", cardInstanceIds: [] } },
    "BOT",
  );
  for (const actor of ["EVIL", "GOOD", "EVIL"] as const)
    await step(
      { actor, action: { kind: "PASS_PHASE" } },
      actor === "GOOD" ? "HUMAN" : "BOT",
    );
  await repo.withLockedMatch(principal, matchId, async (tx, r) => {
    const steps = [];
    const events: engine.GameEvent[] = [];
    let state = r.state;
    for (let i = 0; i < 2; i++) {
      const auto = recordAutomatic(state, r.lastStepSeq + i + 1);
      steps.push(auto.entry);
      events.push(...auto.transition.events);
      state = auto.transition.nextState;
    }
    const transition = {
      kind: "transition" as const,
      nextState: state,
      events,
      waitingForInput: false,
      terminalOutcome: null,
    };
    await persistTransition(tx, transition, steps, {
      commandId: randomUUID(),
      requestHash: "b".repeat(64),
      response: response(state, r.revision + 1),
      expiresAt: new Date(Date.now() + 86400000),
    });
  });
  const rows = (await inspect(pool, principal, matchId)).journal;
  expect(rows.slice(-2).map((r) => r.step_seq)).toEqual(["6", "7"]);
  expect(
    rows
      .slice(-2)
      .every((r) => r.first_event_seq === null && r.last_event_seq === null),
  ).toBe(true);
  expect((await repo.replayMatch(principal, matchId)).finalState).toEqual(
    (await repo.loadMatch(principal, matchId)).state,
  );
});
it("accounts accepted automatic requests and caps active time while excluding paused intervals", async () => {
  await create();
  await step({
    actor: "GOOD",
    action: { kind: "MULLIGAN", cardInstanceIds: [] },
  });
  await step(
    { actor: "EVIL", action: { kind: "MULLIGAN", cardInstanceIds: [] } },
    "BOT",
  );
  for (const actor of ["EVIL", "GOOD", "EVIL"] as const)
    await step(
      { actor, action: { kind: "PASS_PHASE" } },
      actor === "GOOD" ? "HUMAN" : "BOT",
    );
  const before = await repo.loadMatch(principal, matchId);
  await repo.withLockedMatch(principal, matchId, async (tx, r) => {
    const root = recordAutomatic(r.state, r.lastStepSeq + 1);
    await persistTransition(
      tx,
      root.transition,
      [root.entry],
      {
        commandId: randomUUID(),
        requestHash: "b".repeat(64),
        response: response(root.transition.nextState, r.revision + 1),
        expiresAt: new Date(Date.now() + 86400000),
      },
      { now: new Date(r.lastActivityAt.getTime() + 120000) },
    );
  });
  expect((await repo.loadMatch(principal, matchId)).activeDurationMs).toBe(
    before.activeDurationMs + 60000,
  );
  await step({ actor: "GOOD", action: { kind: "PAUSE" } });
  const paused = await repo.loadMatch(principal, matchId);
  await repo.withLockedMatch(principal, matchId, async (tx, r) => {
    const root = recordIntent(
      r.state,
      { actor: "GOOD", action: { kind: "RESUME" } },
      "HUMAN",
      r.lastStepSeq + 1,
      null,
    );
    await persistTransition(
      tx,
      root.transition,
      [root.entry],
      {
        commandId: randomUUID(),
        requestHash: "b".repeat(64),
        response: response(root.transition.nextState, r.revision + 1),
        expiresAt: new Date(Date.now() + 86400000),
      },
      { now: new Date(r.lastActivityAt.getTime() + 86400000) },
    );
  });
  expect((await repo.loadMatch(principal, matchId)).activeDurationMs).toBe(
    paused.activeDurationMs,
  );
});
it("rolls back all initialization rows when its atomic create receipt conflicts", async () => {
  const { insertInitialization } =
    await import("../src/matches/initialization.js");
  const { insertMatchReceipt } = await import("../src/matches/receipts.js");
  const commandId = randomUUID();
  await pool.query(
    "INSERT INTO command_receipts(principal_id,command_id,request_hash,resource_id,response,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 day')",
    [principal, commandId, "a".repeat(64), matchId, {}],
  );
  await expect(
    repo.withPrincipalTransaction([principal], async (tx) => {
      const transition = await insertInitialization(
        tx,
        principal,
        { ...matchConfig(), matchId },
        seed,
        {
          expiresAt: new Date(Date.now() + 86400000),
          rematch: {
            deck: { kind: "PRESET", presetId: "D_G_BV" },
            opponentHeroId: "H_E_FX",
            difficulty: "NORMAL",
            expectedContentVersion: "core_v1",
          },
        },
        new Date(),
      );
      await insertMatchReceipt(tx, {
        principalId: principal,
        state: transition.nextState,
        revision: 0,
        receipt: {
          commandId,
          requestHash: "a".repeat(64),
          response: response(transition.nextState, 0),
          expiresAt: new Date(Date.now() + 86400000),
        },
        now: new Date(),
      });
    }),
  ).rejects.toMatchObject({ code: "23505" });
  for (const table of [
    "matches",
    "match_initializations",
    "match_checkpoints",
    "match_events",
  ])
    expect(
      (await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,
    ).toBe(0);
  expect(await repo.findReceipt(randomUUID(), commandId)).toBeNull();
  expect((await repo.findReceipt(principal, commandId))?.requestHash).toBe(
    "a".repeat(64),
  );
});
