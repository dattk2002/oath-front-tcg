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
          Ô trống · {sideLabel[own ? view.self.side : enemy]}
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
        aria-label={`Lộ ${laneId}, ${def.nameVi}, phe ${sideLabel[unit.owner]}, ${unit.current.attack} công, ${unit.current.hp} HP${action ? ", mục tiêu hợp lệ" : ", xem chi tiết"}`}
      >
        <span className="scene-art" aria-hidden="true">
          <span className="unit-silhouette silhouette" />
        </span>
        <strong>{def.nameVi}</strong>
        <span className="unit-stats">
          {unit.current.attack} công / {unit.current.hp} HP
        </span>
        {unit.isToken && <span>Triệu hồi</span>}
        <span className="status-text">
          {unitStatuses(unit).slice(0, 3).join(" · ") || "Không có trạng thái"}
          {unitStatuses(unit).length > 3
            ? ` · +${unitStatuses(unit).length - 3} trạng thái`
            : ""}
        </span>
      </button>
    );
  }
  return (
    <section aria-label="Bàn năm lộ" className="board" onKeyDown={groupArrows}>
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
              <h2>Lộ {lane.laneId}</h2>
              {unitButton(
                enemy === "GOOD" ? lane.good : lane.evil,
                lane.laneId,
                false,
              )}
              <div className="terrain" data-terrain-lane={lane.laneId}>
                {lane.location.state === "HIDDEN" ? (
                  <>
                    <strong>? · Địa hình ẩn</strong>
                    <span>Mở lượt {lane.location.revealTurn}</span>
                  </>
                ) : location ? (
                  <details>
                    <summary>{location.nameVi}</summary>
                    <p>{location.exactTextVi}</p>
                  </details>
                ) : (
                  <>
                    <strong>Lộ thường</strong>
                    <span>Không hiệu ứng</span>
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
                data-target={JSON.stringify(target)}
                data-legal-target={!!action}
                disabled={!action}
                onFocus={() => onPreview(action ?? null)}
                onPointerEnter={() => onPreview(action ?? null)}
                onClick={() => onTarget(target)}
                aria-label={`Chọn lộ ${lane.laneId}${action ? ", mục tiêu hợp lệ" : ", chưa thể chọn"}`}
              >
                {action ? "Chọn lộ này" : "Lộ " + lane.laneId}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
