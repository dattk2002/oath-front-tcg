import { matchCatalog } from "./catalog.js";
import type {
  PlayerView,
  PlayerAction,
  UnitView,
  HeroView,
  EntityRef,
} from "@oathfront/contracts";
import { opposite, slot, targetEqual } from "./targets.js";
import { attackValue } from "./rule-math.js";
import { createPublicResolution } from "./preview-resolution.js";
export type PreviewUnknown =
  | "DRAW"
  | "POWER_GRANT"
  | "HIDDEN_LOCATION"
  | "TRIGGER_HISTORY"
  | "OPPONENT_RESPONSE"
  | "MULLIGAN";
export interface PublicPreview {
  legal: boolean;
  /** NONE returns a current snapshot, never a prediction of zero actual effects. */
  forecast: "ACTION" | "CURRENT_COMBAT" | "NONE";
  uncertainty: boolean;
  unknowns: PreviewUnknown[];
  immediateWin: boolean;
  immediateLoss: boolean;
  /** Known-only estimates when uncertainty is true. */
  enemyHeroDamage: number;
  ownHeroDamage: number;
  effectiveOwnHeroHeal: number;
  deltaBoardValue: number;
  netCardsGained: number;
  energySpent: number;
  /** Public-only hypothetical board; preview:summon:* IDs are local symbolic handles. */
  board: PlayerView["board"];
  players: Record<"GOOD" | "EVIL", HeroView>;
  unknownDraws: Record<"GOOD" | "EVIL", number>;
}
/** Public knowledge adapter. No private state, RNG, hidden card guesses, or server execution imports. */
export function previewPublicAction(
  view: PlayerView,
  action: PlayerAction,
): PublicPreview {
  const side = view.self.side,
    world = {
      board: structuredClone(view.board),
      players: structuredClone(view.players),
    };
  const unknowns = new Set<PreviewUnknown>();
  const unknownDraws = { GOOD: 0, EVIL: 0 };
  const result: PublicPreview = {
    legal: view.legalActions.some((a) => sameAction(a, action)),
    forecast: "NONE",
    uncertainty: false,
    unknowns: [],
    immediateWin: false,
    immediateLoss: false,
    enemyHeroDamage: 0,
    ownHeroDamage: 0,
    effectiveOwnHeroHeal: 0,
    deltaBoardValue: 0,
    netCardsGained: 0,
    energySpent: 0,
    board: world.board,
    players: world.players,
    unknownDraws,
  };
  if (!result.legal) return result;
  if (
    ["PLAY_UNIT", "PLAY_TRICK", "USE_POWER", "USE_BLOCK_POWER"].includes(
      action.kind,
    )
  )
    result.forecast = "ACTION";
  else if (
    (action.kind === "PASS_PHASE" && view.phase === "EVIL_TRICKS") ||
    (action.kind === "ADVANCE" && view.phase === "COMBAT")
  )
    result.forecast = "CURRENT_COMBAT";
  const initialBoardValue = boardValue(world.board, side);
  const {
    effects,
    create,
    hooks,
    drain,
    checkpoint,
    settle,
    batch,
    ruleAt,
    contextFor,
    isTerminal,
  } = createPublicResolution(view, world, result, unknowns);
  const own = world.players[side];
  if (action.kind === "PLAY_UNIT" || action.kind === "PLAY_TRICK") {
    const card = view.self.hand.find(
      (c) => c.instanceId === action.cardInstanceId,
    )!;
    const def = matchCatalog(view).cards.find((c) => c.id === card.definitionId)!;
    result.energySpent =
      def.cost +
      (action.kind === "PLAY_UNIT" &&
      ruleAt(action.laneId)?.kind === "UNIT_COST"
        ? 1
        : 0);
    own.energy.current -= result.energySpent;
    own.handCount--;
    if (action.kind === "PLAY_UNIT") {
      const u = create(def, side, action.laneId, card.instanceId),
        rule = ruleAt(action.laneId),
        context = contextFor(u),
        location = world.board[action.laneId - 1]!.location;
      if (rule?.kind === "ENTRY_HEALTH")
        effects(
          {
            ...context,
            definitionId:
              location.state === "REVEALED"
                ? location.definitionId
                : context.definitionId,
            target: { kind: "UNIT", instanceId: u.instanceId },
          },
          [
            {
              kind: "MODIFY_STATS",
              targets: "SELECTED_UNIT",
              attackDelta: 0,
              healthDelta: rule.amount,
              duration: "PERMANENT",
            },
          ],
        );
      if (rule?.kind === "ENTRY_EXHAUST") u.statuses.exhausted = true;
      hooks("ON_PLAY", [u]);
      drain();
    } else {
      const entry = own.discard.find((c) => c.definitionId === def.id);
      if (entry) entry.quantity++;
      else own.discard.push({ definitionId: def.id, quantity: 1 });
      effects(
        {
          owner: side,
          definitionId: def.id,
          instanceId: card.instanceId,
          laneId: null,
          target: action.target,
        },
        def.effects,
      );
    }
    checkpoint();
  } else if (action.kind === "USE_POWER" || action.kind === "USE_BLOCK_POWER") {
    const power = view.self.reserve.find(
      (p) => p.instanceId === action.powerInstanceId,
    )!;
    const def = matchCatalog(view).powers.find(
      (p) => p.id === power.definitionId,
    )!;
    result.energySpent = action.kind === "USE_BLOCK_POWER" ? 0 : 1;
    own.energy.current -= result.energySpent;
    own.reserveCount--;
    own.usedPowers.push(power.definitionId);
    effects(
      {
        owner: side,
        definitionId: def.id,
        instanceId: power.instanceId,
        laneId: null,
        target: action.target,
      },
      def.effects,
    );
    checkpoint();
  } else if (action.kind === "MULLIGAN") unknowns.add("MULLIGAN");
  // PASS can forecast current combat; stop at any unknown block response before later roots.
  if (
    (action.kind === "PASS_PHASE" && view.phase === "EVIL_TRICKS") ||
    (action.kind === "ADVANCE" && view.phase === "COMBAT")
  ) {
    for (const lane of world.board) {
      const stage =
        view.combat && lane.laneId === view.combat.laneId
          ? view.combat.stage
          : "BEFORE_PAIR";
      if (stage === "BLOCK_RESPONSES") {
        unknowns.add("OPPONENT_RESPONSE");
        break;
      }

      if (isTerminal()) break;
      if (view.combat && lane.laneId < view.combat.laneId) continue;
      if (lane.location.state === "HIDDEN") unknowns.add("HIDDEN_LOCATION");
      if (stage === "BEFORE_PAIR")
        hooks(
          "BEFORE_COMBAT_HERE",
          [lane.evil, lane.good].filter((u): u is UnitView => !!u),
        );
      drain();
      checkpoint();
      if (isTerminal()) break;
      const attacks = (
        stage === "AFTER_LANE" ? [] : [lane.evil, lane.good]
      ).flatMap((u) => {
        if (
          !u ||
          u.statuses.stunned ||
          u.statuses.exhausted ||
          u.lastRegularAttackTurn === view.turn
        )
          return [];
        const defender = lane[slot(opposite(u.owner))],
          amount = attackValue(u, ruleAt(lane.laneId), !!defender);
        if (amount <= 0) return [];
        u.lastRegularAttackTurn = view.turn;
        const refs: EntityRef[] = defender
          ? [{ kind: "UNIT", instanceId: defender.instanceId }]
          : [{ kind: "HERO", side: opposite(u.owner) }];
        if (defender && u.statuses.pierce)
          refs.push({ kind: "HERO", side: opposite(u.owner) });
        return [{ refs, amount }];
      });
      const damaged = attacks.flatMap((a) => batch(a.refs, a.amount, true));
      settle(damaged);
      checkpoint();
      if (isTerminal() || unknowns.has("POWER_GRANT")) break;
      const rule = ruleAt(lane.laneId);
      if (rule?.kind === "AFTER_COMBAT_DAMAGE") {
        settle(
          batch(
            [lane.evil, lane.good]
              .filter((u): u is UnitView => !!u)
              .map((u) => ({ kind: "UNIT", instanceId: u.instanceId })),
            rule.amount,
          ),
        );
        checkpoint();
      }
    }
  }
  result.netCardsGained = own.handCount - view.players[side].handCount;
  result.deltaBoardValue = boardValue(world.board, side) - initialBoardValue;
  result.unknowns = [...unknowns].sort();
  result.uncertainty = !!result.unknowns.length;
  if (result.uncertainty) {
    result.immediateWin = false;
    result.immediateLoss = false;
  }
  return result;
}
function sameAction(a: PlayerAction, b: PlayerAction): boolean {
  if (a.kind !== b.kind) return false;
  if ("target" in a)
    return (
      "target" in b &&
      targetEqual(a.target, b.target) &&
      ("cardInstanceId" in a
        ? "cardInstanceId" in b && a.cardInstanceId === b.cardInstanceId
        : "powerInstanceId" in a &&
          "powerInstanceId" in b &&
          a.powerInstanceId === b.powerInstanceId)
    );
  if (a.kind === "PLAY_UNIT")
    return (
      b.kind === "PLAY_UNIT" &&
      a.cardInstanceId === b.cardInstanceId &&
      a.laneId === b.laneId
    );
  return JSON.stringify(a) === JSON.stringify(b);
}
function boardValue(board: PlayerView["board"], side: "GOOD" | "EVIL"): number {
  return board.reduce(
    (sum, l) =>
      sum +
      [l.evil, l.good].reduce(
        (n, u) =>
          !u
            ? n
            : n +
              (u.owner === side ? 1 : -1) *
                (1.6 * u.current.attack +
                  u.current.hp +
                  Number(u.statuses.shield) +
                  0.7 * u.statuses.armor +
                  0.8 * Number(u.statuses.pierce) -
                  Number(u.statuses.stunned || u.statuses.exhausted) -
                  1.5 * Number(u.statuses.poisoned)),
        0,
      ),
    0,
  );
}

/** Known lane combat from the same public primitives; other lanes cannot contaminate a local heuristic. */
export function previewPublicLaneCombat(
  view: PlayerView,
  laneId: number,
): PublicPreview {
  const local = structuredClone(view);
  for (const lane of local.board)
    if (lane.laneId !== laneId) {
      lane.good = null;
      lane.evil = null;
    }
  local.phase = "COMBAT";
  // Earlier pairs are resolved; the current pair must retain its actual stage.
  // A later lane still has a known pair to evaluate independently of intervening responses.
  if (!local.combat || laneId > local.combat.laneId)
    local.combat = { laneId, stage: "BEFORE_PAIR" };
  local.legalActions = [{ kind: "ADVANCE" }];
  return previewPublicAction(local, { kind: "ADVANCE" });
}
