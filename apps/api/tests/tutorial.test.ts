import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { CommandResponse, PlayerAction } from "@oathfront/contracts";
import { harness, createBody } from "./http-helpers.js";
import {
  decodeCheckpoint,
  encodeCheckpoint,
} from "../src/matches/checkpoint.js";
import { hashState } from "@oathfront/game-engine";
const h = harness();
it.each(["USE_BLOCK_POWER", "KEEP_BLOCK_POWER"] as const)(
  "journals/reloads every scene and command receipt with %s; independent completion survives replay",
  async (branch) => {
    const g = await h.guest();
    for (const scenarioId of ["tutorial_v1", "tutorial_evil_v1"] as const) {
      const payload = { commandId: randomUUID(), mode: "TUTORIAL", scenarioId };
      const r = await h.app.inject({
        method: "POST",
        url: "/api/v1/matches",
        headers: h.headers(g),
        payload,
      });
      expect(r.statusCode, r.body).toBe(201);
      let current = r.json<CommandResponse>();
      const id = current.view.matchId;
      const duplicate = await h.app.inject({
        method: "POST",
        url: "/api/v1/matches",
        headers: h.headers(g),
        payload,
      });
      expect(duplicate.json()).toEqual(current);
      const conflict = await h.app.inject({
        method: "POST",
        url: "/api/v1/matches",
        headers: h.headers(g),
        payload: { ...payload, commandId: randomUUID() },
      });
      expect(conflict.statusCode).toBe(409);
      for (let i = 0; i < 120 && current.view.lifecycle === "ACTIVE"; i++) {
        const a: PlayerAction | undefined = current.needsAdvance
          ? { kind: "ADVANCE" }
          : (current.view.legalActions.find((a) => a.kind === branch) ??
            current.view.legalActions.find(
              (a) =>
                ![
                  "PAUSE",
                  "SURRENDER",
                  "TUTORIAL_SKIP",
                  "TUTORIAL_RESTART",
                ].includes(a.kind),
            ));
        expect(a).toBeDefined();
        const body = {
          commandId: randomUUID(),
          expectedRevision: current.revision,
          action: a,
        };
        const result = await h.app.inject({
          method: "POST",
          url: `/api/v1/matches/${id}/commands`,
          headers: h.headers(g),
          payload: body,
        });
        expect(
          result.statusCode,
          `${current.view.tutorial?.stepId} ${a?.kind} ${result.body}`,
        ).toBe(200);
        current = result.json<CommandResponse>();
        const retry = await h.app.inject({
          method: "POST",
          url: `/api/v1/matches/${id}/commands`,
          headers: h.headers(g),
          payload: body,
        });
        expect(retry.json()).toEqual(current);
        const reload = await h.app.inject({
          method: "GET",
          url: `/api/v1/matches/${id}`,
          headers: { cookie: g.cookie },
        });
        expect(reload.json().view).toEqual(current.view);
      }
      expect(current.view.lifecycle).toBe("COMPLETED");
      expect(current.view.outcome?.result).toBe("NONE");
      const summary = await h.app.inject({
        method: "GET",
        url: `/api/v1/matches/${id}/summary`,
        headers: { cookie: g.cookie },
      });
      expect(summary.statusCode, summary.body).toBe(200);
      expect(summary.json()).toMatchObject({
        outcome: { result: "NONE", reason: "TUTORIAL_COMPLETED" },
        rematch: null,
      });
      const replay = await h.app.services.repository.replayMatch(g.id, id);
      expect(replay.finalState.outcome?.reason).toBe("TUTORIAL_COMPLETED");
      const loads = await h.pool.query(
        "SELECT action FROM match_action_journal WHERE match_id=$1 AND action->>'kind'='TUTORIAL_LOAD_SCENE' ORDER BY step_seq",
        [id],
      );
      expect(loads.rows.map((r) => r.action.ordinal)).toEqual(
        scenarioId === "tutorial_v1" ? [1, 2, 3, 4] : [1],
      );
      const session = await h.app.inject({
        method: "GET",
        url: "/api/v1/session",
        headers: { cookie: g.cookie },
      });
      expect(session.json().principal.tutorialCompletedAt).not.toBeNull();
      expect(session.json().principal.evilTutorialCompletedAt === null).toBe(
        scenarioId === "tutorial_v1",
      );
    }
    const history = await h.app.inject({
      method: "GET",
      url: "/api/v1/matches",
      headers: { cookie: g.cookie },
    });
    expect(history.json().items).toEqual([]);
    const skirmish = await h.app.inject({
      method: "POST",
      url: "/api/v1/matches",
      headers: h.headers(g),
      payload: createBody(),
    });
    expect(skirmish.statusCode).toBe(201);
  },
);
it("replays retained pre-T14 initialization/journal and resumes its paused checkpoint through the API", async () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("./fixtures/pre-t14-skirmish.json", import.meta.url),
      "utf8",
    ),
  );
  expect(fixture.provenance.sourceCommit).toBe(
    "f2dbfac73f6698725781f9ab55649964cad348b8",
  );
  expect(fixture.checkpointHash).toBe(
    "5ede397fb173a44b4cb3fe243f3a847e1848a6a25e6f50043255ad1e3630892a",
  );
  const state = decodeCheckpoint(fixture.checkpoint, fixture.checkpointHash);
  expect(Object.hasOwn(state, "tutorial")).toBe(false);
  expect(encodeCheckpoint(state)).toEqual(fixture.checkpoint);
  const g = await h.guest(),
    id = state.matchId,
    time = new Date();
  // Import the archived durable records verbatim, never through current createMatch.
  await h.pool.query(
    "INSERT INTO matches(id,human_principal_id,human_side,mode,status,revision,rules_version,content_version,location_version,bot_version,rematch,created_at,updated_at,last_activity_at,expires_at,bot_intents_this_turn) VALUES($1,$2,'GOOD','SKIRMISH','PAUSED',4,'rules_v1','core_v1','locations_v1','bot_v1',$3,$4,$4,$4,$5,$6)",
    [
      id,
      g.id,
      JSON.stringify(fixture.rematch),
      time,
      new Date(time.getTime() + 86400000),
      fixture.botIntentsThisTurn,
    ],
  );
  await h.pool.query(
    "INSERT INTO match_initializations(match_id,heroes,deck_snapshots,initial_state,private_seed,rng_algorithm_version) VALUES($1,$2,$3,$4,$5,$6)",
    [
      id,
      JSON.stringify({
        GOOD: state.players.GOOD.heroId,
        EVIL: state.players.EVIL.heroId,
      }),
      JSON.stringify(fixture.config.decks),
      JSON.stringify(fixture.initialization),
      Buffer.from(fixture.seedHex, "hex"),
      fixture.rngAlgorithmVersion,
    ],
  );
  await h.pool.query(
    "INSERT INTO match_checkpoints(match_id,revision,state,state_hash,last_event_seq,updated_at) VALUES($1,4,$2,$3,$4,$5)",
    [
      id,
      JSON.stringify(fixture.checkpoint),
      fixture.checkpointHash,
      state.eventSeq,
      time,
    ],
  );
  for (const entry of fixture.journal)
    await h.pool.query(
      "INSERT INTO match_action_journal(match_id,step_seq,origin,action,next_bot_random_state,pre_state_hash,post_state_hash,first_event_seq,last_event_seq) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        id,
        entry.stepSeq,
        entry.origin,
        JSON.stringify(entry.action),
        entry.nextBotRandomState === null
          ? null
          : JSON.stringify(entry.nextBotRandomState),
        entry.preStateHash,
        entry.postStateHash,
        entry.firstEventSeq,
        entry.lastEventSeq,
      ],
    );
  for (const event of fixture.events)
    await h.pool.query(
      "INSERT INTO match_events(match_id,seq,event_id,root_id,kind,visibility,owner_side,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id,
        event.sequence,
        event.eventId,
        event.rootId,
        event.kind,
        event.visibility,
        event.ownerSide,
        JSON.stringify(event.payload),
      ],
    );
  const replay = await h.app.services.repository.replayMatch(g.id, id);
  expect(hashState(replay.finalState)).toBe(fixture.checkpointHash);
  const read = await h.app.inject({
    method: "GET",
    url: `/api/v1/matches/${id}`,
    headers: { cookie: g.cookie },
  });
  expect(read.statusCode, read.body).toBe(200);
  expect(read.json().view.lifecycle).toBe("PAUSED");
  const resumed = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedRevision: 4,
      action: { kind: "RESUME" },
    },
  });
  expect(resumed.statusCode, resumed.body).toBe(200);
  expect(resumed.json()).toMatchObject({
    revision: 5,
    view: { lifecycle: "ACTIVE", phase: "GOOD_PLAY" },
  });
  const after = await h.app.services.repository.replayMatch(g.id, id);
  expect(hashState(after.finalState)).toBe(fixture.expectedResumedHash);
  const original = await h.pool.query(
    "SELECT initial_state FROM match_initializations WHERE match_id=$1",
    [id],
  );
  expect(original.rows[0].initial_state).toEqual(fixture.initialization);
});

import {
  verifyTutorialBinding,
  tutorialManifestHash,
} from "../src/matches/tutorial.js";
it("rejects unknown or mismatched tutorial registry bindings without selecting latest", () => {
  expect(() =>
    verifyTutorialBinding(
      "tutorial_v1",
      tutorialManifestHash(),
      "tutorial_v1",
      "GOOD",
    ),
  ).not.toThrow();
  for (const [scenario, hash, version] of [
    ["tutorial_v1", "0".repeat(64), "tutorial_v1"],
    ["tutorial_v1", tutorialManifestHash(), "tutorial_v2"],
    ["tutorial_evil_v1", tutorialManifestHash(), "tutorial_v1"],
  ])
    expect(() =>
      verifyTutorialBinding(scenario, hash, version, "GOOD"),
    ).toThrow("TUTORIAL_MANIFEST_MISMATCH");
});
it("restart journals a fresh scene without identity reuse, then skip leaves completion flags unset", async () => {
  const g = await h.guest();
  const made = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      mode: "TUTORIAL",
      scenarioId: "tutorial_v1",
    },
  });
  let current = made.json<CommandResponse>();
  const id = current.view.matchId;
  async function command(action: PlayerAction) {
    const r = await h.app.inject({
      method: "POST",
      url: `/api/v1/matches/${id}/commands`,
      headers: h.headers(g),
      payload: {
        commandId: randomUUID(),
        expectedRevision: current.revision,
        action,
      },
    });
    expect(r.statusCode, r.body).toBe(200);
    current = r.json();
  }
  await command({ kind: "ADVANCE" });
  const ids = current.view.self.hand.map((c) => c.instanceId);
  await command({ kind: "TUTORIAL_RESTART", chapterId: "A" });
  await command({ kind: "ADVANCE" });
  expect(current.view.self.hand.some((c) => ids.includes(c.instanceId))).toBe(
    false,
  );
  await command({ kind: "TUTORIAL_SKIP" });
  expect(current.view.outcome).toEqual({
    result: "NONE",
    winner: null,
    reason: "TUTORIAL_SKIPPED",
  });
  const replay = await h.app.services.repository.replayMatch(g.id, id);
  expect(replay.finalState.tutorial?.sceneLoadOrdinal).toBe(2);
  const session = await h.app.inject({
    method: "GET",
    url: "/api/v1/session",
    headers: { cookie: g.cookie },
  });
  expect(session.json().principal).toMatchObject({
    tutorialCompletedAt: null,
    evilTutorialCompletedAt: null,
  });
  const summary = await h.app.inject({
    method: "GET",
    url: `/api/v1/matches/${id}/summary`,
    headers: { cookie: g.cookie },
  });
  expect(summary.json().outcome).toMatchObject({
    result: "NONE",
    reason: "TUTORIAL_SKIPPED",
  });
  const extra = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: { ...createBody(), seed: "override", board: [] },
  });
  expect(extra.statusCode).toBe(400);
});
