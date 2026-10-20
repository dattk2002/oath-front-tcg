import type { CommandResponse } from "@oathfront/contracts";
export function response(revision = 1): CommandResponse {
  const hero = {
    heroId: "H_G_BV" as const,
    hp: 20,
    maxHp: 20 as const,
    energy: { current: 1, max: 1 },
    block: { charge: 0 as const, used: 0, active: true },
    handCount: 1,
    deckCount: 26,
    reserveCount: 0,
    discard: [],
    usedPowers: [],
    fatigueCounter: 0,
  };
  return {
    revision,
    latestSeq: 0,
    events: [],
    eventsThroughSeq: 0,
    needsAdvance: false,
    view: {
      schemaVersion: "api_v1",
      matchId: "10000000-0000-4000-8000-000000000001",
      mode: "SKIRMISH",
      lifecycle: "ACTIVE",
      humanSide: "GOOD",
      turn: 1,
      phase: "GOOD_PLAY",
      activeSide: "GOOD",
      versions: {
        rules: "rules_v1",
        content: "core_v1",
        locations: "locations_v1",
        bot: "bot_v1",
      },
      players: { GOOD: hero, EVIL: { ...hero, heroId: "H_E_FX" } },
      board: [1, 2, 3, 4, 5].map((laneId) => ({
        laneId,
        location: { state: "NORMAL" as const },
        good: null,
        evil: null,
      })) as CommandResponse["view"]["board"],
      self: {
        side: "GOOD",
        hand: [{ instanceId: "card0001", definitionId: "GC01" }],
        reserve: [],
        mulliganCommitted: true,
      },
      legalActions: [
        { kind: "PLAY_UNIT", cardInstanceId: "card0001", laneId: 1 },
        { kind: "PASS_PHASE" },
      ],
      blockResponse: null,
      combat: null,
      outcome: null,
      tutorial: null,
    },
  };
}
