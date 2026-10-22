import { describe, it, expect } from "vitest";
import { expansionPowers, heroesCatalog } from "@oathfront/game-content";
import { validateWire } from "@oathfront/contracts";
import type { CardId, PowerId, Target } from "@oathfront/contracts";
import { applyAction, getLegalActions } from "../src/actions.js";
import { ready, unit, card, next } from "./helpers.js";
import type { MatchState, UnitState, PlayerId } from "../src/model.js";
import { createMatch } from "../src/setup.js";
import { createRandomStreams } from "../src/rng.js";
import { applyMulligan } from "../src/mulligan.js";
import { grantPowerOnDraft } from "../src/powers.js";
import { projectPlayerView } from "../src/projection.js";
import { previewPublicAction } from "../src/preview.js";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
function other(side: PlayerId): PlayerId {
  return side === "GOOD" ? "EVIL" : "GOOD";
}
function own(
  state: MatchState,
  side: PlayerId,
  lane: number,
): UnitState | null {
  return state.board[lane - 1]![side === "GOOD" ? "good" : "evil"];
}
function expansionReady(): MatchState {
  const state = ready();
  state.versions.content = "heroes_v1";
  return state;
}
const effects: Record<string, Record<string, unknown>> = {
  S_G_SOL: { shield: true, aa: 3, ah: 2, am: 4 },
  S_G_CAI: { armor: 1, ah: 3, am: 5 },
  S_G_ZEP: { al: 4, aa: 5, draw: 1, duration: "TURN_END" },
  S_G_MER: { stun: true, hero: 13, draw: 1 },
  S_G_MOS: { ah: 3, shield: true, draw: 1 },
  S_G_HAL: { aa: 3, ah: 2, duration: "TURN_END" },
  S_G_ROW: { token: "TK_G_SEED", hero: 14 },
  S_E_ROO: { el: 4, eh: 1 },
  S_E_NYX: { el: 4, poison: true },
  S_E_BRI: { eh: null, enemyHero: 9 },
  S_E_SAB: { ea: 0, poison: true, draw: 1, duration: "TURN_END" },
  S_E_VAN: { al: 4, aa: 3, pierce: true, duration: "TURN_END" },
  S_E_GRA: { token: "TK_E_CINDER", eh: 2 },
  S_E_SCO: { eh: 1, hero: 13, draw: 1 },
};
it.each(heroesCatalog.presets)(
  "$heroId starts a versioned match and receives four distinct owned powers",
  (preset) => {
    const config = matchConfig();
    config.versions.content = "heroes_v1";
    const side = heroesCatalog.heroes.find(
      (h) => h.id === preset.heroId,
    )!.faction;
    config.decks[side] = {
      name: preset.name,
      heroId: preset.heroId,
      contentVersion: preset.contentVersion,
      entries: structuredClone(preset.entries),
    };
    let state = createMatch(config, createRandomStreams(seed));
    state = next(applyMulligan(state, "GOOD", []));
    state = next(applyMulligan(state, "EVIL", []));
    expect(state.players[side].reserve).toHaveLength(1);
    for (let i = 0; i < 3; i++) grantPowerOnDraft(state, [], side, "BLOCK");
    expect([...state.players[side].receivedPowerIds].sort()).toEqual(
      [
        ...heroesCatalog.heroes.find((h) => h.id === preset.heroId)!.powerIds,
      ].sort(),
    );
    expect(() => grantPowerOnDraft(state, [], side, "BLOCK")).toThrow(
      "No unreceived",
    );
  },
);
it("rejects expansion heroes in core matches and expansion tutorials", () => {
  const config = matchConfig(),
    preset = heroesCatalog.presets.find((p) => p.heroId === "H_G_SOL")!;
  config.decks.GOOD = { ...preset, contentVersion: "core_v1" };
  expect(() => createMatch(config, createRandomStreams(seed))).toThrow(
    "Invalid GOOD deck",
  );
  config.versions.content = "heroes_v1";
  config.mode = "TUTORIAL";
  expect(() => createMatch(config, createRandomStreams(seed))).toThrow(
    "Unsupported match version",
  );
});
const definitions = expansionPowers;
describe("every trick/power effect ID uses the catalog action boundary", () => {
  it("pins all fourteen expansion signatures with independent expected outcomes", () =>
    expect(definitions.map((d) => d.id).sort()).toEqual(
      Object.keys(effects).sort(),
    ));
  for (const def of definitions)
    it(def.id, () => {
      const state = expansionReady(),
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
      const preview = previewPublicAction(
        projectPlayerView(state, side),
        action,
      );
      expect(preview.legal).toBe(true);
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
        armor: a?.statuses.armor,
        pierce: a?.statuses.pierce,
        eh: e?.current.hp ?? null,
        ea: e?.current.attack,
        el: e?.laneId,
        stun: e?.statuses.stunned,
        poison: e?.statuses.poisoned,
        hero: after.players[side].hp,
        enemyHero: after.players[enemy].hp,
        draw: after.players[side].hand.length - before,
        token: own(after, side, 4)?.definitionId,
        duration: (
          a?.modifiers.find(
            (m) => m.attackDelta !== 0 || m.healthDelta !== 0,
          ) ??
          e?.modifiers.find((m) => m.attackDelta !== 0 || m.healthDelta !== 0)
        )?.duration,
      };
      expect(actual).toMatchObject(effects[def.id]!);
      expect(
        preview.board.map((l) => [l.good?.current, l.evil?.current]),
      ).toEqual(after.board.map((l) => [l.good?.current, l.evil?.current]));
      expect(after.players[side].energy.current).toBe(9);
      expect(
        result.events.every((ev) => validateWire("VisibleEvent", ev)),
      ).toBe(true);
    });
  it.each(definitions.filter((d) => d.targeting.kind !== "NONE"))(
    "$id refuses missing mandatory target without spending or drawing",
    (def) => {
      const state = expansionReady(),
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
      const state = expansionReady(),
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

it.each(
  expansionPowers.filter((p) =>
    ["MOVE_ALLY", "MOVE_ENEMY", "EMPTY_ALLY_LANE"].includes(p.targeting.kind),
  ),
)("$id has no lane target on a full receiving row", (def) => {
  const state = expansionReady(),
    side = def.faction,
    receiving = def.targeting.kind === "MOVE_ENEMY" ? other(side) : side;
  state.phase = side === "GOOD" ? "GOOD_PLAY" : "EVIL_TRICKS";
  state.activeSide = side;
  for (const lane of [1, 2, 3, 4, 5] as const)
    unit(state, "GC02", receiving, lane);
  state.players[side].reserve = [
    { instanceId: "a".repeat(32), definitionId: def.id, normalCost: 1 },
  ];
  expect(getLegalActions(state, side).some((a) => a.kind === "USE_POWER")).toBe(
    false,
  );
});
it("new signatures are usable for free only as the just-earned Block response", () => {
  const state = expansionReady(),
    side = "GOOD";
  state.phase = "COMBAT";
  state.activeSide = null;
  state.players.GOOD.energy.current = 0;
  const ally = unit(state, "GC02", side, 2),
    instanceId = "a".repeat(32);
  state.players.GOOD.heroId = "H_G_SOL";
  state.players.GOOD.reserve = [
    { instanceId, definitionId: "S_G_SOL", normalCost: 1 },
  ];
  state.blockResponse = { side, powerInstanceId: instanceId, laneId: 1 };
  state.continuation = {
    laneId: 1,
    stage: "BLOCK_RESPONSES",
    pendingResponders: [{ side, powerInstanceId: instanceId }],
    packets: [],
  } as MatchState["continuation"];
  const action = {
    kind: "USE_BLOCK_POWER" as const,
    powerInstanceId: instanceId,
    target: { kind: "UNIT" as const, instanceId: ally.instanceId },
  };
  expect(getLegalActions(state, side)).toContainEqual(action);
  const result = next(applyAction(state, { actor: side, action }));
  expect(result.players.GOOD.energy.current).toBe(0);
  expect(result.board[1]!.good?.statuses.shield).toBe(true);
  expect(result.blockResponse).toBeNull();
});
