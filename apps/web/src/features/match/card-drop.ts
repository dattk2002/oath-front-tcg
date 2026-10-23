import type {
  LaneId,
  PlayerAction,
  PlayerView,
  Side,
} from "@oathfront/contracts";
import type { ArenaHit } from "./rendering/arena-interaction";
import { targetEqual, targetFor } from "./intent-controller";

export type CardDropHit = ArenaHit | { kind: "HERO"; side: Side };
export interface PendingCardMove {
  sourceCard: { instanceId: string; definitionId: string };
  selectedUnit: string;
  revision: number;
  allowedDestinations: LaneId[];
}
export interface DragStamp {
  sourceCard: string;
  revision: number;
  actions: string;
}
export type CardDropResult =
  | { kind: "SUBMIT"; action: PlayerAction }
  | { kind: "MOVE"; pending: PendingCardMove };
export function cardActions(view: PlayerView, instanceId: string) {
  return view.legalActions.filter(
    (action) =>
      "cardInstanceId" in action && action.cardInstanceId === instanceId,
  );
}
export function dragSnapshotValid(
  view: PlayerView,
  revision: number,
  disabled: boolean,
  stamp: DragStamp,
) {
  return (
    !disabled &&
    view.lifecycle === "ACTIVE" &&
    revision === stamp.revision &&
    view.self.hand.some((card) => card.instanceId === stamp.sourceCard) &&
    JSON.stringify(cardActions(view, stamp.sourceCard)) === stamp.actions
  );
}
function emptyFriendly(view: PlayerView, laneId: LaneId) {
  const lane = view.board.find((lane) => lane.laneId === laneId);
  return !!lane && !lane[view.self.side === "GOOD" ? "good" : "evil"];
}
export function movingUnitOwner(
  view: PlayerView,
  instanceId: string | null | undefined,
): Side | null {
  if (!instanceId) return null;
  return (
    view.board
      .flatMap((lane) => [lane.good, lane.evil])
      .find((unit) => unit?.instanceId === instanceId)?.owner ?? null
  );
}
export function moveDestination(
  view: PlayerView,
  pending: PendingCardMove,
  laneId: LaneId,
): Extract<ArenaHit, { kind: "SLOT" }> | null {
  const side = movingUnitOwner(view, pending.selectedUnit);
  return side ? { kind: "SLOT", side, laneId } : null;
}
export function allowedDropHits(
  view: PlayerView,
  source: string,
  pending?: PendingCardMove | null,
): ArenaHit[] {
  const result: ArenaHit[] = [];
  for (const action of cardActions(view, source)) {
    const target = targetFor(action);
    let hit: ArenaHit | null = null;
    if (pending) {
      if (
        target?.kind === "UNIT_AND_LANE" &&
        target.instanceId === pending.selectedUnit
      )
        hit = moveDestination(view, pending, target.laneId);
    } else if (action.kind === "PLAY_UNIT") {
      if (emptyFriendly(view, action.laneId))
        hit = { kind: "SLOT", side: view.self.side, laneId: action.laneId };
    } else if (target?.kind === "UNIT_AND_LANE" || target?.kind === "UNIT") {
      hit = { kind: "UNIT", instanceId: target.instanceId };
    } else if (target?.kind === "LANE") hit = target;
    else if (target?.kind === "NONE") hit = { kind: "CAST" };
    if (
      hit &&
      !result.some((other) => JSON.stringify(other) === JSON.stringify(hit))
    )
      result.push(hit);
  }
  return result;
}
export function resolveCardDrop(
  view: PlayerView,
  revision: number,
  source: string,
  hit: CardDropHit | null,
  pending?: PendingCardMove | null,
): CardDropResult | null {
  const card = view.self.hand.find((card) => card.instanceId === source);
  if (!card || !hit || view.lifecycle !== "ACTIVE") return null;
  const actions = cardActions(view, source);
  if (pending) {
    if (
      pending.revision !== revision ||
      pending.sourceCard.instanceId !== source ||
      hit.kind !== "SLOT" ||
      hit.side !== movingUnitOwner(view, pending.selectedUnit)
    )
      return null;
    const action = actions.find((action) =>
      targetEqual(targetFor(action), {
        kind: "UNIT_AND_LANE",
        instanceId: pending.selectedUnit,
        laneId: hit.laneId,
      }),
    );
    return action ? { kind: "SUBMIT", action } : null;
  }
  const action = actions.find((action) => {
    if (action.kind === "PLAY_UNIT")
      return (
        hit.kind === "SLOT" &&
        hit.side === view.self.side &&
        action.laneId === hit.laneId &&
        emptyFriendly(view, hit.laneId)
      );
    if (hit.kind === "SLOT") return false;
    return targetEqual(
      targetFor(action),
      hit.kind === "CAST" ? { kind: "NONE" } : hit,
    );
  });
  if (action) return { kind: "SUBMIT", action };
  if (hit.kind === "UNIT") {
    const destinations = actions.flatMap((action) => {
      const target = targetFor(action);
      return target?.kind === "UNIT_AND_LANE" &&
        target.instanceId === hit.instanceId
        ? [target.laneId]
        : [];
    });
    if (
      destinations.length &&
      view.board.some(
        (lane) =>
          lane.good?.instanceId === hit.instanceId ||
          lane.evil?.instanceId === hit.instanceId,
      )
    )
      return {
        kind: "MOVE",
        pending: {
          sourceCard: card,
          selectedUnit: hit.instanceId,
          revision,
          allowedDestinations: destinations,
        },
      };
  }
  return null;
}

/** Last synchronous boundary before the existing intent/idempotency controller. */
export function submitCardDrop(
  controller: Pick<
    import("./intent-controller").IntentController,
    "getSnapshot" | "submitIntent"
  >,
  stamp: DragStamp,
  result: CardDropResult | null,
  disabled: boolean,
): boolean {
  if (result?.kind !== "SUBMIT") return false;
  const snapshot = controller.getSnapshot();
  if (
    snapshot.pendingCommand ||
    !dragSnapshotValid(
      snapshot.authoritativeView,
      snapshot.revision,
      disabled,
      stamp,
    )
  )
    return false;
  if (
    !("cardInstanceId" in result.action) ||
    result.action.cardInstanceId !== stamp.sourceCard
  )
    return false;
  void controller.submitIntent(result.action);
  return true;
}
