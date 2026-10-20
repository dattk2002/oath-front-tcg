import { coreCatalog } from "@oathfront/game-content";
import { describe, expect, it } from "vitest";
import * as engine from "../src/index.js";
import { unit } from "./helpers.js";
import { combatState } from "./fixtures/combat-pierce-volcano.js";
import { resolveEffects, runRoot } from "../src/effects/resolve.js";
import { scheduledDamageOnDraft } from "../src/combat.js";
import { validateWire } from "@oathfront/contracts";

describe("R08/R09 atomic combat and scheduled roots", () => {
  it("3/2 versus 3/2 deals both attacks before either corpse is removed", () => {
    const state = combatState();
    const evil = unit(state, "EC02", "EVIL", 1),
      good = unit(state, "GC02", "GOOD", 1);
    for (const u of [evil, good]) u.current = { attack: 3, hp: 2, maxHp: 2 };
    const before = structuredClone(state);
    const result = engine.advanceAutomatic(state, { maxRoots: 2 });
    expect(result.nextState.board[0]).toMatchObject({ good: null, evil: null });
    expect(result.nextState.players.GOOD.hp).toBe(20);
    expect(result.nextState.players.EVIL.hp).toBe(20);
    const declared = result.events.find((e) => e.kind === "AttackDeclared");
    const damage = result.events.find((e) => e.kind === "DamageBatchResolved");
    if (
      declared?.kind !== "AttackDeclared" ||
      damage?.kind !== "DamageBatchResolved"
    )
      throw new Error("missing combat events");
    expect(
      declared.payload.attacks.map((a) => [a.side, a.displayOrder]),
    ).toEqual([
      ["EVIL", 1],
      ["GOOD", 2],
    ]);
    expect(damage.payload.batchId).toBe(declared.payload.batchId);
    expect(
      damage.payload.packets.map((p) => [p.finalDamage, p.displayOrder]),
    ).toEqual([
      [3, 1],
      [3, 2],
    ]);
    expect(result.events.every((e) => validateWire("VisibleEvent", e))).toBe(
      true,
    );
    expect(state).toEqual(before);
  });
  it.each(["stunned", "exhausted", "zero"] as const)(
    "%s unit still blocks lane and receives damage",
    (status) => {
      const state = combatState(),
        defender = unit(state, "GC02", "GOOD", 1);
      unit(state, "EC02", "EVIL", 1).current.attack = 1;
      if (status === "zero") defender.current.attack = 0;
      else defender.statuses[status] = true;
      const result = engine.advanceAutomatic(state, { maxRoots: 2 });
      expect(result.nextState.board[0]!.good!.current.hp).toBe(
        defender.current.hp - 1,
      );
      expect(result.nextState.players.GOOD.hp).toBe(20);
      expect(result.nextState.board[0]!.evil!.current.hp).toBe(3);
      expect(
        result.events
          .filter((e) => e.kind === "AttackDeclared")
          .flatMap((e) => e.payload.attacks)
          .map((a) => a.side),
      ).toEqual(["EVIL"]);
    },
  );
  it("runs BeforeCombat once before snapshot even if the same instance moves to a later lane", () => {
    let state = combatState();
    const attacker = unit(state, "F03", "EVIL", 1);
    const first = engine.advanceAutomatic(state, { maxRoots: 2 });
    expect(first.nextState.players.GOOD.hp).toBe(16);
    expect(first.nextState.board[0]!.evil!.lastRegularAttackTurn).toBe(5);
    state = resolveEffects(
      first.nextState,
      {
        owner: "EVIL",
        definitionId: "P_S2",
        instanceId: null,
        laneId: null,
        target: {
          kind: "UNIT_AND_LANE",
          instanceId: attacker.instanceId,
          laneId: 2,
        },
      },
      [
        {
          kind: "MOVE_UNIT",
          targetUnit: "SELECTED_UNIT",
          targetLane: "SELECTED_LANE",
        },
      ],
    ).nextState;
    state = engine.advanceAutomatic(state, { maxRoots: 8 }).nextState;
    expect(state.players.GOOD.hp).toBe(16);
    expect(state.board[1]!.evil!.current.attack).toBe(4);
  });
  it("checkpoints each scheduled ability and reloads the remaining ordered hooks without repeating", () => {
    const state = combatState();
    unit(state, "F03", "EVIL", 1);
    unit(state, "F03", "GOOD", 1);
    const first = engine.advanceAutomatic(state, { maxRoots: 1 });
    expect(first.nextState.board[0]!.evil!.current.attack).toBe(4);
    expect(first.nextState.board[0]!.good!.current.attack).toBe(3);
    expect(first.nextState.continuation!.stage).toBe("BEFORE_PAIR");
    const second = engine.advanceAutomatic(first.nextState, { maxRoots: 1 });
    expect(
      engine.advanceAutomatic(JSON.parse(JSON.stringify(first.nextState)), {
        maxRoots: 1,
      }),
    ).toEqual(second);
    expect(second.nextState.board[0]!.evil!.modifiers).toHaveLength(1);
    expect(second.nextState.board[0]!.good!.current.attack).toBe(4);
    expect(second.events.some((e) => e.kind === "AttackDeclared")).toBe(false);
    expect(second.nextState.continuation!.stage).toBe("PAIR");
  });
  it("Volcano damages surviving units even when there are no attackers", () => {
    const state = combatState();
    const target = unit(state, "GC02", "GOOD", 1);
    target.statuses.stunned = true;
    state.board[0]!.location = {
      state: "ACTIVE",
      definitionId: "volcano",
      revealTurn: 1,
    };
    const result = engine.advanceAutomatic(state, { maxRoots: 4 });
    expect(result.nextState.board[0]!.good!.current.hp).toBe(2);
    expect(
      result.events.find((e) => e.kind === "DamageBatchResolved"),
    ).toMatchObject({
      payload: {
        packets: [{ source: null, damageType: "LOCATION", finalDamage: 1 }],
      },
    });
  });
  it("stops at a lethal pair before later lanes or Volcano", () => {
    const state = combatState();
    state.players.GOOD.hp = 1;
    unit(state, "EC02", "EVIL", 1);
    unit(state, "EC02", "EVIL", 2);
    const result = engine.advanceAutomatic(state, { maxRoots: 8 });
    expect(result.nextState.lifecycle).toBe("COMPLETED");
    expect(result.nextState.board[1]!.evil!.lastRegularAttackTurn).toBeNull();
    expect(result.events.filter((e) => e.kind === "MatchEnded")).toHaveLength(
      1,
    );
  });
  it("caps each advance at eight complete roots and resumes deterministically", () => {
    const state = combatState();
    for (const lane of [1, 2, 3, 4, 5] as const)
      unit(state, "EC01", "EVIL", lane);
    const whole = engine.advanceAutomatic(state, { maxRoots: 999 });
    expect(whole.nextState.rootSeq - state.rootSeq).toBe(8);
    let split = state;
    const events = [];
    for (let i = 0; i < 8; i++) {
      const r = engine.advanceAutomatic(split, { maxRoots: 1 });
      split = r.nextState;
      events.push(...r.events);
    }
    expect(split).toEqual(whole.nextState);
    expect(events).toEqual(whole.events);
    expect(engine.advanceAutomatic(state, { maxRoots: 0 }).nextState).toEqual(
      state,
    );
    expect(() => engine.advanceAutomatic(state, { maxRoots: NaN })).toThrow(
      RangeError,
    );
  });
  it("finishes lanes in ascending order and reaches TURN_END in lane order and T05 can advance the next lifecycle stage", () => {
    let state = combatState();
    for (const lane of [1, 2, 3, 4, 5] as const)
      unit(state, "EC01", "EVIL", lane);
    const attacks = [];
    for (let i = 0; i < 4; i++) {
      const result = engine.advanceAutomatic(state, { maxRoots: 8 });
      state = result.nextState;
      attacks.push(
        ...result.events
          .filter((e) => e.kind === "AttackDeclared")
          .flatMap((e) => e.payload.attacks)
          .map((a) => a.laneId),
      );
    }
    // The fourth attack blocks, so finish that explicit response before continuing.
    if (state.blockResponse) {
      const kept = engine.applyAction(state, {
        actor: state.blockResponse.side,
        action: { kind: "KEEP_BLOCK_POWER" },
      });
      if (kept.kind !== "transition") throw new Error(kept.code);
      const result = engine.advanceAutomatic(kept.nextState, { maxRoots: 8 });
      state = result.nextState;
      attacks.push(
        ...result.events
          .filter((e) => e.kind === "AttackDeclared")
          .flatMap((e) => e.payload.attacks)
          .map((a) => a.laneId),
      );
    }
    expect(attacks).toEqual([1, 2, 3, 4, 5]);
    expect(state.phase).toBe("TURN_END");
    expect(state.turn).toBe(5);
    expect(state.continuation).toBeNull();
    expect(
      engine.advanceAutomatic(state, { maxRoots: 8 }).nextState,
    ).toMatchObject({ turn: 6, phase: "EVIL_DEPLOY" });
  });
  it("simultaneous combat corpses resolve their hero damage before one draw checkpoint", () => {
    const state = combatState();
    state.players.GOOD.hp = 1;
    state.players.EVIL.hp = 1;
    for (const u of [
      unit(state, "EC04", "EVIL", 1),
      unit(state, "EC04", "GOOD", 1),
    ])
      u.current = { attack: 1, hp: 1, maxHp: 1 };
    const result = engine.advanceAutomatic(state, { maxRoots: 8 });
    expect(result.nextState.outcome).toMatchObject({
      result: "DRAW",
      winner: null,
      reason: "SIMULTANEOUS_LETHAL",
    });
    expect(result.events.filter((e) => e.kind === "MatchEnded")).toHaveLength(
      1,
    );
    expect(result.events.some((e) => e.kind === "BlockResponseOpened")).toBe(
      false,
    );
  });
  it("an invalid grant faults and rolls back the entire combat pair including RNG and attack markers", () => {
    const state = combatState();
    unit(state, "EC01", "EVIL", 1);
    state.players.GOOD.receivedPowerIds = ["P_B1", "P_V1", "P_V2", "S_G_BV"];
    state.players.GOOD.block.charge = 6;
    const beforePair = engine.advanceAutomatic(state, {
      maxRoots: 1,
    }).nextState;
    const result = engine.advanceAutomatic(beforePair, { maxRoots: 1 });
    expect(result.nextState.lifecycle).toBe("FAULTED");
    expect(result.nextState.players).toEqual(beforePair.players);
    expect(result.nextState.board).toEqual(beforePair.board);
    expect(result.nextState.random).toEqual(beforePair.random);
    expect(result.nextState.continuation).toEqual(beforePair.continuation);
    expect(result.events.map((e) => e.kind)).toEqual(["LifecycleChanged"]);
  });
  it("scheduled raw damage enforces the same primitive budget and rolls back on overflow", () => {
    const state = combatState();
    const result = runRoot(state, (draft, root) => {
      root.primitiveCount = 256;
      scheduledDamageOnDraft(draft, root, [
        {
          source: null,
          target: { kind: "HERO", side: "GOOD" },
          rawDamage: 1,
          damageType: "LOCATION",
        },
      ]);
    });
    expect(result.nextState.lifecycle).toBe("FAULTED");
    expect(result.nextState.players.GOOD.hp).toBe(20);
  });
  it("ADVANCE uses the trusted human envelope and cannot bypass a response or paused lifecycle", () => {
    const state = combatState();
    expect(engine.getLegalActions(state, "GOOD")).toEqual([
      { kind: "ADVANCE" },
      { kind: "PAUSE" },
      { kind: "SURRENDER" },
    ]);
    expect(engine.getLegalActions(state, "EVIL")).toEqual([]);
    expect(
      engine.applyAction(state, { actor: "EVIL", action: { kind: "ADVANCE" } }),
    ).toMatchObject({ code: "NOT_YOUR_TURN" });
    expect(
      engine.applyAction(state, { actor: "GOOD", action: { kind: "ADVANCE" } }),
    ).toEqual(engine.advanceAutomatic(state, { maxRoots: 8 }));
    state.lifecycle = "PAUSED";
    expect(
      engine.applyAction(state, { actor: "GOOD", action: { kind: "ADVANCE" } }),
    ).toMatchObject({ code: "MATCH_PAUSED" });
    expect(engine.advanceAutomatic(state, { maxRoots: 8 })).toMatchObject({
      nextState: state,
      events: [],
      waitingForInput: false,
    });
  });
  it("lethal in the last Volcano root ends combat before announcing TURN_END", () => {
    const state = combatState();
    state.continuation = {
      laneId: 5,
      stage: "AFTER_LANE",
      pendingResponders: [],
    };
    state.board[4]!.location = {
      state: "ACTIVE",
      definitionId: "volcano",
      revealTurn: 5,
    };
    unit(state, "EC04", "EVIL", 5).current.hp = 1;
    state.players.GOOD.hp = 1;
    const result = engine.advanceAutomatic(state, { maxRoots: 1 });
    expect(result.nextState.lifecycle).toBe("COMPLETED");
    expect(
      result.events
        .filter((e) => e.kind === "PhaseChanged")
        .map((e) => e.payload.to),
    ).toEqual(["GAME_OVER"]);
  });
});
it("skips a queued source killed by an earlier scheduled root after JSON reload without replaying the first hook", () => {
  // Synthetic scheduled effect exercises cursor eligibility; live catalog is restored before leaving this test.
  const def = coreCatalog.cards.find((c) => c.id === "F03")!,
    ability = def.abilities[0]!,
    original = ability.effects;
  try {
    ability.effects = [
      {
        kind: "DAMAGE",
        targets: "ENEMY_UNIT_HERE",
        amount: 1,
        damageKind: "EFFECT",
      },
    ];
    const s = combatState();
    unit(s, "F03", "EVIL", 1);
    unit(s, "F03", "GOOD", 1).current.hp = 1;
    const first = engine.advanceAutomatic(s, { maxRoots: 1 });
    expect(first.nextState.board[0]!.good).toBeNull();
    expect(first.nextState.continuation?.beforeCombatJobs).toHaveLength(1);
    const second = engine.advanceAutomatic(
      JSON.parse(JSON.stringify(first.nextState)),
      { maxRoots: 1 },
    );
    expect(second.nextState.rootSeq).toBe(first.nextState.rootSeq + 1);
    expect(second.nextState.continuation?.stage).toBe("PAIR");
    expect(second.events).toEqual([]);
    expect(second.nextState.board[0]!.evil?.current.attack).toBe(3);
  } finally {
    ability.effects = original;
  }
});
