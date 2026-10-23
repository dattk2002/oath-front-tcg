import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { gsap } from "gsap";
import type { LaneId, PlayerView } from "@oathfront/contracts";
import type {
  ArenaHit,
  ArenaInteractionSurface,
} from "./rendering/arena-interaction";
import type { IntentController } from "./intent-controller";
import {
  allowedDropHits,
  moveDestination,
  cardActions,
  dragSnapshotValid,
  resolveCardDrop,
  submitCardDrop,
  type DragStamp,
  type PendingCardMove,
} from "./card-drop";
import { createDragClickGuard, dragGesture, pickCardDrop } from "./drag";

interface DragOptions {
  view: PlayerView;
  revision: number;
  disabled: boolean;
  controller: IntentController;
  interactionRef: RefObject<ArenaInteractionSurface | null>;
  /** Increment when renderer publishes a replacement/null surface. */
  rendererEpoch?: number;
  reducedMotion?: boolean;
}
export interface DragVisual {
  definitionId: string;
  instanceId: string;
  returning: boolean;
}
interface Press {
  source: string;
  definitionId: string;
  previewInstance: string;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  element: HTMLElement;
  root: HTMLElement;
  active: boolean;
  surface: ArenaInteractionSurface | null;
  stamp: DragStamp;
  pending: PendingCardMove | null;
  allowedHits: ArenaHit[];
}
export type CardDragBindings = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void;
};

/** Pointer motion lives in refs/GSAP; React updates only at gesture/target changes. */
export function useCardDrag(options: DragOptions) {
  const latest = useRef(options);
  latest.current = options;
  const press = useRef<Press | null>(null);
  const pending = useRef<PendingCardMove | null>(null);
  const pendingStamp = useRef<DragStamp | null>(null);
  const previewNode = useRef<HTMLDivElement | null>(null);
  const previewTween = useRef<gsap.core.Tween | null>(null);
  const lastPoint = useRef({ x: 0, y: 0 });
  const clickGuard = useRef(createDragClickGuard());
  const mounted = useRef(true);
  const announced = useRef("");
  const [announcement, setAnnouncement] = useState("");
  const [visual, setVisual] = useState<DragVisual | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingCardMove | null>(null);
  const [allowedHits, setAllowedHits] = useState<ArenaHit[]>([]);
  const say = useCallback((text: string) => {
    if (announced.current === text) return;
    announced.current = text;
    if (mounted.current) setAnnouncement(text);
  }, []);
  const isReduced = () =>
    latest.current.reducedMotion ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const movePreview = (x: number, y: number) => {
    lastPoint.current = { x, y };
    if (previewNode.current)
      gsap.set(previewNode.current, { x: x - 52, y: y - 120 });
  };
  const previewRef = useCallback((node: HTMLDivElement | null) => {
    previewNode.current = node;
    if (node)
      gsap.set(node, {
        scale: 1,
        opacity: 1,
        x: lastPoint.current.x - 52,
        y: lastPoint.current.y - 120,
      });
  }, []);
  const releasePointer = (current: Press | null) => {
    if (!current) return;
    delete current.element.dataset.dragging;
    delete current.root.dataset.cardDragging;
    for (const hero of current.root.querySelectorAll<HTMLElement>(
      "[data-drag-target]",
    ))
      delete hero.dataset.dragTarget;
    if (current.element.hasPointerCapture(current.pointerId))
      current.element.releasePointerCapture(current.pointerId);
  };
  const clearSurface = (surface: ArenaInteractionSurface | null) => {
    surface?.setDragPreview(null);
    surface?.holdCamera(false);
    surface?.clearInteraction();
  };
  const cancel = useCallback(
    (animate = false, preservePointerClick = false) => {
      if (!preservePointerClick) clickGuard.current.reset();
      const current = press.current;
      press.current = null;
      pending.current = null;
      pendingStamp.current = null;
      clearSurface(current?.surface ?? latest.current.interactionRef.current);
      releasePointer(current);
      previewTween.current?.kill();
      if (mounted.current) {
        setPendingMove(null);
        setAllowedHits([]);
      }
      if (animate && current?.active && previewNode.current && !isReduced()) {
        const box = current.element.getBoundingClientRect();
        setVisual((value) => (value ? { ...value, returning: true } : null));
        previewTween.current = gsap.to(previewNode.current, {
          x: box.left,
          y: box.top,
          scale: 0.78,
          opacity: 0,
          duration: 0.18,
          ease: "power2.out",
          onComplete: () => {
            if (mounted.current) setVisual(null);
          },
        });
      } else if (mounted.current) setVisual(null);
    },
    [],
  );
  const valid = (current: Press) => {
    const now = latest.current;
    const snapshot = now.controller.getSnapshot();
    return (
      current.surface === now.interactionRef.current &&
      !snapshot.pendingCommand &&
      dragSnapshotValid(
        snapshot.authoritativeView,
        snapshot.revision,
        now.disabled,
        current.stamp,
      ) &&
      !document.hidden &&
      navigator.onLine &&
      !document.querySelector("dialog[open]")
    );
  };
  const hover = (current: Press, x: number, y: number) => {
    if (!valid(current)) {
      cancel();
      return null;
    }
    const snapshot = latest.current.controller.getSnapshot();
    const hit = pickCardDrop({
      x,
      y,
      root: current.root,
      surface: current.surface,
      allowedHits: current.allowedHits,
      view: snapshot.authoritativeView,
      source: current.source,
      pending: current.pending,
    });
    const result = resolveCardDrop(
      snapshot.authoritativeView,
      snapshot.revision,
      current.source,
      hit,
      current.pending,
    );
    current.surface?.setDragPreview({
      definitionId: current.definitionId,
      instanceId: current.previewInstance,
      clientX: x,
      clientY: y,
      allowedHits: current.allowedHits,
      hoveredHit: hit?.kind === "HERO" ? null : hit,
      valid: !!result,
    });
    if (previewNode.current) {
      previewNode.current.dataset.valid = String(!!result);
      const label = previewNode.current.querySelector(".drag-drop-status");
      if (label)
        label.textContent =
          result?.kind === "MOVE"
            ? "Choose this unit"
            : result
              ? "Release to play"
              : "Choose a target";
    }
    for (const hero of current.root.querySelectorAll<HTMLElement>(
      ".hero-panel",
    )) {
      if (hit?.kind === "HERO" && hit.side === hero.dataset.heroSide && result)
        hero.dataset.dragTarget = "true";
      else delete hero.dataset.dragTarget;
    }
    const name =
      hit?.kind === "HERO"
        ? "hero"
        : hit?.kind === "UNIT"
          ? "unit"
          : hit?.kind === "CAST"
            ? "center"
            : hit
              ? `lane ${hit.laneId}`
              : "";
    say(
      result
        ? result.kind === "MOVE"
          ? "Release on this unit, then drag it to a highlighted slot."
          : `Release to play on ${name}.`
        : "Drag to a highlighted target. Release elsewhere to cancel.",
    );
    return result;
  };
  const finishResult = (
    result: ReturnType<typeof resolveCardDrop>,
    current: Press,
  ) => {
    if (!result) {
      say("Card returned to hand. No energy spent.");
      cancel(true, true);
      return;
    }
    press.current = null;
    releasePointer(current);
    current.surface?.setDragPreview(null);
    if (mounted.current) {
      setVisual(null);
      setAllowedHits([]);
    }
    if (result.kind === "MOVE") {
      pending.current = result.pending;
      pendingStamp.current = current.stamp;
      setPendingMove(result.pending);
      current.surface?.holdCamera(true);
      say("Now drag the outlined unit to a highlighted slot. Escape cancels.");
      return;
    }
    cancel(false, true);
    say("Playing card.");
    submitCardDrop(
      latest.current.controller,
      current.stamp,
      result,
      latest.current.disabled,
    );
  };
  const bindings = (source: string, unitId?: string): CardDragBindings => ({
    onPointerDown(event) {
      if (event.isPrimary && event.button === 0) clickGuard.current.reset();
      const now = latest.current;
      const snapshot = now.controller.getSnapshot();
      if (
        !event.isPrimary ||
        event.button !== 0 ||
        now.disabled ||
        snapshot.pendingCommand ||
        document.querySelector("dialog[open]") ||
        snapshot.authoritativeView.lifecycle !== "ACTIVE"
      )
        return;
      if (unitId && pending.current?.selectedUnit !== unitId) return;
      if (!unitId && pending.current) cancel();
      const card = snapshot.authoritativeView.self.hand.find(
        (card) => card.instanceId === source,
      );
      const actions = cardActions(snapshot.authoritativeView, source);
      const root =
        event.currentTarget.closest<HTMLElement>("[data-battle-root]");
      if (!card || !actions.length || !root) return;
      const unit = unitId
        ? snapshot.authoritativeView.board
            .flatMap((lane) => [lane.good, lane.evil])
            .find((unit) => unit?.instanceId === unitId)
        : null;
      previewTween.current?.kill();
      setVisual(null);
      const stamp = {
        sourceCard: source,
        revision: snapshot.revision,
        actions: JSON.stringify(actions),
      };
      press.current = {
        source,
        definitionId: unit?.definitionId ?? card.definitionId,
        previewInstance: unitId ?? source,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        element: event.currentTarget,
        root,
        active: false,
        surface: now.interactionRef.current,
        stamp,
        pending: pending.current,
        allowedHits: allowedDropHits(
          snapshot.authoritativeView,
          source,
          pending.current,
        ),
      };
      if (event.pointerType !== "touch")
        event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event) {
      const current = press.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (!valid(current)) {
        cancel();
        return;
      }
      if (!current.active) {
        const gesture = dragGesture(
          current.pending ? "mouse" : current.pointerType,
          current.startX,
          current.startY,
          event.clientX,
          event.clientY,
        );
        if (gesture === "SCROLL") {
          press.current = null;
          releasePointer(current);
          return;
        }
        if (gesture !== "DRAG") return;
        if (!latest.current.controller.prepareDrag()) {
          cancel();
          return;
        }
        current.active = true;
        clickGuard.current.suppress();
        current.element.setPointerCapture(current.pointerId);
        current.element.dataset.dragging = "true";
        current.root.dataset.cardDragging = "true";
        current.surface?.holdCamera(true);
        setVisual({
          definitionId: current.definitionId,
          instanceId: current.previewInstance,
          returning: false,
        });
        setAllowedHits(current.allowedHits);
      }
      event.preventDefault();
      current.x = event.clientX;
      current.y = event.clientY;
      movePreview(event.clientX, event.clientY);
      hover(current, event.clientX, event.clientY);
    },
    onPointerUp(event) {
      const current = press.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (!current.active) {
        press.current = null;
        releasePointer(current);
        return;
      }
      event.preventDefault();
      clickGuard.current.suppress();
      if (!valid(current)) {
        cancel(false, true);
        return;
      }
      const result = hover(current, event.clientX, event.clientY);
      if (press.current === current) finishResult(result, current);
    },
    onPointerCancel() {
      if (press.current) cancel();
    },
    onLostPointerCapture() {
      if (press.current?.active) cancel();
    },
  });
  const consumeClick = (event: { detail: number }) =>
    clickGuard.current.consume(event.detail);
  const dropOnLane = (laneId: LaneId) => {
    const move = pending.current,
      stamp = pendingStamp.current,
      now = latest.current;
    if (!move || !stamp) return false;
    const snapshot = now.controller.getSnapshot();
    if (
      snapshot.pendingCommand ||
      !dragSnapshotValid(
        snapshot.authoritativeView,
        snapshot.revision,
        now.disabled,
        stamp,
      )
    ) {
      cancel();
      return true;
    }
    const result = resolveCardDrop(
      snapshot.authoritativeView,
      snapshot.revision,
      move.sourceCard.instanceId,
      moveDestination(snapshot.authoritativeView, move, laneId),
      move,
    );
    if (result?.kind === "SUBMIT") {
      cancel();
      submitCardDrop(now.controller, stamp, result, now.disabled);
    }
    return true;
  };
  useEffect(() => {
    const current = press.current,
      stamp = pendingStamp.current;
    const snapshot = options.controller.getSnapshot();
    if (
      current &&
      (!dragSnapshotValid(
        snapshot.authoritativeView,
        snapshot.revision,
        options.disabled,
        current.stamp,
      ) ||
        current.surface !== options.interactionRef.current)
    )
      cancel();
    else if (
      stamp &&
      !dragSnapshotValid(
        snapshot.authoritativeView,
        snapshot.revision,
        options.disabled,
        stamp,
      )
    )
      cancel();
  }, [
    options.view,
    options.revision,
    options.disabled,
    options.rendererEpoch,
    options.interactionRef,
    options.controller,
    cancel,
  ]);
  useEffect(() => {
    cancel();
  }, [options.rendererEpoch, cancel]);
  useEffect(() => {
    mounted.current = true;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    const hidden = () => {
      if (document.hidden) cancel();
    };
    const offline = () => cancel();
    document.addEventListener("keydown", escape);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("offline", offline);
    const dialogs = new MutationObserver(() => {
      if (document.querySelector("dialog[open]")) cancel();
    });
    dialogs.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
      childList: true,
    });
    return () => {
      mounted.current = false;
      cancel();
      previewTween.current?.kill();
      document.removeEventListener("keydown", escape);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("offline", offline);
      dialogs.disconnect();
    };
  }, [cancel]);
  return {
    getCardBindings: (instanceId: string) => bindings(instanceId),
    getUnitBindings: (instanceId: string) =>
      bindings(pending.current?.sourceCard.instanceId ?? "", instanceId),
    consumeClick,
    cancel,
    dropOnLane,
    pendingMove,
    allowedHits,
    visual,
    previewRef,
    dragging: !!visual && !visual.returning,
    announcement,
  };
}
export type CardDragController = ReturnType<typeof useCardDrag>;
