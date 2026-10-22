import { expect, it } from "vitest";
import {
  elementsCatalog,
  systemPowers,
  eventCards,
} from "@oathfront/game-content";
import type {
  CardId,
  PlayerAction,
  PresetDTO,
  Side,
  Target,
} from "@oathfront/contracts";
import {
  applyAction,
  getLegalActions,
  createMatch,
  createRandomStreams,
  projectPlayerView,
  previewPublicAction,
  applyMulligan,
} from "../src/index.js";
import { grantPowerOnDraft } from "../src/powers.js";
import { createUnitOnDraft } from "../src/units.js";
import { runRoot } from "../src/effects/resolve.js";
import { runHookOnDraft } from "../src/effects/triggers.js";
import { scheduledDamageOnDraft } from "../src/combat.js";
import { expireModifiersOnDraft } from "../src/modifiers.js";
import { card, next } from "./helpers.js";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
import type { MatchState } from "../src/model.js";

function deck(p: PresetDTO) {
  return {
    name: p.name,
    heroId: p.heroId,
    entries: structuredClone(p.entries),
    contentVersion: p.contentVersion,
  };
}
function ready(side: Side = "GOOD") {
  const config = matchConfig();
  config.versions.content = "elements_v1";
  for (const s of ["GOOD", "EVIL"] as const)
    config.decks[s] = deck(
      elementsCatalog.presets.find(
        (p) =>
          elementsCatalog.heroes.find((h) => h.id === p.heroId)!.faction === s,
      )!,
    );
  const state = createMatch(config, createRandomStreams(seed));
  state.phase = side === "GOOD" ? "GOOD_PLAY" : "EVIL_TRICKS";
  state.activeSide = side;
  state.turn = 5;
  for (const s of ["GOOD", "EVIL"] as const) {
    state.players[s].energy = { current: 10, max: 10 };
    state.players[s].mulliganCommitted = true;
    state.players[s].hp = 10;
    state.players[s].hand = [];
  }
  for (const lane of state.board) lane.location = { state: "NORMAL" };
  return state;
}
function unit(
  state: MatchState,
  id: CardId,
  side: Side,
  lane: 1 | 2 | 3 | 4 | 5,
) {
  return createUnitOnDraft(
    state,
    [],
    elementsCatalog.cards.find((c) => c.id === id)!,
    side,
    lane,
    "PLAY",
  );
}
function view(state: MatchState, side: Side = "GOOD") {
  return projectPlayerView(state, side);
}
function visibleBoard(board: ReturnType<typeof projectPlayerView>["board"]) {
  return board.map((l) => ({
    laneId: l.laneId,
    good: l.good
      ? {
          id: l.good.definitionId,
          current: l.good.current,
          statuses: l.good.statuses,
        }
      : null,
    evil: l.evil
      ? {
          id: l.evil.definitionId,
          current: l.evil.current,
          statuses: l.evil.statuses,
        }
      : null,
  }));
}
const powers: Record<string, Record<string, unknown>> = {
  P_GROVE1: { hp: 13, allyHp: 2 },
  P_GROVE2: { allyHp: 3, allyMax: 5, draw: 1 },
  P_TERRA1: { shield: true, draw: 1 },
  P_TERRA2: { armor: 1, allyHp: 2, allyMax: 4 },
  P_TIDE1: { enemyLane: 4 },
  P_TIDE2: { stun: true, hp: 11 },
  P_TEMPEST1: { allyLane: 4, attack: 4 },
  P_TEMPEST2: { enemyHp: 1 },
  P_SOLAR1: { attack: 4, draw: 1 },
  P_SOLAR2: { hp: 14 },
  P_FORGE1: { allyHp: 3, draw: 1 },
  P_FORGE2: { allyHp: 2, allyMax: 4, attack: 3 },
  P_ARCANE1: { draw: 2 },
  P_ARCANE2: { stun: true, draw: 1 },
  P_UMBRAL1: { poison: true },
  P_UMBRAL2: { enemyAttack: 0, draw: 1 },
};
it.each(systemPowers)(
  "$id resolves its own phase, target and literal effect with public preview parity",
  (def) => {
    const hero = elementsCatalog.heroes.find((h) =>
      h.powerIds.includes(def.id),
    )!;
    const side = hero.faction,
      enemy = side === "GOOD" ? "EVIL" : "GOOD";
    const state = ready(side);
    state.players[side].heroId = hero.id;
    const ally = unit(state, "GC02", side, 2);
    ally.current.hp = 1;
    const foe = unit(state, "EC02", enemy, 3);
    const target: Target = (
      {
        NONE: { kind: "NONE" },
        ALLY_UNIT: { kind: "UNIT", instanceId: ally.instanceId },
        ENEMY_UNIT: { kind: "UNIT", instanceId: foe.instanceId },
        ENEMY_CHARACTER: { kind: "UNIT", instanceId: foe.instanceId },
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
      } as Record<string, Target>
    )[def.targeting.kind]!;
    state.players[side].reserve = [
      { instanceId: "a".repeat(32), definitionId: def.id, normalCost: 1 },
    ];
    const action: PlayerAction = {
      kind: "USE_POWER",
      powerInstanceId: "a".repeat(32),
      target,
    };
    expect(getLegalActions(state, side)).toContainEqual(action);
    const preview = previewPublicAction(view(state, side), action);
    const after = next(applyAction(state, { actor: side, action }));
    const all = after.board
        .flatMap((l) => [l.good, l.evil])
        .filter((u) => u !== null),
      a = all.find((u) => u.instanceId === ally.instanceId)!,
      e = all.find((u) => u.instanceId === foe.instanceId)!;
    const actual = {
      hp: after.players[side].hp,
      allyHp: a.current.hp,
      allyMax: a.current.maxHp,
      allyLane: a.laneId,
      attack: a.current.attack,
      shield: a.statuses.shield,
      armor: a.statuses.armor,
      enemyHp: e.current.hp,
      enemyAttack: e.current.attack,
      enemyLane: e.laneId,
      stun: e.statuses.stunned,
      poison: e.statuses.poisoned,
      draw: after.players[side].hand.length,
    };
    expect(actual).toMatchObject(powers[def.id]!);
    expect(after.players[side].energy.current).toBe(9);
    expect(visibleBoard(preview.board)).toEqual(
      visibleBoard(view(after, side).board),
    );
  },
);
const events = [
  { id: "E01", hp: 10, eh: 3, atk: 2, draw: 0, healOnDeath: 2 },
  { id: "E02", hp: 12, eh: 3, atk: 2, draw: 0, healOnDeath: 0 },
  { id: "E03", hp: 10, eh: 2, atk: 3, draw: 0, healOnDeath: 0, enemyHero: 9 },
  {
    id: "E04",
    hp: 10,
    eh: 3,
    atk: 2,
    draw: 0,
    healOnDeath: 0,
    poisonOnDeath: true,
  },
  { id: "E05", hp: 10, eh: 3, atk: 1, draw: 0, healOnDeath: 0 },
  { id: "E06", hp: 11, eh: 3, atk: 2, draw: 0, healOnDeath: 0, stun: true },
  { id: "E07", hp: 10, eh: 3, atk: 4, draw: 0, healOnDeath: 0 },
  { id: "E08", hp: 10, eh: 3, atk: 1, draw: 1, healOnDeath: 0, drawOnDeath: 1 },
  {
    id: "E09",
    hp: 11,
    eh: 3,
    atk: 3,
    draw: 0,
    healOnDeath: 0,
    token: "TK_G_SEED",
  },
  { id: "E10", hp: 10, eh: 3, atk: 3, draw: 0, healOnDeath: 0 },
  { id: "E11", hp: 10, eh: 3, atk: 5, draw: 0, healOnDeath: 3 },
  {
    id: "E12",
    hp: 10,
    eh: 3,
    atk: 3,
    draw: 0,
    healOnDeath: 0,
    poison: true,
    drawOnDeath: 1,
  },
];
it.each(events)(
  "$id executes unit hooks and destruction with versioned preview",
  (want) => {
    const def = eventCards.find((c) => c.id === want.id)!;
    const hero =
      elementsCatalog.heroes.find(
        (h) => h.classes.includes(def.classId!) && h.faction === "GOOD",
      ) ??
      elementsCatalog.heroes.find((h) => h.classes.includes(def.classId!))!;
    const side = hero.faction,
      enemy = side === "GOOD" ? "EVIL" : "GOOD",
      key = side === "GOOD" ? "good" : "evil",
      enemyKey = side === "GOOD" ? "evil" : "good";
    const state = ready(side);
    state.players[side].heroId = hero.id;
    if (side === "EVIL") state.phase = "EVIL_DEPLOY";
    unit(state, "EC02", enemy, 2);
    const id = card(state, def.id, side),
      action: PlayerAction = {
        kind: "PLAY_UNIT",
        cardInstanceId: id,
        laneId: 2,
      };
    expect(getLegalActions(state, side)).toContainEqual(action);
    const preview = previewPublicAction(view(state, side), action);
    let after = next(applyAction(state, { actor: side, action }));
    expect(after.players[side].hp).toBe(want.hp);
    expect(after.players[side].hand).toHaveLength(want.draw);
    expect(after.board[1]![key]!.current.attack).toBe(want.atk);
    expect(after.board[1]![enemyKey]!.current.hp).toBe(want.eh);
    expect(after.board[1]![enemyKey]!.statuses.stunned).toBe(
      want.stun ?? false,
    );
    expect(after.board[1]![enemyKey]!.statuses.poisoned).toBe(
      want.poison ?? false,
    );
    expect(visibleBoard(preview.board)).toEqual(
      visibleBoard(view(after, side).board),
    );
    after.board[1]![key]!.statuses.shield = false;
    after = next(
      runRoot(after, (draft, root) =>
        scheduledDamageOnDraft(draft, root, [
          {
            source: null,
            target: { kind: "UNIT", instanceId: id },
            rawDamage: 30,
            damageType: "EFFECT",
          },
        ]),
      ),
    );
    expect(after.players[side].hp).toBe(want.hp + want.healOnDeath);
    expect(after.players[enemy].hp).toBe(want.enemyHero ?? 10);
    expect(after.players[side].hand).toHaveLength(
      want.draw + (want.drawOnDeath ?? 0),
    );
    if (want.poisonOnDeath)
      expect(after.board[1]![enemyKey]!.statuses.poisoned).toBe(true);
    expect(after.board[1]![key]?.definitionId ?? null).toBe(want.token ?? null);
  },
);
it("keeps new Pierce innate, limits combat/damage triggers and heals at end turn", () => {
  let state = ready();
  unit(state, "E04", "GOOD", 1);
  const ram = unit(state, "E10", "GOOD", 2),
    bird = unit(state, "E07", "GOOD", 3),
    keeper = unit(state, "E02", "GOOD", 4),
    bot = unit(state, "E05", "GOOD", 5);
  keeper.current.hp = 1;
  bot.current.hp = 2;
  state = next(
    runRoot(state, (draft, root) => {
      runHookOnDraft(draft, root, "BEFORE_COMBAT_HERE", [
        draft.board[0]!.good!,
      ]);
      runHookOnDraft(draft, root, "BEFORE_COMBAT_HERE", [
        draft.board[0]!.good!,
      ]);
      for (let i = 0; i < 2; i++)
        scheduledDamageOnDraft(draft, root, [
          {
            source: null,
            target: { kind: "UNIT", instanceId: ram.instanceId },
            rawDamage: 2,
            damageType: "EFFECT",
          },
        ]);
      runHookOnDraft(draft, root, "ON_TURN_END", [
        draft.board[3]!.good!,
        draft.board[4]!.good!,
      ]);
    }),
  );
  expect(state.board[0]!.good!.current.attack).toBe(3);
  expect(state.board[1]!.good!.current.attack).toBe(4);
  expect(state.board[1]!.good!.current.hp).toBe(2);
  expect(state.board[3]!.good!.current.hp).toBe(2);
  expect(state.board[4]!.good!.current.hp).toBe(3);
  expireModifiersOnDraft(state, []);
  expect(state.board[2]!.good!.statuses.pierce).toBe(true);
  expect(state.board[0]!.good!.current.attack).toBe(2);
  expect(state.board[2]!.good!.instanceId).toBe(bird.instanceId);
});
it.each(elementsCatalog.presets)(
  "$heroId initializes both sides and grants exactly its four powers",
  (preset) => {
    const config = matchConfig();
    config.versions.content = "elements_v1";
    for (const side of ["GOOD", "EVIL"] as const)
      config.decks[side] = deck(
        elementsCatalog.presets.find(
          (p) =>
            elementsCatalog.heroes.find((h) => h.id === p.heroId)!.faction ===
            side,
        )!,
      );
    const hero = elementsCatalog.heroes.find((h) => h.id === preset.heroId)!;
    config.decks[hero.faction] = deck(preset);
    let state = createMatch(config, createRandomStreams(seed));
    for (const side of ["GOOD", "EVIL"] as const)
      state = next(applyMulligan(state, side, []));
    for (let i = 0; i < 3; i++)
      grantPowerOnDraft(state, [], hero.faction, "BLOCK");
    expect([...state.players[hero.faction].receivedPowerIds].sort()).toEqual(
      [...hero.powerIds].sort(),
    );
  },
);
it("rejects a third-system deck at initialization", () => {
  const config = matchConfig();
  config.versions.content = "elements_v1";
  config.decks.EVIL = deck(
    elementsCatalog.presets.find((p) => p.heroId === "H_E_FX")!,
  );
  config.decks.GOOD = deck(elementsCatalog.presets[0]!);
  config.decks.GOOD.entries[0]!.cardId = "P04";
  expect(() => createMatch(config, createRandomStreams(seed))).toThrow(
    "Invalid GOOD deck",
  );
});

it.each(["GOOD", "EVIL"] as const)(
  "%s may use a neutral-origin power during a free block response",
  (side) => {
    const hero = elementsCatalog.heroes.find(
      (h) => h.faction === side && h.powerIds.includes("P_GROVE1"),
    )!;
    const state = ready(side);
    state.players[side].heroId = hero.id;
    state.phase = "COMBAT";
    state.activeSide = null;
    state.players[side].energy.current = 0;
    const id = "b".repeat(32);
    state.players[side].reserve = [
      { instanceId: id, definitionId: "P_GROVE1", normalCost: 1 },
    ];
    state.blockResponse = { side, powerInstanceId: id, laneId: 1 };
    state.continuation = {
      laneId: 1,
      stage: "BLOCK_RESPONSES",
      pendingResponders: [{ side, powerInstanceId: id }],
    };
    const action: PlayerAction = {
      kind: "USE_BLOCK_POWER",
      powerInstanceId: id,
      target: { kind: "NONE" },
    };
    expect(getLegalActions(state, side)).toContainEqual(action);
    const after = next(applyAction(state, { actor: side, action }));
    expect(after.players[side].hp).toBe(13);
    expect(after.players[side].energy.current).toBe(0);
    expect(after.blockResponse).toBeNull();
  },
);
