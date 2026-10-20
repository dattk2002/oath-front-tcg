import type {
  PlayerAction,
  PlayerView,
  PublicCatalog,
  UnitView,
} from "@oathfront/contracts";
import { previewPublicAction } from "@oathfront/game-engine/preview";
import { keywordLabel, unitStatuses } from "./labels";
import ArtImage from "./ArtImage";
const unknownLabel = {
  DRAW: "Bài rút chưa biết",
  POWER_GRANT: "Power cấp ngẫu nhiên",
  HIDDEN_LOCATION: "Địa hình còn ẩn",
  TRIGGER_HISTORY: "Lịch sử kích hoạt chưa biết",
  OPPONENT_RESPONSE: "Phản hồi của đối phương",
  MULLIGAN: "Bài đổi chưa biết",
};
export default function InspectPanel({
  view,
  catalog,
  selectedId,
  unit,
  action,
  onCancel,
  onConfirm,
}: {
  view: PlayerView;
  catalog: PublicCatalog;
  selectedId: string | null;
  unit: UnitView | null;
  action: PlayerAction | null;
  onCancel: () => void;
  onConfirm: (action: PlayerAction) => void;
}) {
  const selected = [...view.self.hand, ...view.self.reserve].find(
    (item) => item.instanceId === selectedId,
  );
  const definitionId = selected?.definitionId ?? unit?.definitionId;
  const def = [...catalog.cards, ...catalog.powers, ...catalog.tokens].find(
    (item) => item.id === definitionId,
  );
  const preview = action ? previewPublicAction(view, action) : null;
  return (
    <aside className="inspect panel" aria-label="Chi tiết lựa chọn">
      <h2>{def?.nameVi ?? "Đọc bàn, chọn thời điểm"}</h2>
      {def ? (
        <>
          <p className="eyebrow">
            {"cost" in def
              ? `${def.cost} năng lượng`
              : "normalCost" in (selected ?? {})
                ? "Power · 1 năng lượng"
                : "Quân triệu hồi"}
          </p>
          <div className="inspect-art">
            <ArtImage artKey={def.artKey} name={def.nameVi} variant="inspect" />
          </div>
          <p>
            {"exactTextVi" in def
              ? def.exactTextVi
              : "Quân được triệu hồi trên bàn."}
          </p>
          {"keywords" in def && (
            <p>{def.keywords.map((key) => keywordLabel[key]).join(" · ")}</p>
          )}
          {unit && (
            <>
              <p>
                Chỉ số gốc: {unit.printed.attack} công / {unit.printed.hp} HP
              </p>
              <p>
                Hiện tại: {unit.current.attack} công / {unit.current.hp} HP
              </p>
              <p>{unitStatuses(unit).join(" · ")}</p>
              {unit.modifiers.length > 0 && (
                <details>
                  <summary>Nguồn thay đổi chỉ số</summary>
                  <ul>
                    {unit.modifiers.map((modifier, index) => (
                      <li key={index}>
                        {modifier.attackDelta >= 0 ? "+" : ""}
                        {modifier.attackDelta} công /{" "}
                        {modifier.healthDelta >= 0 ? "+" : ""}
                        {modifier.healthDelta} HP ·{" "}
                        {modifier.duration === "TURN_END"
                          ? "Hết lượt"
                          : "Vĩnh viễn"}{" "}
                        · {modifier.sourceDefinitionId}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </>
      ) : (
        <p className="muted">
          Chọn bài để đọc đầy đủ hiệu ứng. Chọn quân trên bàn để xem chỉ số và
          trạng thái.
        </p>
      )}
      {preview && preview.forecast !== "NONE" ? (
        <section className="forecast" aria-label="Dự kiến công khai">
          <h3>Dự kiến theo bàn hiện tại</h3>
          <p>
            {action?.kind === "PLAY_UNIT" ? `Lộ ${action.laneId} · ` : ""}Tốn{" "}
            {preview.energySpent} năng lượng
          </p>
          <p>
            Sát thương hero địch: {preview.enemyHeroDamage}
            <br />
            Sát thương hero bạn: {preview.ownHeroDamage}
          </p>
          {preview.uncertainty && (
            <p className="notice">
              Chưa chắc chắn:{" "}
              {preview.unknowns.map((key) => unknownLabel[key]).join("; ")}.
            </p>
          )}
        </section>
      ) : (
        selected && (
          <p className="muted">
            Chọn hoặc đặt con trỏ vào mục tiêu hợp lệ để xem dự kiến.
          </p>
        )
      )}
      {action && "target" in action && action.target.kind === "NONE" && (
        <button className="primary" onClick={() => onConfirm(action)}>
          Xác nhận dùng bài
        </button>
      )}
      {(selected || unit) && (
        <button onClick={onCancel}>Hủy lựa chọn · Esc</button>
      )}
    </aside>
  );
}
