import { describe, expect, it } from "vitest";
import { damage } from "../src/effects/damage.js";

describe("R10 armor before shield", () => {
  it("preserves shield when armor absorbs the complete packet", () => {
    expect(damage({ raw: 1, armor: 1, shield: true })).toMatchObject({
      finalDamage: 0,
      shieldConsumed: false,
    });
  });
  it("consumes shield only for a positive post-armor packet", () => {
    expect(damage({ raw: 3, armor: 1, shield: true })).toMatchObject({
      finalDamage: 0,
      shieldConsumed: true,
    });
  });
});

import {
  resolveEffects,
  runRoot,
  resolveEffectsOnDraft,
  settleOnDraft,
} from "../src/effects/resolve.js";
import { applyDamageBatchOnDraft } from "../src/effects/damage.js";
import { runHookOnDraft } from "../src/effects/triggers.js";
import {
  expireModifiersOnDraft,
  regularAttackValue,
} from "../src/modifiers.js";
import { ready, unit } from "./helpers.js";
import { validateWire } from "@oathfront/contracts";
import type { Effect } from "@oathfront/contracts";

const source = {
  owner: "EVIL" as const,
  definitionId: "F06" as const,
  instanceId: null,
  laneId: null,
  target: { kind: "NONE" as const },
};
describe("effect roots and cascades", () => {
  it("damage multi-target commits all HP and removes all corpses before corpse selectors run", () => {
    const state = ready();
    unit(state, "X01", "EVIL", 1);
    unit(state, "GC01", "GOOD", 1);
    const after = runRoot(state, (draft, root) => {
      const survivors = applyDamageBatchOnDraft(draft, root.events, [
        {
          source: null,
          target: {
            kind: "UNIT",
            instanceId: draft.board[0]!.evil!.instanceId,
          },
          rawDamage: 2,
          damageType: "EFFECT",
        },
        {
          source: null,
          target: {
            kind: "UNIT",
            instanceId: draft.board[0]!.good!.instanceId,
          },
          rawDamage: 2,
          damageType: "EFFECT",
        },
      ]);
      settleOnDraft(draft, root, survivors);
    });
    expect(after.nextState.board[0]).toMatchObject({ evil: null, good: null });
    expect(after.events.filter((e) => e.kind === "UnitDestroyed")).toHaveLength(
      2,
    );
    expect(after.events.every((e) => validateWire("VisibleEvent", e))).toBe(
      true,
    );
  });
  it("queues ON_DAMAGED only for surviving positive damage and only once this turn", () => {
    const state = ready();
    const target = unit(state, "X03", "EVIL", 2);
    const context = {
      ...source,
      target: { kind: "UNIT" as const, instanceId: target.instanceId },
    };
    const hit: Effect = {
      kind: "DAMAGE",
      targets: "SELECTED_UNIT",
      amount: 1,
      damageKind: "EFFECT",
    };
    const first = resolveEffects(state, context, [hit, hit]);
    expect(first.nextState.board[1]!.evil!.current).toMatchObject({
      hp: 2,
      attack: 3,
    });
    const killed = resolveEffects(state, context, [{ ...hit, amount: 4 }]);
    expect(killed.nextState.board[1]!.evil).toBeNull();
    expect(killed.events.filter((e) => e.kind === "StatsChanged")).toHaveLength(
      0,
    );
  });
  it("removes corpses simultaneously then summons fresh unbuffed token without Location entry", () => {
    const state = ready();
    const target = unit(state, "X04", "EVIL", 1);
    target.current.hp = 1;
    target.statuses.poisoned = true;
    state.board[0]!.location = {
      state: "ACTIVE",
      definitionId: "ancient_forest",
      revealTurn: 1,
    };
    const result = resolveEffects(
      state,
      { ...source, target: { kind: "UNIT", instanceId: target.instanceId } },
      [
        {
          kind: "DAMAGE",
          targets: "SELECTED_UNIT",
          amount: 1,
          damageKind: "EFFECT",
        },
      ],
    );
    expect(result.nextState.board[0]!.evil).toMatchObject({
      definitionId: "TK_E_CINDER",
      current: { hp: 1, maxHp: 1, attack: 2 },
      statuses: { poisoned: false },
      lastRegularAttackTurn: null,
    });
    expect(result.nextState.players.EVIL.discard).toContainEqual({
      definitionId: "X04",
      quantity: 1,
    });
    expect(result.events.map((e) => e.kind)).toEqual([
      "DamageBatchResolved",
      "UnitDestroyed",
      "CardDiscarded",
      "UnitCreated",
    ]);
  });
  it("target lost after damage is not retargeted while independent draw continues", () => {
    const state = ready();
    const target = unit(state, "GC01", "GOOD", 2);
    target.current.hp = 1;
    const result = resolveEffects(
      state,
      { ...source, target: { kind: "UNIT", instanceId: target.instanceId } },
      [
        {
          kind: "DAMAGE",
          targets: "SELECTED_UNIT",
          amount: 2,
          damageKind: "EFFECT",
        },
        { kind: "APPLY_STUN", targets: "SELECTED_UNIT", duration: "TURN_END" },
        { kind: "DRAW", owner: "SELF", count: 1 },
      ],
    );
    expect(result.nextState.board[1]!.good).toBeNull();
    expect(result.nextState.players.EVIL.hand).toHaveLength(
      state.players.EVIL.hand.length + 1,
    );
    expect(result.events.some((e) => e.kind === "StatusChanged")).toBe(false);
  });
  it("cannot heal a hero killed earlier in its root, including corpse healing", () => {
    const state = ready();
    state.players.GOOD.hp = 1;
    const target = unit(state, "GC04", "GOOD", 1);
    const result = resolveEffects(
      state,
      { ...source, target: { kind: "UNIT", instanceId: target.instanceId } },
      [
        {
          kind: "DAMAGE",
          targets: "ENEMY_HERO",
          amount: 1,
          damageKind: "EFFECT",
        },
        {
          kind: "DAMAGE",
          targets: "SELECTED_UNIT",
          amount: 3,
          damageKind: "EFFECT",
        },
      ],
    );
    expect(result.nextState.players.GOOD.hp).toBe(0);
    expect(result.nextState.lifecycle).toBe("COMPLETED");
    expect(result.nextState.outcome?.winner).toBe("EVIL");
  });
  it("settles death damage after lethal until the whole root yields a simultaneous draw", () => {
    const state = ready();
    state.players.GOOD.hp = 1;
    state.players.EVIL.hp = 1;
    const corpse = unit(state, "F01", "EVIL", 1);
    const result = resolveEffects(
      state,
      {
        owner: "GOOD",
        definitionId: "GC05",
        instanceId: null,
        laneId: null,
        target: { kind: "UNIT", instanceId: corpse.instanceId },
      },
      [
        {
          kind: "DAMAGE",
          targets: "ENEMY_HERO",
          amount: 1,
          damageKind: "EFFECT",
        },
        {
          kind: "DAMAGE",
          targets: "SELECTED_UNIT",
          amount: 1,
          damageKind: "EFFECT",
        },
      ],
    );
    expect(result.nextState.outcome).toEqual({
      result: "DRAW",
      winner: null,
      reason: "SIMULTANEOUS_LETHAL",
    });
  });
  it("move preserves identity, wound, statuses and attack marker; frozen/forest entry do not fire", () => {
    const state = ready();
    const target = unit(state, "EC02", "EVIL", 2);
    target.current.hp = 1;
    target.lastRegularAttackTurn = 5;
    state.board[0]!.location = {
      state: "ACTIVE",
      definitionId: "frozen_lake",
      revealTurn: 1,
    };
    const result = resolveEffects(
      state,
      {
        ...source,
        target: {
          kind: "UNIT_AND_LANE",
          instanceId: target.instanceId,
          laneId: 1,
        },
      },
      [
        {
          kind: "MOVE_UNIT",
          targetUnit: "SELECTED_UNIT",
          targetLane: "SELECTED_LANE",
        },
      ],
    );
    expect(result.nextState.board[1]!.evil).toBeNull();
    expect(result.nextState.board[0]!.evil).toMatchObject({
      ...target,
      laneId: 1,
    });
    expect(state.board[1]!.evil).toEqual(target);
  });
  it("buff expiry clamps HP rather than reapplying damage, and preserves permanent traits", () => {
    const state = ready();
    const target = unit(state, "EC02", "EVIL", 2);
    const context = {
      ...source,
      target: { kind: "UNIT" as const, instanceId: target.instanceId },
    };
    const result = resolveEffects(state, context, [
      {
        kind: "MODIFY_STATS",
        targets: "SELECTED_UNIT",
        attackDelta: -9,
        healthDelta: 3,
        duration: "TURN_END",
      },
      { kind: "GRANT_PIERCE", targets: "SELECTED_UNIT", duration: "TURN_END" },
      { kind: "GRANT_ARMOR", targets: "SELECTED_UNIT" },
      { kind: "GRANT_SHIELD", targets: "SELECTED_UNIT" },
    ]);
    expect(result.nextState.board[1]!.evil!.current).toEqual({
      attack: 0,
      hp: 6,
      maxHp: 6,
    });
    const final = runRoot(result.nextState, (draft, root) =>
      expireModifiersOnDraft(draft, root.events),
    );
    expect(final.nextState.board[1]!.evil!.current).toEqual({
      attack: 2,
      hp: 3,
      maxHp: 3,
    });
    expect(final.nextState.board[1]!.evil!.statuses).toMatchObject({
      pierce: false,
      shield: true,
      armor: 1,
    });
  });
  it("Storm Peak checks printed attack and Arena checks current occupancy", () => {
    const state = ready();
    const target = unit(state, "F03", "EVIL", 1);
    state.board[0]!.location = {
      state: "ACTIVE",
      definitionId: "storm_peak",
      revealTurn: 1,
    };
    const result = resolveEffects(
      state,
      { ...source, target: { kind: "UNIT", instanceId: target.instanceId } },
      [
        {
          kind: "MODIFY_STATS",
          targets: "SELECTED_UNIT",
          attackDelta: 2,
          healthDelta: 0,
          duration: "PERMANENT",
        },
      ],
    );
    expect(
      regularAttackValue(result.nextState, result.nextState.board[0]!.evil!),
    ).toBe(6);
    expect(result.nextState.board[0]!.evil!.printed.attack).toBe(3);
    result.nextState.board[0]!.location = {
      state: "ACTIVE",
      definitionId: "ruined_arena",
      revealTurn: 1,
    };
    expect(
      regularAttackValue(result.nextState, result.nextState.board[0]!.evil!),
    ).toBe(5);
    unit(result.nextState, "GC01", "GOOD", 1);
    expect(
      regularAttackValue(result.nextState, result.nextState.board[0]!.evil!),
    ).toBe(6);
  });
  it("rolls back the entire action and RNG on primitive overflow", () => {
    const state = ready();
    const original = structuredClone(state);
    const result = resolveEffects(
      state,
      source,
      Array.from({ length: 257 }, () => ({
        kind: "HEAL" as const,
        targets: "ALLY_HERO" as const,
        amount: 1,
      })),
    );
    expect(result.nextState).toEqual({
      ...original,
      lifecycle: "FAULTED",
      eventSeq: original.eventSeq + 1,
    });
    expect(result.events).toHaveLength(1);
    expect(state).toEqual(original);
  });
  it("rolls back unsafe integer overflow", () => {
    const state = ready();
    const target = unit(state, "EC02", "EVIL", 2);
    const result = resolveEffects(
      state,
      { ...source, target: { kind: "UNIT", instanceId: target.instanceId } },
      [
        {
          kind: "MODIFY_STATS",
          targets: "SELECTED_UNIT",
          attackDelta: Number.MAX_SAFE_INTEGER,
          healthDelta: 0,
          duration: "PERMANENT",
        },
      ],
    );
    expect(result.nextState.lifecycle).toBe("FAULTED");
    expect(result.nextState.board).toEqual(state.board);
  });
  it("before-combat limit is per instance across movement, not per lane", () => {
    const state = ready();
    const target = unit(state, "F03", "EVIL", 1);
    const result = runRoot(state, (draft, root) => {
      runHookOnDraft(draft, root, "BEFORE_COMBAT_HERE", [target]);
      resolveEffectsOnDraft(
        draft,
        {
          ...source,
          target: {
            kind: "UNIT_AND_LANE",
            instanceId: target.instanceId,
            laneId: 3,
          },
        },
        [
          {
            kind: "MOVE_UNIT",
            targetUnit: "SELECTED_UNIT",
            targetLane: "SELECTED_LANE",
          },
        ],
        root,
      );
      runHookOnDraft(draft, root, "BEFORE_COMBAT_HERE", [
        draft.board[2]!.evil!,
      ]);
    });
    expect(result.nextState.board[2]!.evil!.current.attack).toBe(4);
  });
});

describe("batch and closed primitive edge cases", () => {
  it("duplicate packets snapshot a living target once and retain one summed HP change even after lethal", () => {
    const state = ready(),
      target = unit(state, "EC01", "EVIL", 1);
    const result = runRoot(state, (draft, root) => {
      const damaged = applyDamageBatchOnDraft(draft, root.events, [
        {
          source: null,
          target: { kind: "UNIT", instanceId: target.instanceId },
          rawDamage: 2,
          damageType: "EFFECT",
        },
        {
          source: null,
          target: { kind: "UNIT", instanceId: target.instanceId },
          rawDamage: 3,
          damageType: "EFFECT",
        },
      ]);
      settleOnDraft(draft, root, damaged);
    });
    const event = result.events.find((e) => e.kind === "DamageBatchResolved");
    expect(event?.payload.packets).toHaveLength(2);
    expect(event?.payload.hpChanges).toEqual([
      {
        target: { kind: "UNIT", instanceId: target.instanceId },
        before: 1,
        after: -4,
      },
    ]);
  });
  it("positive-damage jobs precede death jobs in a batch irrespective of lane order", () => {
    const state = ready(),
      corpse = unit(state, "F01", "EVIL", 1),
      survivor = unit(state, "X03", "EVIL", 5);
    const result = runRoot(state, (draft, root) => {
      const damaged = applyDamageBatchOnDraft(draft, root.events, [
        {
          source: null,
          target: { kind: "UNIT", instanceId: corpse.instanceId },
          rawDamage: 1,
          damageType: "EFFECT",
        },
        {
          source: null,
          target: { kind: "UNIT", instanceId: survivor.instanceId },
          rawDamage: 1,
          damageType: "EFFECT",
        },
      ]);
      settleOnDraft(draft, root, damaged);
    });
    const kinds = result.events.map((e) => e.kind);
    expect(kinds.indexOf("StatsChanged")).toBeLessThan(
      kinds.lastIndexOf("DamageBatchResolved"),
    );
    expect(result.nextState.players.GOOD.hp).toBe(19);
  });
  it("zero and fully mitigated packets never trigger damaged hooks", () => {
    const state = ready(),
      target = unit(state, "X03", "EVIL", 2);
    target.statuses.armor = 1;
    target.statuses.shield = true;
    const result = resolveEffects(
      state,
      { ...source, target: { kind: "UNIT", instanceId: target.instanceId } },
      [
        {
          kind: "DAMAGE",
          targets: "SELECTED_UNIT",
          amount: 0,
          damageKind: "EFFECT",
        },
        {
          kind: "DAMAGE",
          targets: "SELECTED_UNIT",
          amount: 1,
          damageKind: "EFFECT",
        },
        {
          kind: "DAMAGE",
          targets: "SELECTED_UNIT",
          amount: 2,
          damageKind: "EFFECT",
        },
      ],
    );
    expect(result.nextState.board[1]!.evil!.current).toEqual(target.current);
    expect(result.events.filter((e) => e.kind === "StatsChanged")).toEqual([]);
    expect(result.nextState.board[1]!.evil!.statuses.shield).toBe(false);
  });
  it("stacks neither armor, poison nor shield and poison does not bypass mitigation", () => {
    const state = ready(),
      target = unit(state, "EC02", "EVIL", 2);
    const context = {
      ...source,
      target: { kind: "UNIT" as const, instanceId: target.instanceId },
    };
    const buffs: Effect[] = [
      { kind: "GRANT_ARMOR", targets: "SELECTED_UNIT" },
      { kind: "GRANT_SHIELD", targets: "SELECTED_UNIT" },
      { kind: "APPLY_POISON", targets: "SELECTED_UNIT" },
    ];
    const result = resolveEffects(state, context, [...buffs, ...buffs]);
    expect(result.nextState.board[1]!.evil!.statuses).toMatchObject({
      armor: 1,
      shield: true,
      poisoned: true,
    });
    expect(result.nextState.board[1]!.evil!.modifiers).toHaveLength(3);
    const poisoned = runRoot(result.nextState, (draft, root) => {
      settleOnDraft(
        draft,
        root,
        applyDamageBatchOnDraft(draft, root.events, [
          {
            source: null,
            target: { kind: "UNIT", instanceId: target.instanceId },
            rawDamage: 1,
            damageType: "POISON",
          },
        ]),
      );
    });
    expect(poisoned.nextState.board[1]!.evil!.statuses.shield).toBe(true);
    expect(poisoned.nextState.board[1]!.evil!.current.hp).toBe(3);
  });
  it("overdraw exposes only discarded definition and fatigue draws resolve one by one in the same root", () => {
    const state = ready();
    while (state.players.EVIL.hand.length < 10)
      state.players.EVIL.hand.push(state.players.EVIL.deck.shift()!);
    const top = state.players.EVIL.deck[0]!;
    const result = resolveEffects(state, source, [
      { kind: "DRAW", owner: "SELF", count: 1 },
    ]);
    expect(result.nextState.players.EVIL.hand).toHaveLength(10);
    expect(result.nextState.players.EVIL.discard).toContainEqual({
      definitionId: top.definitionId,
      quantity: 1,
    });
    expect(result.events.some((e) => e.kind === "CardDrawn")).toBe(false);
    const empty = ready();
    empty.players.EVIL.deck = [];
    const tired = resolveEffects(empty, source, [
      { kind: "DRAW", owner: "SELF", count: 2 },
    ]);
    expect(tired.nextState.players.EVIL).toMatchObject({
      hp: 17,
      fatigueCounter: 2,
    });
    expect(
      tired.events
        .filter((e) => e.kind === "DamageBatchResolved")
        .map((e) => e.payload.packets[0].rawDamage),
    ).toEqual([1, 2]);
  });
  it("token death never increments ordinary discard and full summon lane is no-op", () => {
    const state = ready();
    const first = resolveEffects(
      state,
      { ...source, target: { kind: "LANE", laneId: 1 } },
      [
        {
          kind: "SUMMON_TOKEN",
          tokenId: "TK_E_CINDER",
          laneSelector: "SELECTED_LANE",
        },
        {
          kind: "SUMMON_TOKEN",
          tokenId: "TK_E_CINDER",
          laneSelector: "SELECTED_LANE",
        },
      ],
    );
    expect(first.events.filter((e) => e.kind === "UnitCreated")).toHaveLength(
      1,
    );
    const token = first.nextState.board[0]!.evil!;
    const second = resolveEffects(
      first.nextState,
      { ...source, target: { kind: "UNIT", instanceId: token.instanceId } },
      [
        {
          kind: "DAMAGE",
          targets: "SELECTED_UNIT",
          amount: 1,
          damageKind: "EFFECT",
        },
      ],
    );
    expect(second.nextState.players.EVIL.discard).toEqual([]);
  });
  it("temporary Pierce expiry preserves a later permanent grant and innate Pierce", () => {
    const state = ready(),
      target = unit(state, "EC02", "EVIL", 2);
    unit(state, "F04", "EVIL", 3);
    const result = resolveEffects(
      state,
      { ...source, target: { kind: "UNIT", instanceId: target.instanceId } },
      [
        {
          kind: "GRANT_PIERCE",
          targets: "SELECTED_UNIT",
          duration: "TURN_END",
        },
        {
          kind: "GRANT_PIERCE",
          targets: "SELECTED_UNIT",
          duration: "PERMANENT",
        },
      ],
    );
    const after = runRoot(result.nextState, (draft, root) =>
      expireModifiersOnDraft(draft, root.events),
    );
    expect(after.nextState.board[1]!.evil!.statuses.pierce).toBe(true);
    expect(after.nextState.board[2]!.evil!.statuses.pierce).toBe(true);
  });
  it("32-generation guard rolls back its root", () => {
    const state = ready(),
      target = unit(state, "X03", "EVIL", 2);
    const result = runRoot(state, (_draft, root) => {
      root.queue.push({
        source: target,
        ability: {
          id: "guard",
          hook: "ON_DAMAGED",
          conditions: [],
          effects: [],
          limit: null,
          exactTextVi: "",
        },
        generation: 33,
        damaged: true,
      });
    });
    expect(result.nextState.lifecycle).toBe("FAULTED");
    expect(result.nextState.board).toEqual(state.board);
  });
});

it("attributes trick/power damage to caster hero and corpse damage to the former unit", () => {
  const state = ready();
  const result = resolveEffects(
    state,
    { ...source, instanceId: "b".repeat(32) },
    [
      {
        kind: "DAMAGE",
        targets: "ENEMY_HERO",
        amount: 1,
        damageKind: "EFFECT",
      },
    ],
  );
  expect(
    result.events.find((e) => e.kind === "DamageBatchResolved")?.payload
      .packets[0].source,
  ).toEqual({ kind: "HERO", side: "EVIL" });
  const dead = unit(state, "F01", "EVIL", 1);
  const killed = resolveEffects(
    state,
    { ...source, target: { kind: "UNIT", instanceId: dead.instanceId } },
    [
      {
        kind: "DAMAGE",
        targets: "SELECTED_UNIT",
        amount: 1,
        damageKind: "EFFECT",
      },
    ],
  );
  expect(
    killed.events.filter((e) => e.kind === "DamageBatchResolved").at(-1)
      ?.payload.packets[0].source,
  ).toEqual({ kind: "UNIT", instanceId: dead.instanceId });
});

it.each(["ancient_forest", "frozen_lake"] as const)(
  "tokens entering %s receive neither entry HP nor exhaustion",
  (location) => {
    const state = ready();
    state.board[0]!.location = {
      state: "ACTIVE",
      definitionId: location,
      revealTurn: 1,
    };
    const result = resolveEffects(
      state,
      { ...source, target: { kind: "LANE", laneId: 1 } },
      [
        {
          kind: "SUMMON_TOKEN",
          tokenId: "TK_E_CINDER",
          laneSelector: "SELECTED_LANE",
        },
      ],
    );
    expect(result.nextState.board[0]!.evil).toMatchObject({
      current: { attack: 2, hp: 1, maxHp: 1 },
      statuses: { exhausted: false },
      modifiers: [],
    });
  },
);

it("records a permanent Pierce upgrade in an event even when visible status is already true", () => {
  const state = ready(),
    target = unit(state, "EC02", "EVIL", 2),
    context = {
      ...source,
      target: { kind: "UNIT" as const, instanceId: target.instanceId },
    };
  const temporary = resolveEffects(state, context, [
    { kind: "GRANT_PIERCE", targets: "SELECTED_UNIT", duration: "TURN_END" },
  ]);
  const permanent = resolveEffects(temporary.nextState, context, [
    { kind: "GRANT_PIERCE", targets: "SELECTED_UNIT", duration: "PERMANENT" },
  ]);
  const modifier = permanent.nextState.board[1]!.evil!.modifiers.at(-1)!;
  expect(
    permanent.events.some((e) => e.sequence === modifier.createdEventSeq),
  ).toBe(true);
  expect(permanent.events).toContainEqual(
    expect.objectContaining({
      kind: "StatsChanged",
      payload: expect.objectContaining({
        modifiers: expect.arrayContaining([
          expect.objectContaining({ trait: "PIERCE", duration: "PERMANENT" }),
        ]),
      }),
    }),
  );
});
