import { useState } from "react";
import type {
  HeroDefinitionView,
  PublicCatalog,
  PowerDefinitionView,
} from "@oathfront/contracts/browser";
import { classLabel } from "../match/labels";
import ArtImage from "../match/ArtImage";
export const strategies: Record<string, string> = {
  H_G_BV: "Giữ quân bằng Khiên, hồi phục rồi giành bàn",
  H_G_BP: "Chặn nhịp đối thủ và giữ vị trí tốt",
  H_G_VP: "Tăng sức quân, đổi lane để mở đường",
  H_E_FX: "Gây damage, kết hợp Độc để bào mòn",
  H_E_FS: "Tấn công nhanh và tạo đòn Xuyên",
  H_E_XS: "Đổi vị trí, đặt Độc và duy trì lợi thế bài",
};
export const presetNames: Record<string, string> = {
  D_G_BV: "Vườn Thành Kiên Cường",
  D_G_BP: "Phòng Tuyến Pha Lê",
  D_G_VP: "Đường Mòn Sinh Trưởng",
  D_E_FX: "Tro Tàn Ăn Mòn",
  D_E_FS: "Đòn Đánh Chạng Vạng",
  D_E_XS: "Màn Sương Độc",
};
const targetNames = {
  NONE: "Không cần mục tiêu",
  UNIT: "Quân trên bàn",
  HERO_OR_UNIT: "Hero hoặc quân",
  LANE: "Lộ",
  UNIT_AND_LANE: "Quân và lộ đích",
};
const weaknesses: Record<string, string> = {
  H_G_BV: "Ít sát thương trực tiếp lên hero.",
  H_G_BP: "Cần giữ quân để tận dụng bảo vệ và vị trí.",
  H_G_VP: "Cần thời gian để tăng trưởng đội hình.",
  H_E_FX: "Cần phối hợp sát thương với Độc đúng lúc.",
  H_E_FS: "Cần giữ áp lực khi quân bị chặn.",
  H_E_XS: "Cần thời gian để duy trì Độc và lợi thế bài.",
};
export default function HeroInspect({
  hero,
  catalog,
}: {
  hero: HeroDefinitionView;
  catalog: PublicCatalog;
}) {
  const [power, setPower] = useState<PowerDefinitionView | null>(null);
  return (
    <aside className="panel hero-detail" aria-label="Chi tiết hero">
      <p className="eyebrow">
        {hero.faction === "GOOD" ? "Phe Thiện" : "Phe Ác"}
      </p>
      <h2>{hero.nameVi}</h2>
      <div className="hero-bust">
        <ArtImage artKey={hero.portraitKey} name={hero.nameVi} variant="bust" />
        <span className="hero-motif" aria-hidden="true">
          <ArtImage
            artKey={hero.portraitKey}
            name={hero.nameVi}
            variant="motif"
            retry={false}
          />
        </span>
      </div>
      <p>{hero.titleVi}</p>
      <p>{hero.classes.map((c) => classLabel[c]).join(" · ")}</p>
      <p>{strategies[hero.id]}</p>
      <p className="muted">20 HP · {weaknesses[hero.id]}</p>
      <h3>Bốn sức mạnh</h3>
      <div className="power-list">
        {hero.powerIds.map((id) => {
          const p = catalog.powers.find((p) => p.id === id)!;
          return (
            <button key={id} onClick={() => setPower(p)}>
              <span className="power-art">
                <ArtImage artKey={p.artKey} name={p.nameVi} retry={false} />
              </span>
              <strong>{p.nameVi}</strong>
              {id === hero.signaturePowerId && <span>Signature</span>}
              <span>Giá 1 · Mục tiêu: {targetNames[p.targetKind]}</span>
            </button>
          );
        })}
      </div>
      {power && hero.powerIds.includes(power.id) && (
        <section className="inspect-copy" aria-label="Chi tiết sức mạnh">
          <h3>{power.nameVi}</h3>
          <p>{power.exactTextVi}</p>
          <button onClick={() => setPower(null)}>Đóng chi tiết sức mạnh</button>
        </section>
      )}
    </aside>
  );
}
