import CardVisual from "../content/CardVisual";
import { contentName, contentText } from "../../content/english-content";
import { useEffect, useRef, type CSSProperties } from "react";
import { gsap } from "gsap";
import type { CardDragController } from "./use-card-drag";
import type { PlayerView, PublicCatalog } from "@oathfront/contracts";
import { crossedDragThreshold, dropTarget } from "./drag";
import type { IntentController } from "./intent-controller";
import { groupArrows } from "./keyboard";
export default function Hand({
  view,
  catalog,
  controller,
  selectedId,
  disabled,
  mulligan,
  onMulligan,
  cardDrag,
  reducedMotion = false,
}: {
  view: PlayerView;
  catalog: PublicCatalog;
  controller: IntentController;
  selectedId: string | null;
  disabled: boolean;
  mulligan: readonly string[] | null;
  onMulligan: (id: string) => void;
  cardDrag?: CardDragController;
  reducedMotion?: boolean;
}) {
  const fan = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const region = fan.current;
    if (!region) return;
    const resize = new ResizeObserver(() => {
      const focused = document.activeElement;
      if (
        focused instanceof HTMLElement &&
        focused.matches(".hand-card") &&
        region.contains(focused)
      )
        focused.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        });
    });
    resize.observe(region);
    return () => resize.disconnect();
  }, []);
  useEffect(() => {
    const region = fan.current;
    if (!region) return;
    const tweens = new Map<HTMLElement, gsap.core.Tween>();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const move = (event: Event, raised: boolean) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLElement>(".hand-card");
      const surface = button?.querySelector<HTMLElement>(".hand-card-lift");
      if (!button || !surface || !region.contains(button)) return;
      if (
        event instanceof MouseEvent &&
        event.relatedTarget instanceof Node &&
        button.contains(event.relatedTarget)
      )
        return;
      if (event instanceof PointerEvent && event.pointerType === "touch")
        return;
      const active = raised || button.matches(":focus-visible");
      tweens.get(surface)?.kill();
      tweens.set(
        surface,
        gsap.to(surface, {
          y: active && !reducedMotion && !reduced.matches ? -14 : 0,
          duration: reducedMotion || reduced.matches ? 0 : 0.16,
          ease: "power2.out",
        }),
      );
    };
    const enter = (event: Event) => move(event, true),
      leave = (event: Event) => move(event, false);
    const settle = () => {
      tweens.forEach((tween, node) => {
        tween.kill();
        gsap.set(node, { y: 0 });
      });
    };
    region.addEventListener("pointerover", enter);
    region.addEventListener("pointerout", leave);
    region.addEventListener("focusin", enter);
    region.addEventListener("focusout", leave);
    reduced.addEventListener("change", settle);
    return () => {
      region.removeEventListener("pointerover", enter);
      region.removeEventListener("pointerout", leave);
      region.removeEventListener("focusin", enter);
      region.removeEventListener("focusout", leave);
      reduced.removeEventListener("change", settle);
      settle();
    };
  }, [view.self.hand.map((card) => card.instanceId).join("|"), reducedMotion]);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  return (
    <>
      <section
        className="hand-region"
        aria-label={mulligan ? "Opening hand" : "Hand"}
      >
        <div className="region-heading">
          <h2>{mulligan ? "Choose cards to replace" : "Hand"}</h2>
          <span>{view.self.hand.length} / 10 cards</span>
        </div>
        <div
          ref={fan}
          className="hand courtyard-hand"
          data-card-count={view.self.hand.length}
          onKeyDown={(event) => {
            groupArrows(event);
            if (event.defaultPrevented) {
              event.currentTarget
                .querySelector<HTMLElement>(".hand-card:focus")
                ?.scrollIntoView({ block: "nearest", inline: "nearest" });
            }
          }}
        >
          {view.self.hand.map((card, index) => {
            const def = catalog.cards.find(
              (item) => item.id === card.definitionId,
            )!;
            const playable = view.legalActions.some(
              (action) =>
                "cardInstanceId" in action &&
                action.cardInstanceId === card.instanceId,
            );
            const selected = mulligan
              ? mulligan.includes(card.instanceId)
              : card.instanceId === selectedId;
            const offset = index - (view.self.hand.length - 1) / 2;
            return (
              <div
                className="hand-card-seat"
                key={card.instanceId}
                style={
                  {
                    "--fan-angle": `${offset * Math.min(4, 20 / Math.max(1, view.self.hand.length - 1))}deg`,
                    "--fan-rise": `${Math.abs(offset) * 3}px`,
                    "--fan-index": index,
                  } as CSSProperties
                }
              >
                <button
                  className={`hand-card ${def.faction.toLowerCase()}`}
                  data-rarity={def.rarity}
                  data-card-id={card.instanceId}
                  data-tutorial-focus={view.tutorial?.focusTargets.some(
                    (t) =>
                      t.kind === "CARD" && t.instanceId === card.instanceId,
                  )}
                  data-playable={playable && !disabled && !mulligan}
                  data-playable-unit={
                    def.type === "UNIT" && playable && !disabled && !mulligan
                  }
                  aria-pressed={selected}

                  onClick={(event) => {
                    if (cardDrag?.consumeClick(event)) return;
                    cardDrag?.cancel();
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    if (mulligan) onMulligan(card.instanceId);
                    else controller.selectCard(card.instanceId);
                  }}
                  onPointerDown={(event) => {
                    if (cardDrag && !mulligan) {
                      cardDrag
                        .getCardBindings(card.instanceId)
                        .onPointerDown(event);
                      return;
                    }
                    // Legacy text-board mode keeps native touch scrolling.
                    if (event.pointerType === "touch" || disabled || mulligan)
                      return;
                    drag.current = {
                      id: card.instanceId,
                      x: event.clientX,
                      y: event.clientY,
                      active: false,
                    };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (cardDrag && !mulligan) {
                      cardDrag
                        .getCardBindings(card.instanceId)
                        .onPointerMove(event);
                      return;
                    }
                    if (event.pointerType === "touch") return;
                    const current = drag.current;
                    if (!current || current.id !== card.instanceId) return;
                    if (
                      !current.active &&
                      crossedDragThreshold(
                        current,
                        event.clientX,
                        event.clientY,
                      )
                    ) {
                      current.active = true;
                      controller.selectCard(current.id);
                    }
                  }}
                  onPointerUp={(event) => {
                    if (cardDrag && !mulligan) {
                      cardDrag
                        .getCardBindings(card.instanceId)
                        .onPointerUp(event);
                      return;
                    }
                    if (event.pointerType === "touch") return;
                    const current = drag.current;
                    drag.current = null;
                    if (!current?.active) return;
                    suppressClick.current = true;
                    const target = dropTarget(event.clientX, event.clientY);
                    if (target && !disabled) {
                      void controller.selectTarget(target);
                      return;
                    }
                    controller.cancelSelection();
                  }}
                  onLostPointerCapture={(event) =>
                    cardDrag
                      ?.getCardBindings(card.instanceId)
                      .onLostPointerCapture(event)
                  }
                  onPointerCancel={(event) => {
                    if (cardDrag && !mulligan) {
                      cardDrag
                        .getCardBindings(card.instanceId)
                        .onPointerCancel(event);
                      return;
                    }
                    if (event.pointerType === "touch") return;
                    drag.current = null;
                    controller.cancelSelection();
                  }}
                >
                  <span className="sr-only">
                    {!mulligan && (playable ? "Playable." : "Details.")}
                  </span>
                  <span className="hand-card-fan">
                    <span className="hand-card-lift">
                      <CardVisual definition={def} surface="hand" />
                    </span>
                  </span>
                  {mulligan && <span>{selected ? "Replace" : "Keep"}</span>}
                </button>
              </div>
            );
          })}
        </div>
        {!view.self.hand.length && (
          <p className="muted">
            Your hand is empty. You can still inspect the board and end the
            phase.
          </p>
        )}
      </section>
      <details className="hand-list">
        <summary>Hand as a list</summary>
        <ul>
          {view.self.hand.map((card) => {
            const def = catalog.cards.find(
              (item) => item.id === card.definitionId,
            )!;
            return (
              <li key={card.instanceId}>
                <button
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    document
                      .querySelector<HTMLElement>(
                        `[data-card-id="${CSS.escape(card.instanceId)}"]`,
                      )
                      ?.focus();
                    cardDrag?.cancel();
                    if (mulligan) onMulligan(card.instanceId);
                    else controller.selectCard(card.instanceId);
                  }}
                >
                  {contentName(def.id)} · {def.cost} energy
                </button>
                <p>{contentText(def.id)}</p>
              </li>
            );
          })}
        </ul>
      </details>
    </>
  );
}
