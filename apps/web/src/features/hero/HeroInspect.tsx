import {
  contentName,
  heroTitle,
  contentText,
} from "../../content/english-content";
import { useState } from "react";
import type {
  HeroDefinitionView,
  PublicCatalog,
  PowerDefinitionView,
} from "@oathfront/contracts/browser";
import { classLabel } from "../match/labels";
import ArtImage from "../match/ArtImage";
export const strategies: Record<string, string> = {
  H_G_BV: "Protect units with Shield, heal, then take the board",
  H_G_BP: "Disrupt the opponent and hold strong positions",
  H_G_VP: "Grow your units and switch lanes to clear a path",
  H_E_FX: "Combine damage and Poison to wear down the enemy",
  H_E_FS: "Attack quickly and create piercing strikes",
  H_E_XS: "Reposition, Poison and maintain card advantage",
};
export const presetNames: Record<string, string> = {
  D_G_BV: "Resilient Garden",
  D_G_BP: "Crystal Defense",
  D_G_VP: "Growing Paths",
  D_E_FX: "Corrosive Ash",
  D_E_FS: "Dusk Assault",
  D_E_XS: "Venom Mist",
};
const targetNames = {
  NONE: "No target needed",
  UNIT: "Unit on the board",
  HERO_OR_UNIT: "Hero or unit",
  LANE: "Lane",
  UNIT_AND_LANE: "Unit and destination lane",
};
const weaknesses: Record<string, string> = {
  H_G_BV: "Limited direct hero damage.",
  H_G_BP: "Keep units alive to benefit from protection and positioning.",
  H_G_VP: "Needs time to grow the board.",
  H_E_FX: "Time damage and Poison together.",
  H_E_FS: "Keep pressure when your units are blocked.",
  H_E_XS: "Needs time to sustain Poison and card advantage.",
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
    <aside className="panel hero-detail" aria-label="Hero details">
      <p className="eyebrow">
        {hero.faction === "GOOD" ? "Dawnward" : "Ashen Court"}
      </p>
      <h2>{contentName(hero.id)}</h2>
      <div className="hero-bust">
        <ArtImage
          artKey={hero.portraitKey}
          name={contentName(hero.id)}
          variant="bust"
        />
        <span className="hero-motif" aria-hidden="true">
          <ArtImage
            artKey={hero.portraitKey}
            name={contentName(hero.id)}
            variant="motif"
            retry={false}
          />
        </span>
      </div>
      <p>{heroTitle(hero.id)}</p>
      <p>{hero.classes.map((c) => classLabel[c]).join(" · ")}</p>
      <p>{strategies[hero.id]}</p>
      <p className="muted">20 HP · {weaknesses[hero.id]}</p>
      <h3>Four powers</h3>
      <div className="power-list">
        {hero.powerIds.map((id) => {
          const p = catalog.powers.find((p) => p.id === id)!;
          return (
            <button key={id} onClick={() => setPower(p)}>
              <span className="power-art">
                <ArtImage
                  artKey={p.artKey}
                  name={contentName(p.id)}
                  retry={false}
                />
              </span>
              <strong>{contentName(p.id)}</strong>
              {id === hero.signaturePowerId && <span>Signature</span>}
              <span>Cost 1 · Target: {targetNames[p.targetKind]}</span>
            </button>
          );
        })}
      </div>
      {power && hero.powerIds.includes(power.id) && (
        <section className="inspect-copy" aria-label="Power details">
          <h3>{contentName(power.id)}</h3>
          <p>{contentText(power.id)}</p>
          <button onClick={() => setPower(null)}>Close power details</button>
        </section>
      )}
    </aside>
  );
}
