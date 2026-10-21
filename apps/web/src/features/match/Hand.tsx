import { contentName, contentText } from "../../content/english-content";
import { useRef } from "react";
import type { PlayerView, PublicCatalog } from "@oathfront/contracts";
import { crossedDragThreshold, dropTarget } from "./drag";
import type { IntentController } from "./intent-controller";
import { groupArrows } from "./keyboard";
import ArtImage from "./ArtImage";
export default function Hand({
  view,
  catalog,
  controller,
  selectedId,
  disabled,
  mulligan,
  onMulligan,
}: {
  view: PlayerView;
  catalog: PublicCatalog;
  controller: IntentController;
  selectedId: string | null;
  disabled: boolean;
  mulligan: readonly string[] | null;
  onMulligan: (id: string) => void;
}) {
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
        <div className="hand" onKeyDown={groupArrows}>
          {view.self.hand.map((card) => {
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
            return (
              <button
                key={card.instanceId}
                className={`hand-card ${def.faction.toLowerCase()}`}
                data-card-id={card.instanceId}
                data-tutorial-focus={view.tutorial?.focusTargets.some(
                  (t) => t.kind === "CARD" && t.instanceId === card.instanceId,
                )}
                data-playable={playable && !disabled && !mulligan}
                data-playable-unit={
                  def.type === "UNIT" && playable && !disabled && !mulligan
                }
                aria-pressed={selected}

                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  if (mulligan) onMulligan(card.instanceId);
                  else controller.selectCard(card.instanceId);
                }}
                onPointerDown={(event) => {
                  if (disabled || mulligan) return;
                  drag.current = {
                    id: card.instanceId,
                    x: event.clientX,
                    y: event.clientY,
                    active: false,
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const current = drag.current;
                  if (!current || current.id !== card.instanceId) return;
                  if (
                    !current.active &&
                    crossedDragThreshold(current, event.clientX, event.clientY)
                  ) {
                    current.active = true;
                    controller.selectCard(current.id);
                  }
                }}
                onPointerUp={(event) => {
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
                onPointerCancel={() => {
                  drag.current = null;
                  controller.cancelSelection();
                }}
              >
                <span className="sr-only">
                  {!mulligan && (playable ? "Playable." : "Details.")}
                </span>
                <span className="card-cost">
                  {def.cost}
                  <span className="sr-only"> energy</span>
                </span>
                <strong>{contentName(def.id)}</strong>
                <span className="hand-art">
                  <ArtImage
                    artKey={def.artKey}
                    name={contentName(def.id)}
                    retry={false}
                  />
                </span>
                <span className="card-kind">
                  {def.type === "UNIT" ? "Unit" : "Trick"}
                </span>
                <span className="card-summary">
                  {def.printed
                    ? `${def.printed.attack} ATK / ${def.printed.hp} HP`
                    : "Select to read effects"}
                </span>
                {mulligan && <span>{selected ? "Replace" : "Keep"}</span>}
              </button>
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
