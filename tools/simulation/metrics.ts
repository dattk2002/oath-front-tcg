import type { HeroId, Side } from "../../packages/contracts/src/index.js";

export type Counts = Record<string, number>;
export interface MatchMetrics {
  matchup: string;
  scenario: string;
  heroes: Record<Side, HeroId>;
  winner: Side | null;
  reason: string | null;
  turns: number;
  fault: string | null;
  cardUsage: Counts;
  cardDraws: Counts;
  legalCardOpportunities: Counts;
  powerUsage: Counts;
  locations: {
    id: string;
    lane: number;
    turn: number;
    preRevealUnits: number;
  }[];
  phaseActions: Counts;
  actionKinds: Counts;
  blocks: Record<Side, number>;
  blocksBeforeTurn6: number;
  unusedPowers: Record<Side, number>;
  fatigueDamage: number;
  poisonPackets: number;
  responseMoves: number;
  illegalAccepted: number;
  illegalProbes: number;
  rejectedBotActions: number;
  privateLeaks: number;
  projectionChecks: number;
}
export function increment(counts: Counts, key: string, amount = 1): void {
  counts[key] = (counts[key] ?? 0) + amount;
}
function rate(wins: number, losses: number, draws: number) {
  const sampleSize = wins + losses + draws,
    p = sampleSize ? wins / sampleSize : 0;
  const z2 = 1.96 ** 2,
    denominator = 1 + z2 / (sampleSize || 1);
  const center = (p + z2 / (2 * (sampleSize || 1))) / denominator;
  const half =
    (1.96 *
      Math.sqrt(
        (p * (1 - p) + z2 / (4 * (sampleSize || 1))) / (sampleSize || 1),
      )) /
    denominator;
  return {
    wins,
    losses,
    draws,
    sampleSize,
    winRate: p,
    wilson95: sampleSize
      ? [Math.max(0, center - half), Math.min(1, center + half)]
      : [0, 1],
  };
}
function groupRate(games: readonly MatchMetrics[], side: Side) {
  const complete = games.filter((g) => !g.fault);
  return rate(
    complete.filter((g) => g.winner === side).length,
    complete.filter((g) => g.winner !== null && g.winner !== side).length,
    complete.filter((g) => g.winner === null).length,
  );
}
export function summarize(games: readonly MatchMetrics[]) {
  const sum = (
    key:
      | "fatigueDamage"
      | "poisonPackets"
      | "responseMoves"
      | "illegalAccepted"
      | "illegalProbes"
      | "rejectedBotActions"
      | "privateLeaks"
      | "projectionChecks"
      | "blocksBeforeTurn6",
  ) => games.reduce((total, g) => total + g[key], 0);
  const merge = (
    key:
      | "cardUsage"
      | "cardDraws"
      | "legalCardOpportunities"
      | "powerUsage"
      | "phaseActions"
      | "actionKinds",
  ) => {
    const counts: Counts = {};
    for (const g of games)
      for (const [id, n] of Object.entries(g[key])) increment(counts, id, n);
    return counts;
  };
  const complete = games.filter((g) => !g.fault),
    n = complete.length;
  const hero: Record<string, ReturnType<typeof rate>> = {};
  for (const side of ["GOOD", "EVIL"] as const)
    for (const id of new Set(games.map((g) => g.heroes[side])))
      hero[id] = groupRate(
        games.filter((g) => g.heroes[side] === id),
        side,
      );
  const matchup: Record<string, ReturnType<typeof rate>> = {};
  for (const id of new Set(games.map((g) => g.matchup)))
    matchup[id] = groupRate(
      games.filter((g) => g.matchup === id),
      "GOOD",
    );
  const location: Record<
    string,
    {
      revealed: number;
      goodWins: number;
      evilWins: number;
      draws: number;
      lanes: Counts;
      preRevealUnits: number;
    }
  > = {};
  for (const g of games)
    for (const l of g.locations) {
      const row = (location[l.id] ??= {
        revealed: 0,
        goodWins: 0,
        evilWins: 0,
        draws: 0,
        lanes: {},
        preRevealUnits: 0,
      });
      row.revealed++;
      row.preRevealUnits += l.preRevealUnits;
      increment(row.lanes, String(l.lane));
      if (!g.fault) {
        if (g.winner === "GOOD") row.goodWins++;
        else if (g.winner === "EVIL") row.evilWins++;
        else row.draws++;
      }
    }
  return {
    sampleSize: games.length,
    completed: n,
    outcomes: {
      GOOD: complete.filter((g) => g.winner === "GOOD").length,
      EVIL: complete.filter((g) => g.winner === "EVIL").length,
      DRAW: complete.filter((g) => g.winner === null).length,
      FAULT: games.length - n,
    },
    faction: { GOOD: groupRate(games, "GOOD"), EVIL: groupRate(games, "EVIL") },
    hero,
    matchup,
    meanTurns: n ? complete.reduce((total, g) => total + g.turns, 0) / n : 0,
    turnLimitRate: n
      ? complete.filter((g) => g.reason === "TURN_LIMIT").length / n
      : 0,
    beforeTurn5Rate: n ? complete.filter((g) => g.turns < 5).length / n : 0,
    turns: complete.reduce<Counts>((counts, g) => {
      increment(counts, String(g.turns));
      return counts;
    }, {}),
    cardUsage: merge("cardUsage"),
    cardDraws: merge("cardDraws"),
    legalCardOpportunities: merge("legalCardOpportunities"),
    powerUsage: merge("powerUsage"),
    phaseActions: merge("phaseActions"),
    actionKinds: merge("actionKinds"),
    location,
    blockUsage: {
      matches: games.filter((g) => g.blocks.GOOD + g.blocks.EVIL > 0).length,
      GOOD: games.reduce((n, g) => n + g.blocks.GOOD, 0),
      EVIL: games.reduce((n, g) => n + g.blocks.EVIL, 0),
      allThreeBeforeTurn6: sum("blocksBeforeTurn6"),
    },
    unusedPowers: {
      GOOD: games.reduce((n, g) => n + g.unusedPowers.GOOD, 0),
      EVIL: games.reduce((n, g) => n + g.unusedPowers.EVIL, 0),
    },
    fatigueDamage: sum("fatigueDamage"),
    poisonPackets: sum("poisonPackets"),
    responseMoves: sum("responseMoves"),
    illegalAccepted: sum("illegalAccepted"),
    illegalProbes: sum("illegalProbes"),
    rejectedBotActions: sum("rejectedBotActions"),
    privateLeaks: sum("privateLeaks"),
    projectionChecks: sum("projectionChecks"),
  };
}
