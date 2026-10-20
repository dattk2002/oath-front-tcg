import { it, expect } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import type { CommandResponse, PlayerAction } from "@oathfront/contracts";
import { validateWire } from "@oathfront/contracts";
import { chooseBotAction } from "@oathfront/bot";
import { hashState } from "@oathfront/game-engine";
import { rateLimitKey } from "@oathfront/db";
import { root } from "../../../packages/db/tests/helpers.js";
import { harness, origin, createBody } from "./http-helpers.js";
const h = harness();
for (const side of ["GOOD", "EVIL"] as const)
  it(`full compiled HTTP PvE human ${side} reaches terminal with pause/process restart and full initialization replay`, async () => {
    const secret = randomBytes(32).toString("hex");
    let logs = "";
    async function start() {
      const child = spawn(
        process.execPath,
        [root + "apps/api/dist/server.mjs"],
        {
          env: {
            ...process.env,
            DATABASE_URL: process.env.TEST_DATABASE_URL!,
            SESSION_SECRET: secret,
            APP_ORIGIN: origin,
            PORT: "0",
            HOST: "127.0.0.1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const endpoint = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(Error("startup timeout")),
          10000,
        );
        child.once("exit", () => {
          clearTimeout(timeout);
          reject(Error("early exit"));
        });
        child.stdout.on("data", (chunk) => {
          logs += String(chunk);
          for (const line of String(chunk).split("\n"))
            try {
              const e = JSON.parse(line);
              if (e.event === "listening") {
                clearTimeout(timeout);
                resolve(`http://127.0.0.1:${e.port}`);
              }
            } catch {
              /* partial output */
            }
        });
        child.stderr.on("data", (chunk) => {
          logs += String(chunk);
        });
      });
      return { child, endpoint };
    }
    let server = await start();
    const stop = async () => {
      if (server.child.exitCode === null && server.child.signalCode === null) {
        server.child.kill("SIGKILL");
        await once(server.child, "exit");
      }
    };
    try {
      const guest = await fetch(server.endpoint + "/api/v1/guest", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({
          commandId: randomUUID(),
          recoverySecret: randomBytes(32).toString("base64url"),
        }),
      });
      expect(guest.status).toBe(201);
      const session = await guest.json();
      const cookie = guest.headers.get("set-cookie")!.split(";")[0]!;
      const headers = {
        origin,
        cookie,
        "content-type": "application/json",
        "x-csrf-token": session.csrfToken,
      };
      const created = await fetch(server.endpoint + "/api/v1/matches", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...createBody(),
          difficulty: side === "GOOD" ? "EASY" : "NORMAL",
          ...(side === "EVIL"
            ? {
                deck: { kind: "PRESET", presetId: "D_E_FX" },
                opponentHeroId: "H_G_BV",
              }
            : {}),
        }),
      });
      expect(created.status).toBe(201);
      let response: CommandResponse = await created.json();
      const id = response.view.matchId;
      let commandRequests = 0;
      async function command(action: PlayerAction) {
        // Production seeds can make a long game issue>120 requests in a fast test minute.
        // Isolate the separately covered rate limiter; never alter gameplay/checkpoint/journal data.
        if (++commandRequests % 90 === 0)
          await h.owner.query(
            "UPDATE rate_limit_windows SET count=1 WHERE scope='COMMAND' AND key_hash=$1",
            [rateLimitKey("COMMAND", session.principal.id, secret)],
          );
        const result = await fetch(
          server.endpoint + `/api/v1/matches/${id}/commands`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              commandId: randomUUID(),
              expectedRevision: response.revision,
              action,
            }),
          },
        );
        const body = await result.json();
        expect(result.status, JSON.stringify(body)).toBe(200);
        expect(validateWire("CommandResponse", body)).toBe(true);
        response = body;
      }
      let restarted = false,
        commands = 0,
        plays = 0;
      while (response.view.lifecycle === "ACTIVE" && commands++ < 300) {
        if (!restarted && response.needsAdvance && response.view.turn >= 2) {
          const before = await h.app.services.repository.loadMatch(
            session.principal.id,
            id,
          );
          await command({ kind: "PAUSE" });
          const paused = structuredClone(response);
          const denied = await fetch(
            server.endpoint + `/api/v1/matches/${id}/commands`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                commandId: randomUUID(),
                expectedRevision: response.revision,
                action: { kind: "ADVANCE" },
              }),
            },
          );
          expect(denied.status).toBe(422);
          await stop();
          server = await start();
          const snapshot = await fetch(
            server.endpoint + `/api/v1/matches/${id}`,
            { headers },
          );
          expect(await snapshot.json()).toEqual({
            ...paused,
            events: [],
            eventsThroughSeq: paused.latestSeq,
          });
          const loaded = await h.app.services.repository.loadMatch(
            session.principal.id,
            id,
          );
          expect(loaded.botIntentsThisTurn).toBe(before.botIntentsThisTurn);
          expect(loaded.state.random).toEqual(before.state.random);
          const opponent = side === "GOOD" ? "EVIL" : "GOOD";
          for (const hidden of [
            ...loaded.state.players[opponent].hand,
            ...loaded.state.players[opponent].reserve,
          ])
            expect(JSON.stringify(response)).not.toContain(hidden.instanceId);
          await command({ kind: "RESUME" });
          restarted = true;
        }
        const action: PlayerAction = response.needsAdvance
          ? { kind: "ADVANCE" }
          : chooseBotAction(response.view, response.view.legalActions, {
              difficulty: "NORMAL",
              randomState: [1, 2, 3, 4],
              observationMemory: [],
            }).action;
        if (action.kind === "PLAY_UNIT" || action.kind === "PLAY_TRICK")
          plays++;
        await command(action);
      }
      console.info(
        "M2_PVE",
        JSON.stringify({
          humanSide: side,
          difficulty: side === "GOOD" ? "EASY" : "NORMAL",
          lifecycle: response.view.lifecycle,
          outcome: response.view.outcome,
          turn: response.view.turn,
          commands,
          plays,
          restarted,
        }),
      );
      expect(restarted).toBe(true);
      expect(plays).toBeGreaterThan(0);
      expect(response.view.lifecycle).toBe("COMPLETED");
      expect(response.view.outcome?.reason).not.toBe("SURRENDER");
      const record = await h.app.services.repository.loadMatch(
          session.principal.id,
          id,
        ),
        audit = await h.app.services.repository.replayMatch(
          session.principal.id,
          id,
        );
      expect(hashState(audit.finalState)).toBe(hashState(record.state));
      expect(audit.botIntentsThisTurn).toBe(record.botIntentsThisTurn);
      const rows = (
        await h.pool.query(
          "SELECT origin,action,next_bot_random_state FROM match_action_journal WHERE match_id=$1 ORDER BY step_seq",
          [id],
        )
      ).rows;
      expect(
        rows.some(
          (r) => r.origin === "BOT" && r.action.action.kind === "PLAY_UNIT",
        ),
      ).toBe(true);
      expect(
        rows
          .filter((r) => r.origin === "BOT")
          .every((r) => Array.isArray(r.next_bot_random_state)),
      ).toBe(true);
      const initial = (
        await h.pool.query(
          "SELECT private_seed,initial_state FROM match_initializations WHERE match_id=$1",
          [id],
        )
      ).rows[0];
      for (const canary of [
        cookie.split("=")[1],
        session.csrfToken,
        initial.private_seed.toString("hex"),
        initial.initial_state.state.random.identityKey,
      ])
        expect(logs).not.toContain(canary);
      expect(JSON.stringify(response)).not.toContain("bot:easy");
    } finally {
      await stop();
    }
  }, 60000);
