import { describe, expect, it } from "vitest";
import * as engine from "../src/index.js";
import { next, ready, unit } from "./helpers.js";
import {
  combatState,
  pierceVolcano,
} from "./fixtures/combat-pierce-volcano.js";
import { runRoot } from "../src/effects/resolve.js";
import { scheduledDamageOnDraft } from "../src/combat.js";
import { validateWire } from "@oathfront/contracts";

describe("R11 block grants and serializable response", () => {
  it("blocks only Pierce hero packet, waits before Volcano, and can Keep", () => {
    const result = engine.advanceAutomatic(pierceVolcano(), { maxRoots: 8 }),
      state = result.nextState;
    expect(state.players.GOOD.hp).toBe(20);
    expect(state.players.GOOD.block).toMatchObject({ charge: 0, used: 1 });
    expect(state.board[0]!.good!.current.hp).toBe(1);
    expect(state.board[0]!.evil).toBeNull();
    expect(state.blockResponse).toMatchObject({ side: "GOOD", laneId: 1 });
    expect(result.waitingForInput).toBe(true);
    expect(state.players.GOOD.reserve).toHaveLength(1);
    expect(result.events.every((e) => validateWire("VisibleEvent", e))).toBe(
      true,
    );
    const kept = next(
      engine.applyAction(state, {
        actor: "GOOD",
        action: { kind: "KEEP_BLOCK_POWER" },
      }),
    );
    expect(kept.players.GOOD.reserve).toHaveLength(1);
    expect(kept.phase).toBe("COMBAT");
    expect(
      engine.advanceAutomatic(kept, { maxRoots: 1 }).nextState.board[0]!.good,
    ).toBeNull();
  });
  it("free newly granted heal saves unit before Volcano and JSON reload gives identical continuation", () => {
    const state = engine.advanceAutomatic(pierceVolcano(), {
      maxRoots: 8,
    }).nextState;
    state.players.GOOD.energy.current = 0;
    const response = state.blockResponse!;
    const action = {
      kind: "USE_BLOCK_POWER" as const,
      powerInstanceId: response.powerInstanceId,
      target: {
        kind: "UNIT" as const,
        instanceId: state.board[0]!.good!.instanceId,
      },
    };
    const result = engine.applyAction(state, { actor: "GOOD", action });
    expect(
      engine.applyAction(JSON.parse(JSON.stringify(state)), {
        actor: "GOOD",
        action,
      }),
    ).toEqual(result);
    const healed = next(result);
    expect(healed.players.GOOD.energy.current).toBe(0);
    expect(healed.phase).toBe("COMBAT");
    expect(healed.players.GOOD.reserve).toHaveLength(0);
    const after = engine.advanceAutomatic(healed, { maxRoots: 1 });
    expect(after.nextState.board[0]!.good!.current.hp).toBe(3);
    expect(after.events.some((e) => e.kind === "PowerGranted")).toBe(false);
  });
  it("only responder and exact newly granted power may respond; Keep remains possible without a target", () => {
    const state = engine.advanceAutomatic(pierceVolcano(), {
      maxRoots: 8,
    }).nextState;
    const before = structuredClone(state);
    expect(engine.getLegalActions(state, "EVIL")).toEqual([]);
    expect(
      engine.applyAction(state, {
        actor: "EVIL",
        action: { kind: "KEEP_BLOCK_POWER" },
      }),
    ).toMatchObject({ kind: "error" });
    expect(
      engine.applyAction(state, {
        actor: "GOOD",
        action: {
          kind: "USE_BLOCK_POWER",
          powerInstanceId: "f".repeat(32),
          target: { kind: "NONE" },
        },
      }),
    ).toMatchObject({ code: "POWER_UNAVAILABLE" });
    expect(
      engine.applyAction(state, {
        actor: "GOOD",
        action: { kind: "PASS_PHASE" },
      }),
    ).toMatchObject({ kind: "error" });
    expect(state).toEqual(before);
    state.board[0]!.good = null;
    expect(engine.getLegalActions(state, "GOOD")).toEqual([
      { kind: "KEEP_BLOCK_POWER" },
      { kind: "PAUSE" },
      { kind: "SURRENDER" },
    ]);
  });
  it("positive hero COMBAT charges once per attack, fourth blocks, third block disables meter", () => {
    let state = ready();
    state.phase = "MULLIGAN";
    state.players.GOOD.mulliganCommitted = false;
    state.players.EVIL.mulliganCommitted = false;
    state = next(
      engine.applyAction(state, {
        actor: "GOOD",
        action: { kind: "MULLIGAN", cardInstanceIds: [] },
      }),
    );
    state = next(
      engine.applyAction(state, {
        actor: "EVIL",
        action: { kind: "MULLIGAN", cardInstanceIds: [] },
      }),
    );
    unit(state, "EC01", "EVIL", 1).current.attack = 1;
    for (let i = 0; i < 13; i++) {
      state.continuation = {
        laneId: 1,
        stage: "BEFORE_PAIR",
        pendingResponders: [],
      };
      state.phase = "COMBAT";
      state.board[0]!.evil!.lastRegularAttackTurn = null;
      state = engine.advanceAutomatic(state, { maxRoots: 3 }).nextState;
      if (state.blockResponse)
        state = next(
          engine.applyAction(state, {
            actor: "GOOD",
            action: { kind: "KEEP_BLOCK_POWER" },
          }),
        );
      if (i === 2)
        expect(state.players.GOOD.block).toMatchObject({ charge: 6, used: 0 });
      if (i === 3)
        expect(state.players.GOOD.block).toMatchObject({ charge: 0, used: 1 });
    }
    expect(state.players.GOOD.block).toEqual({
      charge: 0,
      used: 3,
      active: false,
    });
    expect(state.players.GOOD.receivedPowerIds).toHaveLength(4);
    expect(new Set(state.players.GOOD.receivedPowerIds).size).toBe(4);
    expect(state.players.GOOD.reserve).toHaveLength(4);
    expect(state.players.GOOD.hp).toBe(10);
  });
  it.each(["EFFECT", "POISON", "FATIGUE", "LOCATION"] as const)(
    "%s hero damage never charges block",
    (damageType) => {
      const state = combatState();
      state.players.GOOD.block.charge = 6;
      const result = runRoot(state, (draft, root) =>
        scheduledDamageOnDraft(draft, root, [
          {
            source: null,
            target: { kind: "HERO", side: "GOOD" },
            rawDamage: 1,
            damageType,
          },
        ]),
      );
      expect(result.nextState.players.GOOD.block).toMatchObject({
        charge: 6,
        used: 0,
      });
      expect(result.nextState.players.GOOD.hp).toBe(19);
    },
  );
  it("dual blocks retain exact power IDs and open EVIL then GOOD after separate lethal checkpoints", () => {
    const state = combatState();
    for (const u of [
      unit(state, "EC02", "EVIL", 1),
      unit(state, "GC02", "GOOD", 1),
    ]) {
      u.statuses.pierce = true;
      u.current = { attack: 1, hp: 5, maxHp: 5 };
    }
    state.players.EVIL.block.charge = 6;
    state.players.GOOD.block.charge = 6;
    const pair = engine.advanceAutomatic(state, { maxRoots: 2 });
    expect(pair.nextState.blockResponse).toBeNull();
    expect(
      pair.nextState.continuation!.pendingResponders.map((r) => r.side),
    ).toEqual(["EVIL", "GOOD"]);
    const evil = engine.advanceAutomatic(pair.nextState, { maxRoots: 1 });
    expect(evil.nextState.blockResponse!.side).toBe("EVIL");
    const kept = next(
      engine.applyAction(evil.nextState, {
        actor: "EVIL",
        action: { kind: "KEEP_BLOCK_POWER" },
      }),
    );
    const good = engine.advanceAutomatic(kept, { maxRoots: 1 });
    expect(
      engine.advanceAutomatic(JSON.parse(JSON.stringify(kept)), {
        maxRoots: 1,
      }),
    ).toEqual(good);
    expect(good.nextState.blockResponse).toEqual({
      ...pair.nextState.continuation!.pendingResponders[1],
      laneId: 1,
    });
    expect(good.events.map((e) => e.kind)).toEqual(["BlockResponseOpened"]);
    expect(good.nextState.random).toEqual(pair.nextState.random);
  });
  it("a lethal free power ends before the other responder and Volcano", () => {
    const state = combatState();
    state.players.GOOD.hp = 2;
    state.players.EVIL.receivedPowerIds = ["P_F2", "P_X1", "S_E_FX"];
    for (const u of [
      unit(state, "EC02", "EVIL", 1),
      unit(state, "GC02", "GOOD", 1),
    ]) {
      u.statuses.pierce = true;
      u.current = { attack: 1, hp: 5, maxHp: 5 };
    }
    state.players.EVIL.block.charge = 6;
    state.players.GOOD.block.charge = 6;
    state.board[0]!.location = {
      state: "ACTIVE",
      definitionId: "volcano",
      revealTurn: 1,
    };
    const checkpoint = engine.advanceAutomatic(state, {
      maxRoots: 8,
    }).nextState;
    const result = engine.applyAction(checkpoint, {
      actor: "EVIL",
      action: {
        kind: "USE_BLOCK_POWER",
        powerInstanceId: checkpoint.blockResponse!.powerInstanceId,
        target: { kind: "HERO", side: "GOOD" },
      },
    });
    const ended = next(result);
    expect(ended.lifecycle).toBe("COMPLETED");
    expect(ended.blockResponse).toBeNull();
    expect(ended.continuation).toBeNull();
    expect(ended.board[0]!.good!.current.hp).toBe(4);
    expect(engine.advanceAutomatic(ended, { maxRoots: 8 }).events).toEqual([]);
  });
  it("pair lethal suppresses a granted response and all later lane roots", () => {
    const state = combatState();
    state.players.EVIL.hp = 1;
    state.players.GOOD.block.charge = 6;
    for (const u of [
      unit(state, "EC02", "EVIL", 1),
      unit(state, "GC02", "GOOD", 1),
    ]) {
      u.statuses.pierce = true;
      u.current = { attack: 1, hp: 5, maxHp: 5 };
    }
    const result = engine.advanceAutomatic(state, { maxRoots: 8 });
    expect(result.nextState.lifecycle).toBe("COMPLETED");
    expect(result.events.some((e) => e.kind === "PowerGranted")).toBe(true);
    expect(result.events.some((e) => e.kind === "BlockResponseOpened")).toBe(
      false,
    );
  });
  it("response movement changes a later lane and an unspent instance attacks there", () => {
    const state = combatState();
    unit(state, "EC01", "EVIL", 1);
    const moved = unit(state, "GC01", "GOOD", 3);
    state.players.GOOD.block.charge = 6;
    state.players.GOOD.heroId = "H_G_VP";
    state.players.GOOD.receivedPowerIds = ["P_V1", "P_P2", "S_G_VP"];
    const checkpoint = engine.advanceAutomatic(state, {
      maxRoots: 8,
    }).nextState;
    let after = next(
      engine.applyAction(checkpoint, {
        actor: "GOOD",
        action: {
          kind: "USE_BLOCK_POWER",
          powerInstanceId: checkpoint.blockResponse!.powerInstanceId,
          target: {
            kind: "UNIT_AND_LANE",
            instanceId: moved.instanceId,
            laneId: 4,
          },
        },
      }),
    );
    for (let i = 0; i < 3; i++)
      after = engine.advanceAutomatic(after, { maxRoots: 8 }).nextState;
    expect(after.players.EVIL.hp).toBe(18);
    expect(after.board[3]!.good!.lastRegularAttackTurn).toBe(5);
    expect(after.board[2]!.good).toBeNull();
  });
  it("a token created by a response death cascade never replays the current pair", () => {
    const state = combatState();
    const target = unit(state, "X04", "EVIL", 1);
    target.current.hp = 1;
    state.players.GOOD.block.charge = 6;
    state.players.GOOD.heroId = "H_G_BP";
    state.players.GOOD.receivedPowerIds = ["P_B1", "P_B2", "P_P2"];
    const checkpoint = engine.advanceAutomatic(state, {
      maxRoots: 8,
    }).nextState;
    let after = next(
      engine.applyAction(checkpoint, {
        actor: "GOOD",
        action: {
          kind: "USE_BLOCK_POWER",
          powerInstanceId: checkpoint.blockResponse!.powerInstanceId,
          target: { kind: "UNIT", instanceId: target.instanceId },
        },
      }),
    );
    for (let i = 0; i < 3; i++)
      after = engine.advanceAutomatic(after, { maxRoots: 8 }).nextState;
    expect(after.board[0]!.evil).toMatchObject({
      definitionId: "TK_E_CINDER",
      lastRegularAttackTurn: null,
    });
    expect(after.players.GOOD.hp).toBe(20);
  });
});
it("Keep preserves the exact power for normal-phase use costing one energy after the full turn boundary", () => {
  let s = engine.advanceAutomatic(pierceVolcano(), { maxRoots: 8 }).nextState;
  const power = s.blockResponse!.powerInstanceId;
  s = next(
    engine.applyAction(s, {
      actor: "GOOD",
      action: { kind: "KEEP_BLOCK_POWER" },
    }),
  );
  while (["COMBAT", "TURN_END", "TURN_START"].includes(s.phase))
    s = engine.advanceAutomatic(s, { maxRoots: 8 }).nextState;
  s = next(
    engine.applyAction(s, { actor: "EVIL", action: { kind: "PASS_PHASE" } }),
  );
  unit(s, "GC01", "GOOD", 2);
  const before = s.players.GOOD.energy.current,
    action = engine
      .getLegalActions(s, "GOOD")
      .find((a) => a.kind === "USE_POWER" && a.powerInstanceId === power);
  expect(action).toBeDefined();
  s = next(engine.applyAction(s, { actor: "GOOD", action: action! }));
  expect(s.players.GOOD.energy.current).toBe(before - 1);
  expect(s.players.GOOD.reserve.some((p) => p.instanceId === power)).toBe(
    false,
  );
});
