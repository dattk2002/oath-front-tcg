import { it, expect } from "vitest";
import type { VisibleEvent } from "@oathfront/contracts";
import { recoverMatch } from "../src/features/match/recovery.js";
import { createMatchViewStore } from "../src/features/match/view-store.js";
import { response } from "./fixtures.js";
import { ApiError } from "../src/features/match/api-error.js";
const event = (sequence: number): VisibleEvent => ({
  eventId: `match:${sequence}`,
  rootId: "match:1",
  sequence,
  kind: "PhaseChanged",
  visibility: "PUBLIC",
  ownerSide: null,
  payload: { from: "EVIL_DEPLOY", to: "GOOD_PLAY", turn: 1 },
});
it("snapshot boundary does not imply scanned history; empty private pages still progress and duplicate IDs merge", async () => {
  const snapshot = response(5);
  snapshot.latestSeq = 205;
  snapshot.eventsThroughSeq = 205;
  const calls: number[][] = [];
  const recovered = await recoverMatch("match", 0, {
    match: async () => snapshot,
    events: async (_id, after, through) => {
      calls.push([after, through]);
      return {
        events: after === 100 ? [] : [event(1), event(after + 1)],
        nextCursor: Math.min(after + 100, 205),
        scannedThroughSeq: Math.min(after + 100, 205),
        hasMore: after < 200,
      };
    },
  });
  expect(calls).toEqual([
    [0, 205],
    [100, 205],
    [200, 205],
  ]);
  expect(recovered.logEvents.map((e) => e.sequence)).toEqual([1, 201]);
  expect(recovered.logCursor).toBe(205);
  expect(recovered.logExpired).toBe(false);
});
it("expired log preserves authoritative snapshot and explicitly labels expiration", async () => {
  const recovered = await recoverMatch("match", 0, {
    match: async () => response(7),
    events: async () => {
      throw Error("should not scan zero boundary");
    },
  });
  expect(recovered.logCursor).toBe(0);
  const snapshot = response(8);
  snapshot.latestSeq = 2;
  const expired = await recoverMatch("match", 0, {
    match: async () => snapshot,
    events: async () => {
      throw new ApiError(410, {
        error: {
          code: "LOG_EXPIRED",
          messageKey: "expired",
          requestId: "id",
          retryable: false,
          details: { earliestAvailableSeq: 2 },
        },
      });
    },
  });
  expect(expired.response.revision).toBe(8);
  expect(expired.logExpired).toBe(true);
});
it("late history enriches log without replacing newer authoritative state or replaying presentation", () => {
  const initial = response(8);
  initial.latestSeq = 20;
  const store = createMatchViewStore(initial);
  store.setPresentationCursor(20);
  const old = response(7);
  old.latestSeq = 15;
  old.events = [event(1)];
  store.acceptResponse(old);
  store.mergeLog([event(1), event(2)], 15, false);
  expect(store.getSnapshot().revision).toBe(8);
  expect(store.getSnapshot().latestSeq).toBe(20);
  expect(store.getSnapshot().presentationCursor).toBe(20);
  expect(store.getSnapshot().logCursor).toBe(15);
  expect(store.getSnapshot().events).toHaveLength(2);
  const equal = response(8);
  equal.latestSeq = 10;
  store.acceptResponse(equal);
  expect(store.getSnapshot().latestSeq).toBe(20);
});
it("a malformed non-progressing event cursor fails closed rather than looping or marking log read", async () => {
  const snapshot = response(1);
  snapshot.latestSeq = 3;
  await expect(
    recoverMatch("match", 0, {
      match: async () => snapshot,
      events: async () => ({
        events: [],
        nextCursor: 0,
        scannedThroughSeq: 0,
        hasMore: true,
      }),
    }),
  ).rejects.toThrow("INVALID_LOG_CURSOR");
});
it("log expiration labels the lost prefix but still recovers retained events through the fixed snapshot boundary", async () => {
  const snapshot = response(4);
  snapshot.latestSeq = 5;
  const cursors: number[] = [];
  const recovered = await recoverMatch("match", 0, {
    match: async () => snapshot,
    events: async (_id, after) => {
      cursors.push(after);
      if (after === 0)
        throw new ApiError(410, {
          error: {
            code: "LOG_EXPIRED",
            messageKey: "expired",
            requestId: "10000000-0000-4000-8000-000000000001",
            retryable: false,
            details: { earliestAvailableSeq: 3 },
          },
        });
      return {
        events: [event(3), event(4), event(5)],
        nextCursor: 5,
        scannedThroughSeq: 5,
        hasMore: false,
      };
    },
  });
  expect(cursors).toEqual([0, 2]);
  expect(recovered.logExpired).toBe(true);
  expect(recovered.logEvents.map((event) => event.sequence)).toEqual([3, 4, 5]);
  expect(recovered.logCursor).toBe(5);
});
