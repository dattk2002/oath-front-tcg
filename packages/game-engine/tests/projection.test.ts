import { it, expect } from "vitest";
import { validateWire } from "@oathfront/contracts";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
import { ready, unit } from "./helpers.js";
import * as engine from "../src/index.js";
it("AC22 whitelists the exact canonical view and hides opponent zones and hidden assignments", () => {
  const s = ready();
  unit(s, "GC01", "GOOD", 1);
  s.board[4]!.location = {
    state: "HIDDEN",
    definitionId: "ancient_forest",
    revealTurn: 5,
  };
  const b = structuredClone(s);
  b.random.identityKey = "SECRET";
  b.players.EVIL.hand.reverse();
  b.players.EVIL.deck.reverse();
  b.board[4]!.location = {
    state: "HIDDEN",
    definitionId: "desert",
    revealTurn: 5,
  };
  const a = engine.projectPlayerView(s, "GOOD");
  expect(a).toEqual(engine.projectPlayerView(b, "GOOD"));
  expect(validateWire("PlayerView", a)).toBe(true);
  expect(JSON.stringify(a)).not.toContain("creationSeq");
  expect(JSON.stringify(a)).not.toContain(s.random.identityKey);
  a.self.hand.length = 0;
  expect(s.players.GOOD.hand).toHaveLength(4);
});
it("response identity is owner-only and projected events preserve sequence gaps without aliases", () => {
  const s = ready();
  const id = "b".repeat(32);
  s.blockResponse = { side: "EVIL", laneId: 1, powerInstanceId: id };
  s.phase = "COMBAT";
  s.players.EVIL.reserve = [
    { instanceId: id, definitionId: "P_F1", normalCost: 1 },
  ];
  const v = engine.projectPlayerView(s, "GOOD");
  expect(v.blockResponse).toEqual({
    visibility: "OPPONENT",
    side: "EVIL",
    laneId: 1,
  });
  expect(JSON.stringify(v)).not.toContain(id);
  const event = {
    eventId: s.matchId + ":7",
    sequence: 7,
    rootId: s.matchId + ":2",
    kind: "PowerGranted" as const,
    visibility: "OWNER" as const,
    ownerSide: "EVIL" as const,
    payload: {
      side: "EVIL" as const,
      power: s.players.EVIL.reserve[0]!,
      reason: "INITIAL" as const,
    },
  };
  expect(engine.projectEvents([event], "GOOD")).toEqual([]);
  const own = engine.projectEvents([event], "EVIL");
  expect(own[0]!.sequence).toBe(7);
  own[0]!.eventId = "mutated";
  expect(event.eventId).toBe(s.matchId + ":7");
});
it("projects responder as activeSide while keeping automatic checkpoints null", () => {
  const s = ready();
  s.phase = "COMBAT";
  s.activeSide = null;
  s.blockResponse = {
    side: "EVIL",
    laneId: 1,
    powerInstanceId: "a".repeat(32),
  };
  expect(engine.projectPlayerView(s, "GOOD").activeSide).toBe("EVIL");
  s.blockResponse = null;
  expect(engine.projectPlayerView(s, "GOOD").activeSide).toBeNull();
});
it("drops even otherwise public events carrying unexpected private extensions", () => {
  const s = ready();
  const event: engine.GameEvent = {
    eventId: s.matchId + ":1",
    rootId: s.matchId + ":1",
    sequence: 1,
    kind: "HandCountChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { side: "GOOD", handCount: 4, deckCount: 26 },
  };
  Object.assign(event.payload, { identityKey: "PRIVATE" });
  expect(engine.projectEvents([event], "GOOD")).toEqual([]);
});
it("shows human mulligan ownership until confirmation, then no human decision while setup waits for bot", () => {
  const s = engine.createMatch(matchConfig(), engine.createRandomStreams(seed));
  expect(engine.projectPlayerView(s, "GOOD").activeSide).toBe(s.humanSide);
  const r = engine.applyMulligan(s, s.humanSide, []);
  if (r.kind !== "transition") throw Error(r.code);
  expect(engine.projectPlayerView(r.nextState, "GOOD").activeSide).toBeNull();
});
