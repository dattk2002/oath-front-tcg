import { ArenaDecor } from "./ArenaDecor";
import { arenaForView } from "./rendering/arena";
import { contentName, contentText } from "../../content/english-content";
import { groupArrows } from "./keyboard";
import type {
  PlayerAction,
  PlayerView,
  PublicCatalog,
  Target,
  UnitView,
} from "@oathfront/contracts";
import { targetFor, targetEqual } from "./intent-controller";
import { sideLabel, unitStatuses } from "./labels";
import ArtImage from "./ArtImage";
export { groupArrows } from "./keyboard";
export function targetMatches(
  legal: Target,
  target: Target,
  selectedUnit: string | null,
): boolean {
  if (legal.kind === "UNIT_AND_LANE")
    return selectedUnit
      ? target.kind === "LANE" &&
          legal.instanceId === selectedUnit &&
          legal.laneId === target.laneId
      : target.kind === "UNIT" && legal.instanceId === target.instanceId;
  return targetEqual(legal, target);
}
export default function Board({
  view,
  catalog,
  actions,
  selectedUnit,
  disabled,
  onTarget,
  onInspect,
  onPreview,
}: {
  view: PlayerView;
  catalog: PublicCatalog;
  actions: PlayerAction[];
  selectedUnit: string | null;
  disabled: boolean;
  onTarget: (target: Target) => void;
  onInspect: (unit: UnitView) => void;
  onPreview: (action: PlayerAction | null) => void;
}) {
  const arena = arenaForView(view);
  const enemy = view.self.side === "GOOD" ? "EVIL" : "GOOD";
  const legalAction = (target: Target) =>
    disabled
      ? undefined
      : actions.find((action) => {
          const legal = targetFor(action);
          return legal && targetMatches(legal, target, selectedUnit);
        });
  function unitButton(unit: UnitView | null, laneId: number, own: boolean) {
    if (!unit)
      return (
        <div
          className="empty-slot"
          data-slot-side={own ? view.self.side : enemy}
          data-slot-lane={laneId}
        >
          Empty slot · {sideLabel[own ? view.self.side : enemy]}
        </div>
      );
    const def = [...catalog.cards, ...catalog.tokens].find(
      (item) => item.id === unit.definitionId,
    )!;
    const target: Target = { kind: "UNIT", instanceId: unit.instanceId };
    const action = legalAction(target);
    return (
      <button
        className={`board-unit ${unit.owner.toLowerCase()}`}
        data-own-unit={own}
        data-unit-id={unit.instanceId}
        data-target={JSON.stringify(target)}
        data-legal-target={!!action}
        onFocus={() => onPreview(action ?? null)}
        onPointerEnter={() => onPreview(action ?? null)}
        onClick={() => (action ? onTarget(target) : onInspect(unit))}
      >
        <span className="sr-only">Lane {laneId}, </span>
        <span className="scene-art" aria-hidden="true">
          <ArtImage
            artKey={def.artKey}
            name={contentName(def.id)}
            variant="cutout"
            retry={false}
          />
        </span>
        <strong>{contentName(def.id)}</strong>
        <span className="unit-stats">
          <span>
            <b>{unit.current.attack}</b> ATK
          </span>{" "}
          /{" "}
          <span>
            <b>{unit.current.hp}</b> HP
          </span>
        </span>
        <span className="sr-only">
          {sideLabel[unit.owner]} · {action ? "legal target" : "details"} ·{" "}
          {unitStatuses(unit).join(" · ")}
        </span>
        {unit.isToken && <span>Summoned</span>}
        <span
          className="status-text"
          aria-hidden="true"
          data-has-status={unitStatuses(unit).length > 0}
        >
          {unitStatuses(unit).slice(0, 3).join(" · ") || "No statuses"}
          {unitStatuses(unit).length > 3
            ? ` · +${unitStatuses(unit).length - 3} statuses`
            : ""}
        </span>
      </button>
    );
  }
  return (
    <section
      aria-label="Five-lane board"
      className="board"
      data-arena={arena.key}
      onKeyDown={groupArrows}
    >
      <ArenaDecor arena={arena} paused={view.lifecycle !== "ACTIVE"} />
      <ol className="lanes">
        {view.board.map((lane) => {
          const target: Target = { kind: "LANE", laneId: lane.laneId };
          const action = legalAction(target);
          const location =
            lane.location.state === "REVEALED"
              ? catalog.locations.find(
                  (item) =>
                    item.id ===
                    (lane.location.state === "REVEALED"
                      ? lane.location.definitionId
                      : ""),
                )
              : null;
          return (
            <li
              className={`lane ${lane.location.state.toLowerCase()}`}
              key={lane.laneId}
            >
              <h2>Lane {lane.laneId}</h2>
              {unitButton(
                enemy === "GOOD" ? lane.good : lane.evil,
                lane.laneId,
                false,
              )}
              <div className="terrain" data-terrain-lane={lane.laneId}>
                {lane.location.state === "HIDDEN" ? (
                  <>
                    <strong>? · Hidden location</strong>
                    <span>Reveals on turn {lane.location.revealTurn}</span>
                  </>
                ) : location ? (
                  <details>
                    <summary>{contentName(location.id)}</summary>
                    <span className="terrain-art">
                      <ArtImage
                        artKey={location.artKey}
                        name={contentName(location.id)}
                        variant="strip"
                        retry={false}
                      />
                    </span>
                    <p>{contentText(location.id)}</p>
                  </details>
                ) : (
                  <>
                    <strong>Normal lane</strong>
                    <span>No effects</span>
                  </>
                )}
              </div>
              {unitButton(
                view.self.side === "GOOD" ? lane.good : lane.evil,
                lane.laneId,
                true,
              )}
              <button
                className="lane-target"
                data-lane-id={lane.laneId}
                data-tutorial-focus={view.tutorial?.focusTargets.some(
                  (t) => t.kind === "LANE" && t.laneId === lane.laneId,
                )}
                data-target={JSON.stringify(target)}
                data-legal-target={!!action}
                disabled={!action}
                onFocus={() => onPreview(action ?? null)}
                onPointerEnter={() => onPreview(action ?? null)}
                onClick={() => onTarget(target)}
                aria-label={`Choose lane ${lane.laneId}${action ? ", legal target" : ", unavailable"}`}
              >
                {action ? "Choose this lane" : `Lane ${lane.laneId}`}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
