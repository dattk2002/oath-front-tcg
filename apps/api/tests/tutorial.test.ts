import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { CommandResponse, PlayerAction } from "@oathfront/contracts";
import { harness, createBody } from "./http-helpers.js";
import {
  decodeCheckpoint,
  encodeCheckpoint,
} from "../src/matches/checkpoint.js";
import {
  createMatch,
  createRandomStreams,
  hashState,
} from "@oathfront/game-engine";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
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
it("decodes pre-T14 skirmish checkpoint without inserting fields or changing hashes", () => {
  const s = createMatch(matchConfig(), createRandomStreams(seed));
  expect(Object.hasOwn(s, "tutorial")).toBe(false);
  const serialized = JSON.stringify(encodeCheckpoint(s));
  const loaded = decodeCheckpoint(JSON.parse(serialized), hashState(s));
  expect(JSON.stringify(encodeCheckpoint(loaded))).toBe(serialized);
  expect(hashState(loaded)).toBe(hashState(s));
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
