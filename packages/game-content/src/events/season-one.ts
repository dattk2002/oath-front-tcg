/** Server-only authored content: kept out of the public catalog and browser preview bundle. */
import { createHash } from "node:crypto";
import type {
  CardId,
  DeckInput,
  HeroId,
  LocationId,
  Side,
  SystemId,
} from "@oathfront/contracts";
import { elementsCatalog } from "../elements-v1.js";
import { heroSystems } from "../systems.js";
const dayMs = 86400000;
export const seasonStart = "2026-10-26T00:00:00.000Z";
export const seasonId = "first-light-long-shadows";
export const eventRewards = {
  dailyWin: 100,
  threeDays: 200,
  fiveDays: 300,
  firstCopy: 1200,
  secondCopy: 2400,
  pveBase: 50,
  pveSystemBonus: 50,
  pveDailyCap: 200,
  lossCooldownMs: 3600000,
  completionGraceMs: 86400000,
} as const;
export type ArenaKey =
  | "moonroot-conservatory"
  | "cinder-foundry"
  | "glasswater-sanctum"
  | "astral-causeway";
export interface AuthoredEvent {
  id: string;
  seasonId: string;
  ordinal: number;
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  revealAt: string;
  featuredCardId: CardId;
  featuredHeroId: HeroId;
  systems: [SystemId, SystemId];
  rewards: typeof eventRewards;
  revision: number;
  state: "PUBLISHED" | "DRAFT";
  sha256: string;
}
export interface ScenarioManifest {
  version: "daily_v1";
  id: string;
  eventId: string;
  dayIndex: number;
  contentVersion: "elements_v1";
  humanSide: Side;
  difficulty: "NORMAL";
  seedHex: string;
  arenaKey: ArenaKey;
  decks: Record<Side, DeckInput>;
  turn: number;
  phase: "GOOD_PLAY" | "EVIL_DEPLOY" | "EVIL_TRICKS";
  heroHp: Record<Side, number>;
  energy: Record<Side, number>;
  hand: Record<Side, CardId[]>;
  board: {
    owner: Side;
    cardId: CardId;
    laneId: 1 | 2 | 3 | 4 | 5;
    hp: number | null;
  }[];
  locations: { laneId: 1 | 3 | 5; id: LocationId }[];
}
export interface AuthoredScenario {
  id: string;
  eventId: string;
  dayIndex: number;
  title: string;
  description: string;
  arenaKey: ArenaKey;
  contentVersion: "elements_v1";
  manifest: ScenarioManifest;
  sha256: string;
}
// Same canonical ordering as the engine, without importing engine code into the content package.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
      .join(",")}}`;
  return JSON.stringify(value);
}
export const contentHash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
const featured: HeroId[] = [
  "H_G_BV",
  "H_G_ROW",
  "H_G_VP",
  "H_E_FS",
  "H_G_BP",
  "H_E_VAN",
  "H_E_ROO",
  "H_E_XS",
  "H_G_MOS",
  "H_E_SAB",
  "H_G_SOL",
  "H_E_NYX",
];
const arenas: ArenaKey[] = [
  "moonroot-conservatory",
  "cinder-foundry",
  "glasswater-sanctum",
  "astral-causeway",
];
export const seasonOne: AuthoredEvent[] = featured.map((heroId, i) => {
  const card = elementsCatalog.cards.find(
    (c) => c.id === `E${String(i + 1).padStart(2, "0")}`,
  )!;
  const startsAt = new Date(
      Date.parse(seasonStart) + i * 7 * dayMs,
    ).toISOString(),
    endsAt = new Date(Date.parse(startsAt) + 7 * dayMs).toISOString();
  const event = {
    id: `season01-week${String(i + 1).padStart(2, "0")}`,
    seasonId,
    ordinal: i + 1,
    slug: `first-light-week-${String(i + 1).padStart(2, "0")}`,
    title: `${card.nameVi}: Weekly Expedition`,
    summary: `Explore ${card.classId!.toLowerCase()} tactics with ${card.nameVi}. Complete daily challenges and win PvE matches to earn this week's permanent card copies.`,
    startsAt,
    endsAt,
    revealAt: startsAt,
    featuredCardId: card.id,
    featuredHeroId: heroId,
    systems: heroSystems[heroId],
    rewards: eventRewards,
    revision: 1,
    state: "PUBLISHED" as const,
  };
  return { ...event, sha256: contentHash(event) };
});
const templates = [
  [
    "Opening Crossroads",
    "Three occupied lanes, one opening. Use the borrowed deck to cover threats and build your next attack.",
  ],
  [
    "Hold the Line",
    "Your hero is at 5 HP. Protect the exposed lanes and turn a fragile defense into a counterattack.",
  ],
  [
    "The Weekly Arrival",
    "The spotlight unit starts in your hand. Read its trigger and find the lane where it matters most.",
  ],
  [
    "The Trick Window",
    "A prepared combat is approaching. Spend your remaining energy in the correct play window before passing.",
  ],
  [
    "Ground Rules",
    "A spring, a volcano and a frozen lake change the value of each placement. Inspect the locations before committing.",
  ],
  [
    "Twofold Oath",
    "Your opening hand draws on both systems. Combine their strengths without leaving the other lanes open.",
  ],
  [
    "The Final Watch",
    "The opposing hero begins with a stronger board. Use the week's borrowed deck to break the siege.",
  ],
] as const;
function borrowed(heroId: HeroId, cardId?: CardId): DeckInput {
  const p = elementsCatalog.presets.find((p) => p.heroId === heroId)!;
  const entries = structuredClone(p.entries);
  if (cardId) {
    const card = elementsCatalog.cards.find((c) => c.id === cardId)!;
    const index = entries.findIndex(
      (e) =>
        elementsCatalog.cards.find((c) => c.id === e.cardId)!.classId ===
        card.classId,
    );
    if (index < 0) throw Error("Featured card must fit the borrowed hero");
    entries[index] = { cardId, quantity: 2 };
  }
  return { name: p.name, heroId, contentVersion: "elements_v1", entries };
}
export const seasonScenarios: AuthoredScenario[] = seasonOne.flatMap((week) =>
  templates.map(([title, description], dayIndex) => {
    const system = elementsCatalog.cards.find(
      (c) => c.id === week.featuredCardId,
    )!.classId!;
    const humanSide: Side =
        system === "UMBRAL" && dayIndex === 2
          ? "EVIL"
          : dayIndex % 2 === 0
            ? "GOOD"
            : "EVIL",
      enemy: Side = humanSide === "GOOD" ? "EVIL" : "GOOD";
    const matching = elementsCatalog.heroes.filter(
      (h) => h.faction === humanSide && h.classes.includes(system),
    );
    const heroes = matching.length
      ? matching
      : elementsCatalog.heroes.filter((h) => h.faction === humanSide);
    const hero = heroes[(week.ordinal + dayIndex - 1) % heroes.length]!;
    const opponents = elementsCatalog.heroes.filter(
      (h) =>
        h.faction === enemy && (matching.length || h.classes.includes(system)),
    );
    const opponent = opponents[(week.ordinal + dayIndex) % opponents.length]!;
    const ownDeck = borrowed(
        hero.id,
        matching.length ? week.featuredCardId : undefined,
      ),
      enemyDeck = borrowed(
        opponent.id,
        matching.length ? undefined : week.featuredCardId,
      );
    const decks =
      humanSide === "GOOD"
        ? { GOOD: ownDeck, EVIL: enemyDeck }
        : { GOOD: enemyDeck, EVIL: ownDeck };
    const id = `${week.id}-day${dayIndex + 1}`,
      arenaKey = arenas[(week.ordinal + dayIndex - 1) % 4]!;
    const turn = dayIndex === 6 ? 7 : dayIndex === 2 ? 6 : 5;
    const board: ScenarioManifest["board"] = [
      {
        owner: humanSide,
        cardId: "GC02",
        laneId: 2,
        hp: dayIndex === 1 ? 1 : null,
      },
      { owner: enemy, cardId: "EC01", laneId: 1, hp: null },
      { owner: enemy, cardId: "EC02", laneId: 3, hp: null },
    ];
    if (dayIndex === 6) {
      const heavy = enemyDeck.entries
        .map((e) => elementsCatalog.cards.find((c) => c.id === e.cardId)!)
        .filter((c) => c.type === "UNIT")
        .sort((a, b) => b.cost - a.cost || a.id.localeCompare(b.id))[0]!;
      board.push({ owner: enemy, cardId: heavy.id, laneId: 5, hp: null });
    }
    const handFor = (owner: Side): CardId[] => {
      const available = decks[owner].entries.flatMap((e) =>
        Array<CardId>(e.quantity).fill(e.cardId),
      );
      for (const u of board.filter((u) => u.owner === owner)) {
        const i = available.indexOf(u.cardId);
        if (i < 0) throw Error("Scenario unit not in borrowed deck");
        available.splice(i, 1);
      }
      const hand: CardId[] = [];
      const pick = (predicate: (id: CardId) => boolean) => {
        const i = available.findIndex(
          (id) => !hand.includes(id) && predicate(id),
        );
        if (i >= 0) {
          hand.push(available[i]!);
          available.splice(i, 1);
        }
      };
      if (owner === humanSide && [2, 5, 6].includes(dayIndex))
        pick((id) => id === week.featuredCardId);
      if (owner === humanSide && dayIndex === 3) {
        pick(
          (id) =>
            elementsCatalog.cards.find((c) => c.id === id)!.type === "TRICK",
        );
        pick(
          (id) =>
            elementsCatalog.cards.find((c) => c.id === id)!.type === "TRICK",
        );
      }
      if (owner === humanSide && dayIndex === 5)
        for (const cls of hero.classes)
          pick(
            (id) =>
              elementsCatalog.cards.find((c) => c.id === id)!.classId === cls,
          );
      const sorted = [...available].sort(
        (a, b) =>
          elementsCatalog.cards.find((c) => c.id === a)!.cost -
            elementsCatalog.cards.find((c) => c.id === b)!.cost ||
          a.localeCompare(b),
      );
      for (const id of sorted) {
        if (hand.length === 4) break;
        if (!hand.includes(id)) pick((x) => x === id);
      }
      return hand;
    };
    const manifest: ScenarioManifest = {
      version: "daily_v1",
      id,
      eventId: week.id,
      dayIndex,
      contentVersion: "elements_v1",
      humanSide,
      difficulty: "NORMAL",
      seedHex: createHash("sha256")
        .update(`oathfront-daily-v1:${id}`)
        .digest("hex"),
      arenaKey,
      decks,
      turn,
      phase:
        humanSide === "GOOD"
          ? "GOOD_PLAY"
          : dayIndex === 3
            ? "EVIL_TRICKS"
            : "EVIL_DEPLOY",
      heroHp:
        humanSide === "GOOD"
          ? { GOOD: dayIndex === 1 ? 5 : 16, EVIL: dayIndex === 6 ? 20 : 12 }
          : { GOOD: dayIndex === 6 ? 20 : 12, EVIL: dayIndex === 1 ? 5 : 16 },
      energy: { GOOD: turn, EVIL: turn },
      hand: { GOOD: handFor("GOOD"), EVIL: handFor("EVIL") },
      board,
      locations:
        dayIndex === 4
          ? [
              { laneId: 1, id: "healing_spring" },
              { laneId: 3, id: "volcano" },
              { laneId: 5, id: "frozen_lake" },
            ]
          : [],
    };
    return {
      id,
      eventId: week.id,
      dayIndex,
      title,
      description,
      arenaKey,
      contentVersion: "elements_v1",
      manifest,
      sha256: contentHash(manifest),
    };
  }),
);
export const scenarioForId = (id: string) =>
  seasonScenarios.find((s) => s.id === id);
