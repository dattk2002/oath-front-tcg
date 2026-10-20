import { describe, it, expect } from "vitest";
import { coreCatalog } from "@oathfront/game-content";
import { validateWire } from "@oathfront/contracts";
import type { CardId, PowerId, Target } from "@oathfront/contracts";
import { runRoot } from "../src/effects/resolve.js";
import { runHookOnDraft } from "../src/effects/triggers.js";
import { applyAction, getLegalActions } from "../src/actions.js";
import { ready, unit, card } from "./helpers.js";
import type { MatchState, UnitState, PlayerId } from "../src/model.js";

const abilityIds = [
  "GC03:ON_PLAY",
  "GC04:ON_DESTROYED",
  "B03:ON_PLAY",
  "B04:ON_DAMAGED",
  "V01:ON_PLAY",
  "V02:ON_TURN_END",
  "V03:ON_PLAY",
  "V04:ON_DESTROYED",
  "V05:ON_TURN_END",
  "P02:ON_PLAY",
  "P04:ON_PLAY",
  "EC03:ON_PLAY",
  "EC04:ON_DESTROYED",
  "F01:ON_DESTROYED",
  "F02:ON_PLAY",
  "F03:BEFORE_COMBAT_HERE",
  "F05:ON_DESTROYED",
  "X01:ON_DESTROYED",
  "X02:ON_PLAY",
  "X03:ON_DAMAGED",
  "X04:ON_DESTROYED",
  "X05:ON_TURN_END",
  "S03:ON_PLAY",
];
const outcomes: Record<string, Record<string, unknown>> = {
  GC03: { draw: 1 },
  GC04: { hero: 12 },
  B03: { adjacentShields: [true, true], shield: false },
  B04: { hero: 11 },
  V01: { hero: 11 },
  V02: { hp: 2 },
  V03: { hero: 12 },
  V04: { token: "TK_G_SEED", hp: 1 },
  V05: { hp: 6, adjacentHp: [2, 2] },
  P02: { enemyAttack: 1 },
  P04: { enemyStun: true },
  EC03: { draw: 1 },
  EC04: { enemyHero: 9 },
  F01: { enemyHero: 9 },
  F02: { enemyHp: 2 },
  F03: { attack: 4, duration: "TURN_END" },
  F05: { enemyHero: 8 },
  X01: { enemyPoison: true },
  X02: { enemyPoison: true },
  X03: { attack: 3, duration: "PERMANENT" },
  X04: { token: "TK_E_CINDER", hp: 1 },
  X05: { enemyHero: 9 },
  S03: { attack: 4, duration: "TURN_END" },
};
function own(state: MatchState, side: PlayerId, lane = 3): UnitState | null {
  return state.board[lane - 1]![side === "GOOD" ? "good" : "evil"];
}
function other(side: PlayerId): PlayerId {
  return side === "GOOD" ? "EVIL" : "GOOD";
}
describe("every core ability ID has explicit observable rule expectations", () => {
  it("pins complete ability registry coverage", () =>
    expect(
      coreCatalog.cards.flatMap((c) => c.abilities.map((a) => a.id)).sort(),
    ).toEqual([...abilityIds].sort()));
  for (const id of abilityIds)
    it(id, () => {
      const def = coreCatalog.cards.find((c) =>
        c.abilities.some((a) => a.id === id),
      )!;
      const ability = def.abilities.find((a) => a.id === id)!;
      const state = ready(),
        side = def.faction,
        enemy = other(side);
      state.players[side].hp = 10;
      state.players[enemy].hp = 10;
      const source = unit(state, def.id, side, 3);
      source.current.hp = Math.max(1, source.current.hp - 1);
      const opposing = unit(state, "EC02", enemy, 3);
      const left = unit(state, "GC02", side, 2),
        right = unit(state, "GC02", side, 4);
      left.current.hp = 1;
      right.current.hp = 1;
      if (ability.hook === "ON_DESTROYED") {
        state.board[2]![side === "GOOD" ? "good" : "evil"] = null;
        source.current.hp = 0;
      }
      const result = runRoot(state, (draft, root) =>
        runHookOnDraft(draft, root, ability.hook, [source]),
      );
      const after = result.nextState,
        live = own(after, side),
        foe = own(after, enemy)!;
      const actual = {
        draw: after.players[side].hand.length - state.players[side].hand.length,
        hero: after.players[side].hp,
        enemyHero: after.players[enemy].hp,
        hp: live?.current.hp,
        attack: live?.current.attack,
        shield: live?.statuses.shield,
        token: live?.isToken ? live.definitionId : null,
        adjacentShields: [
          own(after, side, 2)!.statuses.shield,
          own(after, side, 4)!.statuses.shield,
        ],
        adjacentHp: [
          own(after, side, 2)!.current.hp,
          own(after, side, 4)!.current.hp,
        ],
        enemyHp: foe.current.hp,
        enemyAttack: foe.current.attack,
        enemyStun: foe.statuses.stunned,
        enemyPoison: foe.statuses.poisoned,
        duration: live?.modifiers.at(-1)?.duration,
      };
      expect(actual).toMatchObject(outcomes[def.id]!);
      expect(foe.instanceId).toBe(opposing.instanceId);
      expect(result.events.every((e) => validateWire("VisibleEvent", e))).toBe(
        true,
      );
    });
  it.each(["F02", "X02", "P02", "P04"] as CardId[])(
    "%s entry hook is no-op without enemy",
    (id) => {
      const state = ready(),
        def = coreCatalog.cards.find((c) => c.id === id)!;
      const source = unit(state, id, def.faction, 3);
      const result = runRoot(state, (draft, root) =>
        runHookOnDraft(draft, root, "ON_PLAY", [source]),
      );
      expect(result.events).toEqual([]);
      expect(result.nextState.board).toEqual(state.board);
    },
  );
});

const effects: Record<string, Record<string, unknown>> = {
  GC05: { eh: 1 },
  GC06: { draw: 2 },
  B06: { shield: true },
  B07: { ah: 4, am: 6 },
  B08: { eh: null },
  V06: { aa: 3, ah: 3, am: 5 },
  V07: { hero: 14 },
  V08: { token: "TK_G_SEED" },
  P06: { al: 4 },
  P07: { stun: true },
  P08: { eh: null, draw: 1 },
  EC05: { eh: 1 },
  EC06: { draw: 2 },
  F06: { eh: null },
  F07: { aa: 4, duration: "TURN_END" },
  F08: { eh: 1 },
  X06: { poison: true },
  X07: { ea: 0, draw: 1, duration: "TURN_END" },
  X08: { eh: 1, hero: 12 },
  S06: { al: 4 },
  S07: { el: 4 },
  S08: { shield: true, draw: 1 },
  P_B1: { shield: true, draw: 1 },
  P_B2: { ah: 3, draw: 1 },
  P_V1: { ah: 3, am: 5, draw: 1 },
  P_V2: { hero: 13, ah: 2 },
  P_P1: { al: 4, aa: 3, duration: "TURN_END" },
  P_P2: { stun: true, draw: 1 },
  P_F1: { eh: 1 },
  P_F2: { aa: 4, shield: true, duration: "TURN_END" },
  P_X1: { eh: 2, poison: true },
  P_X2: { hero: 12, draw: 1 },
  P_S1: { el: 4 },
  P_S2: { aa: 3, shield: true, duration: "TURN_END" },
  S_G_BV: { shield: true, ah: 3, am: 5, hero: 12 },
  S_G_BP: { eh: 1, stun: true, draw: 1 },
  S_G_VP: { al: 4, aa: 4, ah: 2, am: 4, duration: "PERMANENT" },
  S_E_FX: { eh: 2, enemyHero: 8 },
  S_E_FS: { aa: 4, pierce: true, duration: "TURN_END" },
  S_E_XS: { poison: true, hero: 12 },
};
const definitions = [
  ...coreCatalog.cards.filter((c) => c.type === "TRICK"),
  ...coreCatalog.powers,
];
describe("every trick/power effect ID uses the catalog action boundary", () => {
  it("pins all 22 tricks + 18 powers with independent expected outcomes", () =>
    expect(definitions.map((d) => d.id).sort()).toEqual(
      Object.keys(effects).sort(),
    ));
  for (const def of definitions)
    it(def.id, () => {
      const state = ready(),
        side = def.faction,
        enemy = other(side);
      state.phase = side === "GOOD" ? "GOOD_PLAY" : "EVIL_TRICKS";
      state.activeSide = side;
      state.players[side].hp = 10;
      state.players[enemy].hp = 10;
      const ally = unit(state, "GC02", side, 2);
      ally.current.hp = 1;
      const foe = unit(state, "EC02", enemy, 3);
      const targets: Record<string, Target> = {
        NONE: { kind: "NONE" },
        ALLY_UNIT: { kind: "UNIT", instanceId: ally.instanceId },
        ENEMY_UNIT: { kind: "UNIT", instanceId: foe.instanceId },
        ENEMY_CHARACTER: { kind: "UNIT", instanceId: foe.instanceId },
        EMPTY_ALLY_LANE: { kind: "LANE", laneId: 4 },
        MOVE_ALLY: {
          kind: "UNIT_AND_LANE",
          instanceId: ally.instanceId,
          laneId: 4,
        },
        MOVE_ENEMY: {
          kind: "UNIT_AND_LANE",
          instanceId: foe.instanceId,
          laneId: 4,
        },
      };
      const id =
        def.type === "SUPERPOWER"
          ? "a".repeat(32)
          : card(state, def.id as CardId, side);
      if (def.type === "SUPERPOWER")
        state.players[side].reserve = [
          { instanceId: id, definitionId: def.id as PowerId, normalCost: 1 },
        ];
      const before = state.players[side].hand.length;
      const action =
        def.type === "SUPERPOWER"
          ? {
              kind: "USE_POWER" as const,
              powerInstanceId: id,
              target: targets[def.targeting.kind]!,
            }
          : {
              kind: "PLAY_TRICK" as const,
              cardInstanceId: id,
              target: targets[def.targeting.kind]!,
            };
      expect(getLegalActions(state, side)).toContainEqual(action);
      const result = applyAction(state, { actor: side, action });
      if (result.kind !== "transition") throw new Error(result.code);
      const after = result.nextState,
        a = after.board
          .flatMap((l) => [l.good, l.evil])
          .find((u) => u?.instanceId === ally.instanceId),
        e = after.board
          .flatMap((l) => [l.good, l.evil])
          .find((u) => u?.instanceId === foe.instanceId);
      const actual = {
        aa: a?.current.attack,
        ah: a?.current.hp,
        am: a?.current.maxHp,
        al: a?.laneId,
        shield: a?.statuses.shield,
        pierce: a?.statuses.pierce,
        eh: e?.current.hp ?? null,
        ea: e?.current.attack,
        el: e?.laneId,
        stun: e?.statuses.stunned,
        poison: e?.statuses.poisoned,
        hero: after.players[side].hp,
        enemyHero: after.players[enemy].hp,
        draw:
          after.players[side].hand.length -
          before +
          (def.type === "TRICK" ? 1 : 0),
        token: own(after, side, 4)?.definitionId,
        duration: (
          a?.modifiers.find(
            (m) => m.attackDelta !== 0 || m.healthDelta !== 0,
          ) ?? e?.modifiers.at(-1)
        )?.duration,
      };
      expect(actual).toMatchObject(effects[def.id]!);
      expect(
        result.events.every((ev) => validateWire("VisibleEvent", ev)),
      ).toBe(true);
    });
  it.each(definitions.filter((d) => d.targeting.kind !== "NONE"))(
    "$id refuses missing mandatory target without spending or drawing",
    (def) => {
      const state = ready(),
        side = def.faction;
      state.phase = side === "GOOD" ? "GOOD_PLAY" : "EVIL_TRICKS";
      state.activeSide = side;
      const id =
        def.type === "SUPERPOWER"
          ? "a".repeat(32)
          : card(state, def.id as CardId, side);
      if (def.type === "SUPERPOWER")
        state.players[side].reserve = [
          { instanceId: id, definitionId: def.id as PowerId, normalCost: 1 },
        ];
      const original = structuredClone(state);
      const action =
        def.type === "SUPERPOWER"
          ? {
              kind: "USE_POWER" as const,
              powerInstanceId: id,
              target: { kind: "NONE" as const },
            }
          : {
              kind: "PLAY_TRICK" as const,
              cardInstanceId: id,
              target: { kind: "NONE" as const },
            };
      expect(applyAction(state, { actor: side, action })).toMatchObject({
        kind: "error",
        code: "INVALID_TARGET",
      });
      expect(state).toEqual(original);
    },
  );
  it.each(definitions.filter((d) => d.targeting.kind === "NONE"))(
    "$id works with no units",
    (def) => {
      const state = ready(),
        side = def.faction;
      state.phase = side === "GOOD" ? "GOOD_PLAY" : "EVIL_TRICKS";
      state.activeSide = side;
      const id =
        def.type === "SUPERPOWER"
          ? "a".repeat(32)
          : card(state, def.id as CardId, side);
      if (def.type === "SUPERPOWER")
        state.players[side].reserve = [
          { instanceId: id, definitionId: def.id as PowerId, normalCost: 1 },
        ];
      const action =
        def.type === "SUPERPOWER"
          ? {
              kind: "USE_POWER" as const,
              powerInstanceId: id,
              target: { kind: "NONE" as const },
            }
          : {
              kind: "PLAY_TRICK" as const,
              cardInstanceId: id,
              target: { kind: "NONE" as const },
            };
      expect(applyAction(state, { actor: side, action }).kind).toBe(
        "transition",
      );
    },
  );
});

it.each([
  { id: "B08", hp: 5, afterHp: 2, attack: 1, draw: 0 },
  { id: "P_X1", hp: 1, afterHp: null, attack: null, draw: 0 },
  { id: "S_G_BP", hp: 2, afterHp: null, attack: null, draw: 1 },
])(
  "$id resolves ordered target-dependent parts and independent draw",
  ({ id, hp, afterHp, attack, draw }) => {
    const state = ready(),
      def = [...coreCatalog.cards, ...coreCatalog.powers].find(
        (d) => d.id === id,
      )!,
      side = def.faction,
      enemy = other(side);
    state.phase = side === "GOOD" ? "GOOD_PLAY" : "EVIL_TRICKS";
    state.activeSide = side;
    const target = unit(state, "EC02", enemy, 3);
    target.current.maxHp = 5;
    target.current.hp = hp;
    const instanceId =
      def.type === "SUPERPOWER"
        ? "e".repeat(32)
        : card(state, def.id as CardId, side);
    if (def.type === "SUPERPOWER")
      state.players[side].reserve = [
        { instanceId, definitionId: def.id as PowerId, normalCost: 1 },
      ];
    const before = state.players[side].hand.length;
    const action =
      def.type === "SUPERPOWER"
        ? {
            kind: "USE_POWER" as const,
            powerInstanceId: instanceId,
            target: { kind: "UNIT" as const, instanceId: target.instanceId },
          }
        : {
            kind: "PLAY_TRICK" as const,
            cardInstanceId: instanceId,
            target: { kind: "UNIT" as const, instanceId: target.instanceId },
          };
    const result = applyAction(state, { actor: side, action });
    if (result.kind !== "transition") throw new Error(result.code);
    expect(own(result.nextState, enemy)?.current.hp ?? null).toBe(afterHp);
    expect(own(result.nextState, enemy)?.current.attack ?? null).toBe(attack);
    expect(
      result.nextState.players[side].hand.length -
        before +
        (def.type === "TRICK" ? 1 : 0),
    ).toBe(draw);
    if (id === "B08")
      expect(own(result.nextState, enemy)?.modifiers).toContainEqual(
        expect.objectContaining({
          attackDelta: -1,
          duration: "TURN_END",
          expiryTurn: 5,
        }),
      );
    else
      expect(result.events.some((e) => e.kind === "StatusChanged")).toBe(false);
  },
);
