import { describe, it, expect } from "vitest";
import { applyAction, getLegalActions } from "../src/actions.js";
import { refillEnergyOnDraft } from "../src/phases.js";
import { coreCatalog } from "@oathfront/game-content";
import { ready, card, next, unit } from "./helpers.js";
import type { GameEvent, PlayerId } from "../src/model.js";

describe("R04/R07 phase permission and immutable action boundary", () => {
  it.each(["EVIL_DEPLOY", "GOOD_PLAY", "EVIL_TRICKS"] as const)(
    "%s validates every catalog definition against its type and faction",
    (phase) => {
      for (const def of coreCatalog.cards) {
        const state = ready();
        state.phase = phase;
        state.activeSide = phase === "GOOD_PLAY" ? "GOOD" : "EVIL";
        const actor = def.faction;
        const id = card(state, def.id, actor);
        const legal = getLegalActions(state, actor).some(
          (a) => "cardInstanceId" in a && a.cardInstanceId === id,
        );
        const permits =
          actor === state.activeSide &&
          (def.type === "UNIT"
            ? phase !== "EVIL_TRICKS"
            : phase !== "EVIL_DEPLOY");
        // Required targets are supplied to expose phase permission independently of board availability.
        unit(state, "GC02", actor, 2);
        unit(state, "EC02", actor === "GOOD" ? "EVIL" : "GOOD", 2);
        const withBoard = getLegalActions(state, actor).some(
          (a) => "cardInstanceId" in a && a.cardInstanceId === id,
        );
        expect(withBoard, def.id).toBe(permits);
        if (def.targeting.kind === "NONE") expect(legal, def.id).toBe(permits);
      }
    },
  );
  it("rejects foreign actor, unavailable card, occupied lane and underfunded play without mutation", () => {
    const state = ready();
    const id = card(state, "EC02", "EVIL");
    unit(state, "EC01", "EVIL", 2);
    const before = structuredClone(state);
    for (const [actor, action, code] of [
      [
        "GOOD",
        { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 1 },
        "NOT_YOUR_TURN",
      ],
      [
        "EVIL",
        { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 2 },
        "LANE_OCCUPIED",
      ],
      [
        "EVIL",
        { kind: "PLAY_UNIT", cardInstanceId: "f".repeat(32), laneId: 1 },
        "CARD_UNAVAILABLE",
      ],
    ] as const)
      expect(applyAction(state, { actor, action })).toMatchObject({
        kind: "error",
        code,
      });
    expect(state).toEqual(before);
    state.players.EVIL.energy.current = 1;
    expect(
      applyAction(state, {
        actor: "EVIL",
        action: { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 1 },
      }),
    ).toMatchObject({ code: "INSUFFICIENT_ENERGY" });
  });
  it("preserves EVIL energy across GOOD_PLAY and EVIL_TRICKS", () => {
    const state = ready();
    state.players.EVIL.energy.current = 7;
    const good = next(
      applyAction(state, { actor: "EVIL", action: { kind: "PASS_PHASE" } }),
    );
    const evil = next(
      applyAction(good, { actor: "GOOD", action: { kind: "PASS_PHASE" } }),
    );
    expect(evil.phase).toBe("EVIL_TRICKS");
    expect(evil.players.EVIL.energy.current).toBe(7);
    expect(state.phase).toBe("EVIL_DEPLOY");
  });
  it.each([
    [1, 1],
    [10, 10],
    [11, 10],
  ])("turn %i refills both pools to %i", (turn, amount) => {
    const state = ready();
    state.turn = turn;
    state.players.EVIL.energy.current = 3;
    const events: GameEvent[] = [];
    refillEnergyOnDraft(state, events);
    for (const side of ["GOOD", "EVIL"] as PlayerId[])
      expect(state.players[side].energy).toEqual({
        current: amount,
        max: amount,
      });
  });
  it("uses only active Desert surcharge for played UNIT", () => {
    const state = ready();
    state.board[0]!.location = {
      state: "ACTIVE",
      definitionId: "desert",
      revealTurn: 1,
    };
    state.board[2]!.location = {
      state: "HIDDEN",
      definitionId: "desert",
      revealTurn: 3,
    };
    const id = card(state, "EC01", "EVIL");
    state.players.EVIL.energy.current = 1;
    expect(getLegalActions(state, "EVIL")).not.toContainEqual({
      kind: "PLAY_UNIT",
      cardInstanceId: id,
      laneId: 1,
    });
    const after = next(
      applyAction(state, {
        actor: "EVIL",
        action: { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 3 },
      }),
    );
    expect(after.players.EVIL.energy.current).toBe(0);
  });
  it.each(["ancient_forest", "frozen_lake"] as const)(
    "applies %s only to units played after reveal",
    (location) => {
      const state = ready();
      state.board[0]!.location = {
        state: "ACTIVE",
        definitionId: location,
        revealTurn: 1,
      };
      const id = card(state, "EC02", "EVIL");
      const after = next(
        applyAction(state, {
          actor: "EVIL",
          action: { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 1 },
        }),
      );
      expect(after.board[0]!.evil!.current.maxHp).toBe(
        location === "ancient_forest" ? 4 : 3,
      );
      expect(after.board[0]!.evil!.statuses.exhausted).toBe(
        location === "frozen_lake",
      );
    },
  );
});

it("does not charge Desert surcharge for token tricks or held powers", () => {
  const state = ready();
  state.phase = "GOOD_PLAY";
  state.activeSide = "GOOD";
  state.players.GOOD.energy.current = 1;
  state.board[0]!.location = {
    state: "ACTIVE",
    definitionId: "desert",
    revealTurn: 1,
  };
  const id = card(state, "V08", "GOOD");
  const summoned = next(
    applyAction(state, {
      actor: "GOOD",
      action: {
        kind: "PLAY_TRICK",
        cardInstanceId: id,
        target: { kind: "LANE", laneId: 1 },
      },
    }),
  );
  expect(summoned.players.GOOD.energy.current).toBe(0);
  expect(summoned.board[0]!.good!.current.maxHp).toBe(1);
  summoned.players.GOOD.energy.current = 1;
  summoned.players.GOOD.reserve = [
    { instanceId: "c".repeat(32), definitionId: "P_B1", normalCost: 1 },
  ];
  const after = next(
    applyAction(summoned, {
      actor: "GOOD",
      action: {
        kind: "USE_POWER",
        powerInstanceId: "c".repeat(32),
        target: {
          kind: "UNIT",
          instanceId: summoned.board[0]!.good!.instanceId,
        },
      },
    }),
  );
  expect(after.players.GOOD.energy.current).toBe(0);
});
it("held powers are available only at their own faction action phase", () => {
  for (const power of coreCatalog.powers)
    for (const phase of ["EVIL_DEPLOY", "GOOD_PLAY", "EVIL_TRICKS"] as const) {
      const state = ready(),
        actor = power.faction;
      state.phase = phase;
      state.activeSide = phase === "GOOD_PLAY" ? "GOOD" : "EVIL";
      state.players[actor].reserve = [
        { instanceId: "c".repeat(32), definitionId: power.id, normalCost: 1 },
      ];
      unit(state, "GC02", actor, 2);
      unit(state, "EC02", actor === "GOOD" ? "EVIL" : "GOOD", 3);
      expect(
        getLegalActions(state, actor).some(
          (a) => a.kind === "USE_POWER" && a.powerInstanceId === "c".repeat(32),
        ),
        `${power.id}:${phase}`,
      ).toBe(phase === power.validPhase);
    }
});
it("legal actions reveal neither hidden Location assignment nor opponent deck order", () => {
  const state = ready();
  state.board[0]!.location = {
    state: "HIDDEN",
    definitionId: "desert",
    revealTurn: 1,
  };
  card(state, "EC01", "EVIL");
  const alternate = structuredClone(state);
  alternate.board[0]!.location = {
    state: "HIDDEN",
    definitionId: "frozen_lake",
    revealTurn: 1,
  };
  alternate.players.GOOD.deck.reverse();
  expect(getLegalActions(state, "EVIL")).toEqual(
    getLegalActions(alternate, "EVIL"),
  );
});
it("wire actor injection is rejected without trusting a field inside PlayerAction", () => {
  const state = ready(),
    id = card(state, "EC01", "EVIL");
  const action = {
    kind: "PLAY_UNIT" as const,
    cardInstanceId: id,
    laneId: 1,
    actor: "EVIL",
  };
  const before = structuredClone(state);
  expect(applyAction(state, { actor: "GOOD", action })).toMatchObject({
    kind: "error",
  });
  expect(state).toEqual(before);
});

it("root overflow rolls back card, cost, discard and prior events before faulting", () => {
  const state = ready();
  state.phase = "GOOD_PLAY";
  state.activeSide = "GOOD";
  const target = unit(state, "GC02", "GOOD", 2);
  target.printed.attack = Number.MAX_SAFE_INTEGER;
  target.current.attack = Number.MAX_SAFE_INTEGER;
  const id = card(state, "V06", "GOOD"),
    before = structuredClone(state);
  const result = applyAction(state, {
    actor: "GOOD",
    action: {
      kind: "PLAY_TRICK",
      cardInstanceId: id,
      target: { kind: "UNIT", instanceId: target.instanceId },
    },
  });
  if (result.kind !== "transition") throw new Error(result.code);
  expect(result.nextState.lifecycle).toBe("FAULTED");
  expect(result.nextState.players).toEqual(before.players);
  expect(result.nextState.board).toEqual(before.board);
  expect(result.nextState.random).toEqual(before.random);
  expect(result.events.map((e) => e.kind)).toEqual(["LifecycleChanged"]);
  expect(state).toEqual(before);
});
it("full-health required heal target remains legal and heals zero", () => {
  const state = ready();
  state.phase = "GOOD_PLAY";
  state.activeSide = "GOOD";
  const target = unit(state, "GC02", "GOOD", 2);
  state.players.GOOD.reserve = [
    { instanceId: "c".repeat(32), definitionId: "P_B2", normalCost: 1 },
  ];
  const result = applyAction(state, {
    actor: "GOOD",
    action: {
      kind: "USE_POWER",
      powerInstanceId: "c".repeat(32),
      target: { kind: "UNIT", instanceId: target.instanceId },
    },
  });
  if (result.kind !== "transition") throw new Error(result.code);
  expect(result.nextState.board[1]!.good!.current).toEqual(target.current);
  expect(result.nextState.players.GOOD.hand).toHaveLength(
    state.players.GOOD.hand.length + 1,
  );
});
