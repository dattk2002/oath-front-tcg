import { useState } from "react";
import type {
  CommandResponse,
  CreateMatchRequest,
  HeroId,
  PublicCatalog,
} from "@oathfront/contracts";
import { restorePresetCreate } from "./pending-create";
import type { ApiClient } from "../match/api-client";
import { ApiError } from "../match/api-error";
import { classLabel, sideLabel } from "../match/labels";
const strategies: Record<HeroId, string> = {
  H_G_BV: "Giữ quân bằng Khiên, hồi phục rồi giành bàn.",
  H_G_BP: "Chặn nhịp đối thủ và giữ vị trí tốt.",
  H_G_VP: "Tăng sức quân, đổi lộ để mở đường.",
  H_E_FX: "Gây sát thương, kết hợp Độc để bào mòn.",
  H_E_FS: "Tấn công nhanh và tạo đòn Xuyên.",
  H_E_XS: "Đổi vị trí, đặt Độc và duy trì lợi thế bài.",
};
export default function PresetSetup({
  catalog,
  api,
  onCreated,
  onResume,
}: {
  catalog: PublicCatalog;
  api: ApiClient;
  onCreated: (response: CommandResponse) => void;
  onResume: (id: string) => void;
}) {
  const [restored] = useState(() =>
    typeof sessionStorage === "undefined"
      ? null
      : restorePresetCreate(catalog.presets, sessionStorage, catalog.version),
  );
  const original = restored?.request;
  const [pending, setPending] = useState<CreateMatchRequest | null>(
    original ?? null,
  );
  const [heroId, setHeroId] = useState<HeroId>(restored?.heroId ?? "H_G_BV");
  const [stage, setStage] = useState<"HERO" | "DECK" | "OPPONENT">(
    original ? "OPPONENT" : "HERO",
  );
  const [opponentId, setOpponentId] = useState<HeroId | null>(
    original?.mode === "SKIRMISH" ? original.opponentHeroId : null,
  );
  const [difficulty, setDifficulty] = useState<"EASY" | "NORMAL">(
    original?.mode === "SKIRMISH" ? original.difficulty : "EASY",
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(
      original
        ? "Có yêu cầu tạo trận chưa được xác nhận. Thử lại để kiểm tra cùng lựa chọn."
        : null,
    );
  const [conflict, setConflict] = useState<string | null>(null);
  const hero = catalog.heroes.find((item) => item.id === heroId)!;
  const preset = catalog.presets.find((item) => item.heroId === heroId)!;
  const opponents = catalog.heroes.filter(
    (item) => item.faction !== hero.faction,
  );
  const opponent =
    opponents.find((item) => item.id === opponentId) ?? opponents[0]!;
  async function create() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    let body = pending;
    body ??= {
      commandId: crypto.randomUUID(),
      mode: "SKIRMISH",
      deck: { kind: "PRESET", presetId: preset.presetId },
      opponentHeroId: opponent.id,
      difficulty,
      expectedContentVersion: catalog.version,
    };
    setPending(body);
    sessionStorage.setItem("oathfront.create", JSON.stringify(body));
    try {
      const response = await api.createMatch(body);
      sessionStorage.removeItem("oathfront.create");
      onCreated(response);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "ACTIVE_MATCH_EXISTS"
      ) {
        setConflict(error.body.error.details.matchId);
        sessionStorage.removeItem("oathfront.create");
        setPending(null);
        setMessage("Bạn có một trận đang diễn ra. Tiếp tục trận đó trước.");
      } else if (error instanceof ApiError && error.status < 500) {
        sessionStorage.removeItem("oathfront.create");
        setPending(null);
        setStage("HERO");
        setMessage(
          "Yêu cầu chưa được chấp nhận. Hãy xem lại hero và bộ bài trước khi tạo trận mới.",
        );
      } else
        setMessage(
          "Chưa xác định kết quả tạo trận. Thử lại sẽ dùng cùng yêu cầu.",
        );
    } finally {
      setBusy(false);
    }
  }
  const pendingPresetId =
    pending?.mode === "SKIRMISH" && pending.deck.kind === "PRESET"
      ? pending.deck.presetId
      : null;
  const pendingVersion =
    pending?.mode === "SKIRMISH" ? pending.expectedContentVersion : null;
  if (
    pending &&
    (pendingVersion !== catalog.version ||
      !catalog.presets.some(
        (item) =>
          item.presetId === pendingPresetId &&
          item.contentVersion === pendingVersion,
      ) ||
      (pending.mode === "SKIRMISH" &&
        !opponents.some((item) => item.id === pending.opponentHeroId)))
  )
    return (
      <section className="status-panel panel" role="alert">
        <h1>Cần khôi phục yêu cầu tạo trận</h1>
        <p>
          Bộ bài hoặc phiên bản đã lưu không có trong dữ liệu hiện tại. Yêu cầu
          gốc vẫn được giữ nguyên; chưa có lựa chọn nào được thay thế.
        </p>
        <p>
          Thử lại để kiểm tra kết quả đã ghi nhận, hoặc về trang chủ để tiếp tục
          trận đang có.
        </p>
        {message && <p>{message}</p>}
        <button
          className="primary"
          disabled={busy}
          onClick={() => void create()}
        >
          {busy ? "Đang kiểm tra…" : "Thử lại yêu cầu tạo trận"}
        </button>
      </section>
    );
  return (
    <section className="setup" aria-labelledby="setup-title">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Chơi với bot</p>
          <h1 id="setup-title">
            {stage === "HERO"
              ? "Chọn người dẫn lối"
              : stage === "DECK"
                ? "Bộ bài của bạn"
                : "Chọn đối thủ"}
          </h1>
        </div>
        <p className="muted">
          {stage === "HERO"
            ? "Sáu hero · Tất cả đều sẵn sàng"
            : `${hero.nameVi} · Phe ${sideLabel[hero.faction]}`}
        </p>
      </div>
      {stage === "HERO" ? (
        <div className="hero-selection">
          <fieldset className="hero-grid">
            <legend className="sr-only">Chọn hero</legend>
            {catalog.heroes.map((item) => (
              <label
                className={`hero-tile ${item.faction.toLowerCase()}`}
                key={item.id}
              >
                <input
                  type="radio"
                  name="hero"
                  value={item.id}
                  checked={heroId === item.id}
                  onChange={() => setHeroId(item.id)}
                />
                <span className="silhouette" aria-hidden="true" />
                <span className="eyebrow">Phe {sideLabel[item.faction]}</span>
                <strong>{item.nameVi}</strong>
                <span>
                  {item.classes.map((id) => classLabel[id]).join(" + ")}
                </span>
                <span className="muted">{strategies[item.id]}</span>
                <span className="selection-label">
                  {heroId === item.id ? "Đã chọn" : "Chọn hero"}
                </span>
              </label>
            ))}
          </fieldset>
          <aside className={`hero-detail panel ${hero.faction.toLowerCase()}`}>
            <p className="eyebrow">{hero.titleVi}</p>
            <h2>{hero.nameVi}</h2>
            <p>{strategies[hero.id]}</p>
            <h3>Bốn siêu năng lực</h3>
            <ul className="power-list">
              {hero.powerIds.map((id) => {
                const power = catalog.powers.find((item) => item.id === id)!;
                return (
                  <li key={id}>
                    <strong>{power.nameVi}</strong>
                    {power.signatureOwner && (
                      <span className="signature">Đặc trưng</span>
                    )}
                    <p>{power.exactTextVi}</p>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      ) : stage === "DECK" ? (
        <article className="preset panel">
          <p className="eyebrow">Bộ bài mẫu · Đề xuất</p>
          <h2>{preset.name}</h2>
          <p>{strategies[hero.id]}</p>
          <strong className="deck-count">30 / 30 lá</strong>
          <p className="muted">
            Mỗi lá tối đa hai bản ·{" "}
            {hero.classes.map((id) => classLabel[id]).join(" + ")}
          </p>
          <details>
            <summary>Danh sách 15 loại bài</summary>
            <ul className="deck-list">
              {preset.entries.map((entry) => (
                <li key={entry.cardId}>
                  <span>
                    {
                      catalog.cards.find((item) => item.id === entry.cardId)
                        ?.nameVi
                    }
                  </span>
                  <strong>×{entry.quantity}</strong>
                </li>
              ))}
            </ul>
          </details>
        </article>
      ) : (
        <section className="opponent panel">
          <fieldset disabled={busy || !!pending}>
            <legend>Đối thủ của {hero.nameVi}</legend>
            <label>
              Hero bot
              <select
                value={opponent.id}
                onChange={(event) => {
                  const selected = opponents.find(
                    (item) => item.id === event.target.value,
                  );
                  if (selected) setOpponentId(selected.id);
                }}
              >
                {opponents.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.nameVi} · Phe {sideLabel[item.faction]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Độ khó
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(
                    event.target.value === "NORMAL" ? "NORMAL" : "EASY",
                  )
                }
              >
                <option value="EASY">Dễ</option>
                <option value="NORMAL">Thường</option>
              </select>
            </label>
          </fieldset>
          <p>
            Trận đấu chỉ bắt đầu khi bạn xác nhận. Hai phe giữ thứ tự lộ 1 đến
            5.
          </p>
        </section>
      )}
      <p className="art-note">
        Hình khối minh họa tạm thời · Tranh hoàn thiện sẽ được bổ sung sau.
      </p>
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      <div className="screen-actions">
        {stage !== "HERO" && (
          <button
            disabled={busy || !!pending}
            onClick={() => setStage(stage === "DECK" ? "HERO" : "DECK")}
          >
            Quay lại
          </button>
        )}
        {conflict ? (
          <button className="primary" onClick={() => onResume(conflict)}>
            Tiếp tục trận
          </button>
        ) : (
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              if (stage === "HERO") setStage("DECK");
              else if (stage === "DECK") setStage("OPPONENT");
              else void create();
            }}
          >
            {stage === "HERO"
              ? "Chọn bộ bài"
              : stage === "DECK"
                ? "Dùng bộ bài này"
                : busy
                  ? "Đang tạo trận…"
                  : pending
                    ? "Thử lại tạo trận"
                    : "Bắt đầu trận"}
          </button>
        )}
      </div>
    </section>
  );
}
