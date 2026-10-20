import { canonicalJson } from "./hash.js";
import { createRandomStreams } from "./rng.js";
import type {
  CardId,
  HandCard,
  PlayerAction,
  PowerId,
  TutorialView,
} from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import { tutorialManifest } from "@oathfront/game-content/tutorial";
import type {
  GameEvent,
  MatchState,
  PlayerId,
  LaneId,
  TransitionResult,
} from "./model.js";
import { allocateInstanceId } from "./identity.js";
import { newUnit } from "./rule-math.js";
import { emitEvent, transition } from "./events.js";
import { finishMatchOnDraft } from "./terminal.js";
import { phaseActor } from "./phases.js";
type Scene = TutorialView["chapterId"];
export function initializeTutorial(state: MatchState) {
  const chapterId = state.humanSide === "GOOD" ? "A" : "E";
  state.phase = "TURN_START";
  state.activeSide = null;
  state.players.GOOD.mulliganCommitted = true;
  state.players.EVIL.mulliganCommitted = true;
  state.tutorial = {
    scenarioId: state.humanSide === "GOOD" ? "tutorial_v1" : "tutorial_evil_v1",
    chapterId,
    stepId: chapterId === "A" ? "G01" : "E01",
    stepState: "ACTIVE",
    completedStepIds: [],
    copyKey: chapterId === "A" ? "G01.ACTIVE" : "E01.ACTIVE",
    focusTargets: [],
    manifestVersion: "tutorial_v1",
    sceneLoadOrdinal: 0,
    scriptCursor: 0,
    branch: null,
    pendingScene: chapterId,
  };
}
export function tutorialView(state: MatchState): TutorialView | null {
  if (!state.tutorial) return null;
  const {
    scenarioId,
    chapterId,
    stepId,
    stepState,
    completedStepIds,
    copyKey,
    focusTargets,
  } = state.tutorial;
  return structuredClone({
    scenarioId,
    chapterId,
    stepId,
    stepState,
    completedStepIds,
    copyKey,
    focusTargets,
  });
}
export function announceTutorial(state: MatchState, events: GameEvent[]) {
  const view = tutorialView(state);
  if (view)
    emitEvent(state, events, {
      kind: "TutorialAdvanced",
      visibility: "OWNER",
      ownerSide: state.humanSide,
      payload: { tutorial: view },
    });
}
/** A scene is a labeled setup snapshot, never fabricated CardPlayed history. */
export function loadTutorialScene(state: MatchState): TransitionResult {
  const draft = structuredClone(state),
    t = draft.tutorial;
  if (!t?.pendingScene || draft.mode !== "TUTORIAL")
    throw new RangeError("No tutorial scene to load");
  const sceneId = t.pendingScene,
    scene = tutorialManifest.scenes[sceneId];
  const sceneRandom = createRandomStreams(
    Uint8Array.from(scene.sceneSeedHex.match(/../g)!, (hex) =>
      parseInt(hex, 16),
    ),
  );
  draft.random.states = sceneRandom.states;
  ++draft.rootSeq;
  ++t.sceneLoadOrdinal;
  t.pendingScene = null;
  t.chapterId = sceneId;
  t.stepId = scene.steps[0];
  t.stepState = "ACTIVE";
  t.scriptCursor = 0;
  t.branch = null;
  draft.turn = scene.turn;
  draft.phase = scene.phase;
  draft.activeSide = phaseActor(draft.phase);
  draft.turnCounters = {};
  draft.blockResponse = null;
  draft.outcome = null;
  delete draft.endTurn;
  draft.continuation =
    sceneId === "D"
      ? { laneId: 1, stage: "BEFORE_PAIR", pendingResponders: [] }
      : null;
  draft.board = ([1, 2, 3, 4, 5] as const).map((laneId) => {
    const loc = scene.locations.find((l) => l.laneId === laneId);
    return {
      laneId,
      good: null,
      evil: null,
      location: loc
        ? {
            state:
              scene.turn >= loc.revealTurn
                ? ("ACTIVE" as const)
                : ("HIDDEN" as const),
            definitionId: loc.definitionId,
            revealTurn: loc.revealTurn,
          }
        : { state: "NORMAL" as const },
    };
  });
  const handles = new Map<string, HandCard>();
  for (const side of ["GOOD", "EVIL"] as const) {
    const p = draft.players[side],
      preset = coreCatalog.presets.find(
        (p) => p.presetId === scene.deckSources[side],
      )!;
    draft.deckSnapshots[side] = {
      name: preset.name,
      heroId: preset.heroId,
      entries: structuredClone(preset.entries),
      contentVersion: preset.contentVersion,
    };
    for (const entry of preset.entries)
      for (let copy = 1; copy <= entry.quantity; copy++)
        handles.set(`${side === "GOOD" ? "G" : "E"}:${entry.cardId}:${copy}`, {
          instanceId: allocateInstanceId(draft),
          definitionId: entry.cardId,
        });
    const take = (handle: string) => {
      const c = handles.get(handle);
      if (!c) throw new RangeError(`Invalid tutorial handle ${handle}`);
      handles.delete(handle);
      return c;
    };
    p.heroId = scene.heroIds[side];
    p.hp = scene.heroHp[side];
    p.maxHp = 20;
    p.energy = { current: scene.energy[side], max: scene.turn };
    p.block = { ...scene.block[side], active: true };
    p.hand = scene.hand[side].map(take);
    p.deck = scene.deckOrder[side].map(take);
    p.discard = [];
    p.fatigueCounter = 0;
    p.mulliganCommitted = true;
    p.usedPowers = [];
    const first = scene.powerOrder[side][0];
    p.receivedPowerIds = [first];
    p.reserve = [
      {
        instanceId: allocateInstanceId(draft),
        definitionId: first,
        normalCost: 1,
      },
    ];
  }
  for (const item of scene.board) {
    const owner = item.handle.startsWith("G:") ? "GOOD" : "EVIL";
    const defId = item.handle.split(":")[1];
    const def =
      coreCatalog.cards.find((c) => c.id === defId) ??
      coreCatalog.tokens.find((c) => c.id === defId);
    if (!def) throw new RangeError("Invalid tutorial unit");
    const c = handles.get(item.handle);
    handles.delete(item.handle);
    const unit = {
      ...newUnit(
        def,
        owner,
        item.laneId,
        c?.instanceId ?? allocateInstanceId(draft),
      ),
      laneId: item.laneId,
      creationSeq: ++draft.creationSeq,
    };
    draft.board[item.laneId - 1]![owner === "GOOD" ? "good" : "evil"] = unit;
  }
  if (handles.size) throw new RangeError("Tutorial has unallocated deck cards");
  refreshTutorial(draft);
  const events: GameEvent[] = [];
  announceTutorial(draft, events);
  return transition(draft, events);
}
export function tutorialPower(
  state: MatchState,
  side: PlayerId,
): PowerId | undefined {
  const t = state.tutorial;
  if (!t) return undefined;
  return tutorialManifest.scenes[t.chapterId].powerOrder[side].find(
    (id) => !state.players[side].receivedPowerIds.includes(id),
  );
}
/** Predicates depend only on authoritative game state, never animation acknowledgements. */
export function refreshTutorial(s: MatchState, action?: PlayerAction) {
  const t = s.tutorial;
  if (!t || t.pendingScene || s.lifecycle !== "ACTIVE") return;
  if (t.stepId === "G07" && action?.kind === "USE_BLOCK_POWER")
    t.branch = "USED";
  if (t.stepId === "G07" && action?.kind === "KEEP_BLOCK_POWER")
    t.branch = "KEPT";
  if (t.stepId === "E02" && action?.kind === "PLAY_UNIT") t.scriptCursor = 1;
  const g = s.players.GOOD,
    e = s.players.EVIL;
  const done: Record<TutorialView["stepId"], boolean> = {
    G01: g.energy.current === 0 && s.board[1]!.good?.definitionId === "GC01",
    G02:
      g.energy.current === 0 && g.hand.some((c) => c.definitionId === "GC02"),
    G03:
      s.phase === "TURN_END" &&
      e.hp === 19 &&
      !s.board[1]!.good &&
      !s.board[1]!.evil,
    G04: g.energy.current === 0 && !s.board[3]!.evil,
    G05:
      s.phase === "TURN_END" &&
      s.board[1]!.good?.current.hp === 1 &&
      s.board[1]!.evil?.current.hp === 1,
    G06:
      s.turn === 3 &&
      g.energy.current === 2 &&
      s.board[2]!.good?.definitionId === "B01",
    G07: t.branch !== null && !s.blockResponse,
    G08: s.turn === 5 && s.phase === "GOOD_PLAY" && e.hp === 18,
    E01: s.phase === "GOOD_PLAY" && e.energy.current === 2,
    E02:
      s.phase === "TURN_END" &&
      g.hp === 18 &&
      s.board[1]!.good?.current.hp === 1,
  };
  t.stepState = done[t.stepId] ? "AWAITING_CONTINUE" : "ACTIVE";
  t.copyKey = `${t.stepId}.${t.stepState}`;
  const card: Partial<Record<TutorialView["stepId"], CardId>> = {
    G01: "GC01",
    G02: "GC02",
    G04: "GC05",
    G06: "B01",
    E01: "EC01",
    E02: "EC05",
  };
  const lane: Partial<Record<TutorialView["stepId"], LaneId>> = {
    G01: 2,
    G03: 4,
    G04: 4,
    G05: 2,
    G06: 3,
    G07: 4,
    G08: 5,
    E01: 2,
    E02: 5,
  };
  const hand = s.players[s.humanSide].hand.find(
    (c) => c.definitionId === card[t.stepId],
  );
  t.focusTargets =
    t.stepState === "AWAITING_CONTINUE" && t.stepId !== "G02"
      ? [{ kind: "CONTINUE", instanceId: null, laneId: null, side: null }]
      : [
          ...(hand
            ? [
                {
                  kind: "CARD" as const,
                  instanceId: hand.instanceId,
                  laneId: null,
                  side: s.humanSide,
                },
              ]
            : []),
          ...(lane[t.stepId]
            ? [
                {
                  kind: "LANE" as const,
                  instanceId: null,
                  laneId: lane[t.stepId]!,
                  side: s.humanSide,
                },
              ]
            : []),
          ...(t.stepId === "G02"
            ? [
                {
                  kind: "ENERGY" as const,
                  instanceId: null,
                  laneId: null,
                  side: s.humanSide,
                },
              ]
            : []),
        ];
}
export function tutorialCanAdvance(s: MatchState) {
  const t = s.tutorial;
  return (
    !t || !!t.pendingScene || (t.stepState === "ACTIVE" && !s.blockResponse)
  );
}
export function tutorialBotAction(s: MatchState): PlayerAction | null {
  const t = s.tutorial;
  if (
    !t ||
    !tutorialCanAdvance(s) ||
    t.pendingScene ||
    s.lifecycle !== "ACTIVE" ||
    phaseActor(s.phase) !== (s.humanSide === "GOOD" ? "EVIL" : "GOOD")
  )
    return null;
  if (t.stepId === "E02" && s.phase === "GOOD_PLAY" && t.scriptCursor === 0) {
    const c = s.players.GOOD.hand.find((c) => c.definitionId === "GC01");
    if (!c) throw new RangeError("Missing scripted GC01");
    return { kind: "PLAY_UNIT", cardInstanceId: c.instanceId, laneId: 5 };
  }
  return { kind: "PASS_PHASE" };
}
export function tutorialAllowed(
  s: MatchState,
  actor: PlayerId,
  a: PlayerAction,
): boolean {
  const t = s.tutorial;
  if (!t) return !a.kind.startsWith("TUTORIAL_");
  if (actor !== s.humanSide)
    return canonicalJson(a) === canonicalJson(tutorialBotAction(s));
  if (a.kind === "PAUSE" || a.kind === "RESUME" || a.kind === "TUTORIAL_SKIP")
    return true;
  if (a.kind === "TUTORIAL_RESTART") return a.chapterId === t.chapterId;
  if (a.kind === "TUTORIAL_CONTINUE")
    return a.stepId === t.stepId && t.stepState === "AWAITING_CONTINUE";
  if (a.kind === "ADVANCE") return tutorialCanAdvance(s);
  if (t.pendingScene || t.stepState !== "ACTIVE") return false;
  const card = (id: string) =>
    s.players[actor].hand.find((c) => c.instanceId === id)?.definitionId;
  const target = (lane: number, side: PlayerId) =>
    s.board[lane - 1]![side === "GOOD" ? "good" : "evil"]?.instanceId;
  switch (t.stepId) {
    case "G01":
      return (
        a.kind === "PLAY_UNIT" &&
        card(a.cardInstanceId) === "GC01" &&
        a.laneId === 2
      );
    case "G03":
    case "G05":
      return a.kind === "PASS_PHASE";
    case "G04":
      return (
        a.kind === "PLAY_TRICK" &&
        card(a.cardInstanceId) === "GC05" &&
        a.target.kind === "UNIT" &&
        a.target.instanceId === target(4, "EVIL")
      );
    case "G06":
      return (
        a.kind === "PLAY_UNIT" &&
        card(a.cardInstanceId) === "B01" &&
        a.laneId === 3
      );
    case "G07":
      return (
        a.kind === "KEEP_BLOCK_POWER" ||
        (a.kind === "USE_BLOCK_POWER" &&
          a.target.kind === "UNIT" &&
          a.target.instanceId === target(4, "GOOD"))
      );
    case "E01":
      return (
        (a.kind === "PLAY_UNIT" &&
          card(a.cardInstanceId) === "EC01" &&
          a.laneId === 2) ||
        (a.kind === "PASS_PHASE" && s.players.EVIL.energy.current === 2)
      );
    case "E02":
      return (
        (a.kind === "PLAY_TRICK" &&
          card(a.cardInstanceId) === "EC05" &&
          a.target.kind === "UNIT" &&
          a.target.instanceId === target(5, "GOOD")) ||
        (a.kind === "PASS_PHASE" && s.players.EVIL.energy.current === 0)
      );
    default:
      return false;
  }
}
export function tutorialControls(
  s: MatchState,
  actor: PlayerId,
): PlayerAction[] {
  if (
    !s.tutorial ||
    actor !== s.humanSide ||
    !["ACTIVE", "PAUSED"].includes(s.lifecycle)
  )
    return [];
  const t = s.tutorial;
  return [
    { kind: "TUTORIAL_SKIP" },
    ...(s.lifecycle === "ACTIVE"
      ? [
          { kind: "TUTORIAL_RESTART" as const, chapterId: t.chapterId },
          ...(t.stepState === "AWAITING_CONTINUE"
            ? [{ kind: "TUTORIAL_CONTINUE" as const, stepId: t.stepId }]
            : []),
        ]
      : []),
  ];
}
export function applyTutorialControl(
  s: MatchState,
  a: PlayerAction,
): TransitionResult {
  const d = structuredClone(s),
    t = d.tutorial!;
  const events: GameEvent[] = [];
  ++d.rootSeq;
  if (a.kind === "TUTORIAL_SKIP") {
    t.stepState = "SKIPPED";
    finishMatchOnDraft(d, events, {
      result: "NONE",
      winner: null,
      reason: "TUTORIAL_SKIPPED",
    });
    d.lifecycle = "ABANDONED";
  } else if (a.kind === "TUTORIAL_RESTART") {
    const steps: readonly string[] = tutorialManifest.scenes[t.chapterId].steps;
    t.completedStepIds = t.completedStepIds.filter((id) => !steps.includes(id));
    t.pendingScene = t.chapterId;
    t.stepState = "ACTIVE";
  } else {
    t.completedStepIds.push(t.stepId);
    if (t.stepId === "G08" || t.stepId === "E02") {
      t.stepState = "COMPLETED";
      finishMatchOnDraft(d, events, {
        result: "NONE",
        winner: null,
        reason: "TUTORIAL_COMPLETED",
      });
    } else {
      const next: Partial<
        Record<TutorialView["stepId"], TutorialView["stepId"]>
      > = { G01: "G02", G02: "G03", G04: "G05", G07: "G08", E01: "E02" };
      const nextScene: Partial<Record<TutorialView["stepId"], Scene>> = {
        G03: "B",
        G05: "C",
        G06: "D",
      };
      t.pendingScene = nextScene[t.stepId] ?? null;
      t.stepId = next[t.stepId] ?? t.stepId;
      t.stepState = "ACTIVE";
      refreshTutorial(d);
    }
  }
  announceTutorial(d, events);
  return transition(d, events);
}
