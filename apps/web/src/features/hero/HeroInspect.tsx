import Link from "next/link";
import PowerIcon from "../content/PowerIcon";
import DetailDialog from "../content/DetailDialog";
import { SystemBadges, systemStrategy } from "../content/ContentBadges";
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
import ArtImage from "../match/ArtImage";
export const strategies: Record<string, string> = {
  H_G_SOL:
    "Protect a valuable unit, then move it away from unfavorable exchanges.",
  H_G_CAI:
    "Build a durable blocker and force the opponent to spend more than one card answering it.",
  H_G_ZEP:
    "Preserve a healthy unit and reposition it into an open attack lane.",
  H_G_MER:
    "Delay a large attacker while restoring resources and finding your next answer.",
  H_G_MOS:
    "Repair a damaged survivor before the next exchange and retain card advantage.",
  H_G_HAL: "Develop several lanes before using a formation-wide combat boost.",
  H_G_ROW:
    "Stabilize a losing board with a blocker while recovering hero health.",
  H_E_ROO:
    "Move a blocker out of the lane you want to attack, then finish a weakened target.",
  H_E_NYX: "Displace durable defenders and let Poison tax them across turns.",
  H_E_BRI:
    "Remove a medium defender while maintaining direct pressure on the enemy hero.",
  H_E_SAB:
    "Reduce an immediate attack and establish a longer attrition threat.",
  H_E_VAN:
    "Reposition a strong attacker; Pierce adds a separate full-ATK hero packet while that unit attacks a blocker.",
  H_E_GRA:
    "Add a body while removing fragile units or consuming enemy Shields.",
  H_E_SCO:
    "Trade against a small enemy while recovering health and maintaining hand size.",
  H_G_BV: "Protect units with Shield, heal, then take the board",
  H_G_BP: "Disrupt the opponent and hold strong positions",
  H_G_VP: "Grow your units and switch lanes to clear a path",
  H_E_FX: "Combine damage and Poison to wear down the enemy",
  H_E_FS: "Attack quickly and create piercing strikes",
  H_E_XS: "Reposition, Poison and maintain card advantage",
};
export const presetNames: Record<string, string> = {
  D_G_SOL: "Solenne \u00b7 Protective duelist",
  D_G_CAI: "Cairn \u00b7 Enduring defender",
  D_G_ZEP: "Zephyr \u00b7 Mobile tempo",
  D_G_MER: "Meridian \u00b7 Measured control",
  D_G_MOS: "Mossweld \u00b7 Field maintenance",
  D_G_HAL: "Halcyon \u00b7 Formation support",
  D_G_ROW: "Rowan \u00b7 Patient sustain",
  D_E_ROO: "Rook \u00b7 Tactical displacement",
  D_E_NYX: "Nyxara \u00b7 Positional attrition",
  D_E_BRI: "Brimstone \u00b7 Removal pressure",
  D_E_SAB: "Sable \u00b7 Suppressive control",
  D_E_VAN: "Vanta \u00b7 Mobile finisher",
  D_E_GRA: "Gravemarch \u00b7 Board attrition",
  D_E_SCO: "Scoria \u00b7 Resource attrition",
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
  H_G_SOL: "Hard removal and wide pressure punish investment in one unit.",
  H_G_CAI:
    "Movement and effects that destroy units directly bypass a defensive stat advantage.",
  H_G_ZEP:
    "Full allied boards restrict movement; Stun interrupts a planned attack.",
  H_G_MER:
    "Multiple threats outpace a single Stun; Stun does not remove blockers or triggers.",
  H_G_MOS:
    "Full-health targets waste the heal; direct destruction ignores repaired HP.",
  H_G_HAL: "Board wipes and thin allied boards reduce the signature's value.",
  H_G_ROW:
    "A full board prevents the summon; sustained pressure can overwhelm a small token.",
  H_E_ROO:
    "A full enemy board denies movement; Armor and Shield reduce the follow-up damage.",
  H_E_NYX:
    "Armor and Shield can absorb Poison packets; full lanes restrict her signature.",
  H_E_BRI:
    "Shield absorbs a damage packet; efficient healing can offset the hero damage.",
  H_E_SAB:
    "ATK penalties do not stop triggered abilities; Poison does not stack.",
  H_E_VAN:
    "Stun or removal before attack declaration stops the strike; reducing the attacker\u2019s ATK reduces both packets. A durable blocker does not absorb Pierce\u2019s hero packet.",
  H_E_GRA:
    "Armor can negate the sweep, and a full allied board blocks the signature.",
  H_E_SCO:
    "Shield and Armor weaken removal; wide boards demand more than one answer.",
  H_G_BV: "Limited direct hero damage.",
  H_G_BP: "Keep units alive to benefit from protection and positioning.",
  H_G_VP: "Needs time to grow the board.",
  H_E_FX: "Time damage and Poison together.",
  H_E_FS: "Keep pressure when your units are blocked.",
  H_E_XS: "Needs time to sustain Poison and card advantage.",
};
const elementsWeaknesses: Record<string, string> = {
  H_G_BV:
    "Limited direct hero damage; removal can undo investment in a single defender.",
  H_G_BP:
    "Repairs need surviving units; wide pressure can outpace a single combat boost.",
  H_G_VP:
    "Movement needs empty lanes; healing alone cannot remove an opposing threat.",
  H_E_FX:
    "Shield and Armor protect survivors, but direct destruction bypasses them.",
  H_E_FS:
    "Full boards restrict movement; durable blockers can slow the attack plan.",
  H_E_XS:
    "Poison needs time, and card draw does not immediately contest the board.",
};
export default function HeroInspect({
  hero,
  catalog,
  onPlay,
}: {
  hero: HeroDefinitionView;
  catalog: PublicCatalog;
  onPlay: () => void;
}) {
  const [power, setPower] = useState<PowerDefinitionView | null>(null);
  const [notes, setNotes] = useState(false);
  const strategy = systemStrategy(hero) || strategies[hero.id];
  const weakness =
    catalog.version === "elements_v1"
      ? (elementsWeaknesses[hero.id] ?? weaknesses[hero.id])
      : weaknesses[hero.id];
  return (
    <aside
      className={`panel hero-detail ${hero.faction.toLowerCase()}`}
      aria-label="Hero details"
      data-hero-stage={hero.id}
    >
      <div className="hero-stage-main">
        <div className="hero-stage-copy">
          <p className="eyebrow">
            {hero.faction === "GOOD" ? "Dawnward" : "Ashen Court"}
          </p>
          <h2
            data-hero-name
            className={contentName(hero.id).length > 9 ? "long-name" : ""}
          >
            {contentName(hero.id)}
          </h2>
          <p className="hero-title">{heroTitle(hero.id)}</p>
          <div className="hero-classes">
            <SystemBadges systems={hero.classes} />
          </div>
          <p className="hero-strategy">{strategy}</p>
          <p className="hero-health">
            <strong>20</strong>
            <span>
              <span className="hp-prefix">starting </span>HP
            </span>
            <button className="hero-notes" onClick={() => setNotes(true)}>
              Playstyle & counters ↗
            </button>
          </p>
          <div className="hero-stage-actions">
            <button className="primary hero-play" onClick={onPlay}>
              Play <span aria-hidden="true">↗</span>
            </button>
            <Link href={`/heroes/${hero.id}/decks`}>Browse decks</Link>
          </div>
          <span className="hero-preset-note">
            Start with a ready-to-play 30-card deck
          </span>
        </div>
        <div className="hero-bust" data-hero-art>
          <ArtImage
            artKey={hero.portraitKey}
            name={contentName(hero.id)}
            variant="bust"
            eager
          />
        </div>
      </div>
      <div className="hero-powers">
        <h3>
          Four powers <span>Inspect a power to learn its effect</span>
        </h3>
        <div className="power-list">
          {hero.powerIds.map((id) => {
            const p = catalog.powers.find((p) => p.id === id)!;
            const signature = id === hero.signaturePowerId;
            return (
              <button
                key={id}
                onClick={() => setPower(p)}
                className={signature ? "signature-power" : ""}
              >
                <span className="power-art">
                  <PowerIcon power={p} signature={signature} />
                </span>
                <strong>{contentName(p.id)}</strong>
                <span className="power-target">
                  {signature ? "Signature · " : ""}1 energy ·{" "}
                  {targetNames[p.targetKind]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {power && (
        <DetailDialog
          title={contentName(power.id)}
          label="Power details"
          onClose={() => setPower(null)}
        >
          <p className="detail-kicker">
            {power.id === hero.signaturePowerId
              ? "Signature power"
              : "Superpower"}{" "}
            · 1 energy
          </p>
          <p>{contentText(power.id)}</p>
          <p className="muted">Target: {targetNames[power.targetKind]}</p>
        </DetailDialog>
      )}
      {notes && (
        <DetailDialog
          title={`${contentName(hero.id)} · Playstyle`}
          label="Hero strategy"
          onClose={() => setNotes(false)}
        >
          <h3>Game plan</h3>
          <p>{strategy}</p>
          <h3>Watch for</h3>
          <p>{weakness}</p>
        </DetailDialog>
      )}
    </aside>
  );
}
