import { validateBrowserWire } from "@oathfront/contracts/browser";
export const dragThreshold = 6;
export function crossedDragThreshold(
  start: { x: number; y: number },
  x: number,
  y: number,
) {
  return Math.hypot(x - start.x, y - start.y) >= dragThreshold;
}
export function dropTarget(x: number, y: number) {
  const element = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>('[data-target][data-legal-target="true"]');
  if (!element?.dataset.target) return null;
  try {
    const target: unknown = JSON.parse(element.dataset.target);
    return validateBrowserWire("Target", target) ? target : null;
  } catch {
    return null;
  }
}

/** Horizontal touch motion belongs to native scrolling. Vertical play gestures
 * are enabled by pan-x/pinch-zoom before pointerdown, never switched mid-gesture. */
export function dragGesture(
  pointerType: string,
  startX: number,
  startY: number,
  x: number,
  y: number,
): "WAIT" | "SCROLL" | "DRAG" {
  const dx = x - startX,
    dy = y - startY;
  if (pointerType !== "touch")
    return crossedDragThreshold({ x: startX, y: startY }, x, y)
      ? "DRAG"
      : "WAIT";
  if (Math.abs(dx) >= 8 && Math.abs(dx) > Math.abs(dy)) return "SCROLL";
  return dy <= -10 && -dy > Math.abs(dx) * 1.25 ? "DRAG" : "WAIT";
}

import type { PlayerView, Target } from "@oathfront/contracts";
import type {
  ArenaHit,
  ArenaInteractionSurface,
} from "./rendering/arena-interaction";
import type { CardDropHit, PendingCardMove } from "./card-drop";
import { cardActions, moveDestination } from "./card-drop";

/** Only the topmost semantic surface participates. Never drop through UI. */
export function pickCardDrop({
  x,
  y,
  root,
  surface,
  allowedHits,
  view,
  source,
  pending,
}: {
  x: number;
  y: number;
  root: HTMLElement;
  surface: ArenaInteractionSurface | null;
  allowedHits: readonly ArenaHit[];
  view: PlayerView;
  source: string;
  pending: PendingCardMove | null;
}): CardDropHit | null {
  if (document.querySelector("dialog[open]")) return null;
  const top = document.elementFromPoint(x, y);
  if (!top || !root.contains(top)) return null;
  if (
    top.closest(
      '[data-drop-blocker], .inspect, .block-response, .tutorial-panel, .reserve[open], .hand-list[open], .tablet-inspect[open], .terrain details[open], .command-status[data-active="true"], .match-heading, .match-account-access, .battle-scene-recovery',
    )
  )
    return null;
  const semantic = top.closest<HTMLElement>("[data-target]");
  let target: Target | null = null;
  if (semantic?.dataset.target) {
    try {
      const value: unknown = JSON.parse(semantic.dataset.target);
      if (validateBrowserWire("Target", value)) target = value;
    } catch {
      /* Malformed DOM metadata is not a target. */
    }
  }
  if (target?.kind === "HERO") return target;
  if (
    top.closest(
      ".hero-panel, .hand-region, .motion-preferences, .motion-controls, .phase-controls, .orientation-hint",
    )
  )
    return null;
  if (top.closest("button, summary, a, input, select, textarea") && !semantic)
    return null;
  if (surface) return surface.pick(x, y, allowedHits)[0] ?? null;
  // Text-board mode uses the same public semantics without manufacturing geometry.
  if (target?.kind === "UNIT") return target;
  if (target?.kind === "NONE") return { kind: "CAST" };
  if (target?.kind === "LANE") {
    if (pending) return moveDestination(view, pending, target.laneId);
    const deployment = cardActions(view, source).some(
      (action) => action.kind === "PLAY_UNIT",
    );
    return deployment
      ? { kind: "SLOT", side: view.self.side, laneId: target.laneId }
      : target;
  }
  return null;
}

/** A pointer-generated click may follow release, but keyboard activation has
 * detail=0 and must never be consumed by a previous gesture. */
export function createDragClickGuard() {
  let suppressed = false;
  return {
    suppress() {
      suppressed = true;
    },
    reset() {
      suppressed = false;
    },
    consume(detail: number) {
      const consume = suppressed && detail > 0;
      suppressed = false;
      return consume;
    },
  };
}
