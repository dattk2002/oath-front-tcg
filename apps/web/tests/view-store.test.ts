import { it, expect } from "vitest";
import { createMatchViewStore } from "../src/features/match/view-store.js";
import { response } from "./fixtures.js";
it("late receipt cannot roll back a newer authoritative revision", () => {
  const store = createMatchViewStore(response(1));
  store.acceptResponse(response(9));
  store.acceptResponse(response(8));
  expect(store.getSnapshot().revision).toBe(9);
});
it("only accepted server responses change gameplay and notify subscribers", () => {
  const store = createMatchViewStore(response(1));
  let notifications = 0;
  store.subscribe(() => notifications++);
  const next = response(2);
  next.view.players.GOOD.energy.current = 0;
  store.acceptResponse(next);
  expect(
    store.getSnapshot().authoritativeView.players.GOOD.energy.current,
  ).toBe(0);
  expect(notifications).toBe(1);
});
it("late public events merge in sequence without moving presentation cursor or clearing pending identity", () => {
  const store = createMatchViewStore(response(9));
  store.setPending({
    envelope: {
      commandId: "20000000-0000-4000-8000-000000000001",
      expectedRevision: 9,
      action: { kind: "PASS_PHASE" },
    },
    status: "UNCERTAIN",
  });
  const late = response(8);
  late.events = [
    {
      eventId: "ev_0000000000000001",
      sequence: 2,
      rootId: "rt_0000000000000001",
      kind: "MulliganCommitted",
      visibility: "OWNER",
      ownerSide: "GOOD",
      payload: { side: "GOOD", replacedCount: 0 },
    },
  ];
  late.latestSeq = 3;
  store.acceptResponse(late);
  store.acceptResponse(late);
  expect(store.getSnapshot().revision).toBe(9);
  expect(store.getSnapshot().events).toHaveLength(1);
  expect(store.getSnapshot().presentationCursor).toBe(0);
  expect(store.getSnapshot().pendingCommand?.envelope.expectedRevision).toBe(9);
});
