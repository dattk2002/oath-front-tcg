import { it, expect } from "vitest";
import type { CommandEnvelope, CommandResponse } from "@oathfront/contracts";
import { createMatchViewStore } from "../src/features/match/view-store.js";
import { createIntentController } from "../src/features/match/intent-controller.js";
import { ApiError } from "../src/features/match/api-error.js";
import { response } from "./fixtures.js";
const commandId = "20000000-0000-4000-8000-000000000001";
it("uncertain request retains exact command ID and revision on explicit retry without optimistic gameplay", async () => {
  const store = createMatchViewStore(response(1));
  const sent: CommandEnvelope[] = [];
  const controller = createIntentController(store, {
    makeId: () => commandId,
    send: async (envelope) => {
      sent.push(structuredClone(envelope));
      if (sent.length === 1) throw new TypeError("connection lost");
      return response(2);
    },
  });
  await controller.submitIntent({ kind: "PASS_PHASE" });
  expect(store.getSnapshot().pendingCommand?.status).toBe("UNCERTAIN");
  expect(store.getSnapshot().revision).toBe(1);
  await controller.retryPending();
  expect(sent).toEqual([
    { commandId, expectedRevision: 1, action: { kind: "PASS_PHASE" } },
    { commandId, expectedRevision: 1, action: { kind: "PASS_PHASE" } },
  ]);
  expect(store.getSnapshot().revision).toBe(2);
  expect(store.getSnapshot().pendingCommand).toBeNull();
});
it("canonical deadline 503 remains uncertain and cannot be replaced by a new intent", async () => {
  const store = createMatchViewStore(response());
  const sent: CommandEnvelope[] = [];
  const controller = createIntentController(store, {
    makeId: () => commandId,
    send: async (envelope) => {
      sent.push(envelope);
      throw new ApiError(503, {
        error: {
          code: "TEMPORARILY_UNAVAILABLE",
          messageKey: "unavailable",
          requestId: commandId,
          retryable: true,
          details: {},
        },
      });
    },
  });
  await controller.submitIntent({ kind: "PASS_PHASE" });
  await controller.submitIntent({ kind: "PASS_PHASE" });
  expect(sent).toHaveLength(1);
  expect(store.getSnapshot().pendingCommand?.envelope.commandId).toBe(
    commandId,
  );
});
it("stale409 accepts newer snapshot, clears selection and never automatically reapplies", async () => {
  const store = createMatchViewStore(response());
  let sends = 0;
  const controller = createIntentController(store, {
    makeId: () => commandId,
    send: async () => {
      sends++;
      throw new ApiError(409, {
        error: {
          code: "STALE_REVISION",
          messageKey: "stale",
          requestId: commandId,
          retryable: false,
          details: { snapshot: response(9) },
        },
      });
    },
  });
  controller.selectCard("card0001");
  await controller.selectTarget({ kind: "LANE", laneId: 1 });
  expect(store.getSnapshot().revision).toBe(9);
  expect(store.getSnapshot().selection).toBeNull();
  expect(store.getSnapshot().pendingCommand).toBeNull();
  expect(sends).toBe(1);
});
it("invalid target and hypothetical identity cannot send a request", async () => {
  const store = createMatchViewStore(response());
  let sends = 0;
  const controller = createIntentController(store, {
    makeId: () => commandId,
    send: async () => {
      sends++;
      return response(2);
    },
  });
  controller.selectCard("card0001");
  await controller.selectTarget({ kind: "LANE", laneId: 5 });
  controller.selectCard("preview:summon:1");
  await controller.selectTarget({ kind: "LANE", laneId: 1 });
  expect(sends).toBe(0);
  expect(store.getSnapshot().revision).toBe(1);
});
it("all card inputs resolve the same legal intent and wait for the authoritative response", async () => {
  const store = createMatchViewStore(response());
  let finish!: (value: CommandResponse) => void;
  const sent: CommandEnvelope[] = [];
  const controller = createIntentController(store, {
    makeId: () => commandId,
    send: (envelope) => {
      sent.push(envelope);
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  controller.selectCard("card0001");
  const request = controller.selectTarget({ kind: "LANE", laneId: 1 });
  await controller.submitIntent({ kind: "PASS_PHASE" });
  expect(sent).toEqual([
    {
      commandId,
      expectedRevision: 1,
      action: { kind: "PLAY_UNIT", cardInstanceId: "card0001", laneId: 1 },
    },
  ]);
  expect(store.getSnapshot().authoritativeView.self.hand).toHaveLength(1);
  expect(store.getSnapshot().authoritativeView.board[0].good).toBeNull();
  finish(response(2));
  await request;
  expect(store.getSnapshot().selection).toBeNull();
});
it("multi-step unit-and-lane targeting submits only after both legal choices", async () => {
  const initial = response();
  initial.view.self.reserve = [
    { instanceId: "power001", definitionId: "P_P1", normalCost: 1 },
  ];
  initial.view.legalActions = [
    {
      kind: "USE_POWER",
      powerInstanceId: "power001",
      target: { kind: "UNIT_AND_LANE", instanceId: "unit0001", laneId: 2 },
    },
  ];
  const store = createMatchViewStore(initial);
  const sent: CommandEnvelope[] = [];
  const controller = createIntentController(store, {
    makeId: () => commandId,
    send: async (envelope) => {
      sent.push(envelope);
      return response(2);
    },
  });
  controller.selectCard("power001");
  await controller.selectTarget({ kind: "UNIT", instanceId: "unit0001" });
  expect(sent).toHaveLength(0);
  await controller.selectTarget({ kind: "LANE", laneId: 2 });
  expect(sent[0]?.action).toEqual({
    kind: "USE_POWER",
    powerInstanceId: "power001",
    target: { kind: "UNIT_AND_LANE", instanceId: "unit0001", laneId: 2 },
  });
});
it("semantic intent equality ignores JSON property order without allowing different targets", async () => {
  const initial = response();
  initial.view.legalActions = [
    {
      kind: "PLAY_TRICK",
      cardInstanceId: "card0001",
      target: { kind: "HERO", side: "EVIL" },
    },
  ];
  const store = createMatchViewStore(initial);
  const sent: CommandEnvelope[] = [];
  const controller = createIntentController(store, {
    makeId: () => commandId,
    send: async (envelope) => {
      sent.push(envelope);
      return response(2);
    },
  });
  await controller.submitIntent({
    target: { side: "EVIL", kind: "HERO" },
    cardInstanceId: "card0001",
    kind: "PLAY_TRICK",
  });
  expect(sent).toHaveLength(1);
});
it("throwing persistence still sends and retains the exact uncertain envelope in memory", async () => {
  const store = createMatchViewStore(response());
  const sent: CommandEnvelope[] = [];
  const controller = createIntentController(store, {
    makeId: () => commandId,
    persistPending: () => {
      throw Error("storage denied");
    },
    send: async (envelope) => {
      sent.push(structuredClone(envelope));
      if (sent.length === 1) throw Error("offline");
      return response(2);
    },
  });
  await controller.submitIntent({ kind: "PASS_PHASE" });
  expect(store.getSnapshot().pendingCommand?.status).toBe("UNCERTAIN");
  expect(store.getSnapshot().message).toContain("tải lại");
  await controller.retryPending();
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
  expect(store.getSnapshot().pendingCommand).toBeNull();
});
it("truncated command events fast-forward presentation to accepted state while the log cursor stays unread", async () => {
  const store = createMatchViewStore(response());
  let checkpoints = 0;
  const next = response(2);
  next.latestSeq = 205;
  next.eventsThroughSeq = 100;
  const controller = createIntentController(store, {
    makeId: () => commandId,
    send: async () => next,
    fastForward: () => {
      checkpoints++;
    },
  });
  await controller.submitIntent({ kind: "PASS_PHASE" });
  expect(checkpoints).toBe(1);
  expect(store.getSnapshot().presentationCursor).toBe(205);
  expect(store.getSnapshot().logCursor).toBe(0);
});
