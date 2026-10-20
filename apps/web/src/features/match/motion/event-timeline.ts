import { gsap } from "gsap";
import type { VisibleEvent } from "@oathfront/contracts";
import type { BattleScene, Cue } from "../rendering/scene";
export function eventDuration(event: VisibleEvent, reduced: boolean): number {
  switch (event.kind) {
    case "CardDrawn":
    case "HandCountChanged":
      return reduced ? 0.06 : 0.22;
    case "UnitCreated":
      return reduced ? 0.08 : 0.3;
    case "CardPlayed":
      return event.payload.target.kind === "LANE" ? 0 : reduced ? 0.08 : 0.3;
    case "UnitMoved":
      return reduced ? 0.08 : 0.3;
    case "AttackDeclared":
      return reduced ? 0.04 : 0.18;
    case "DamageBatchResolved":
      return reduced ? 0.06 : 0.3;
    case "StatsChanged":
    case "StatusChanged":
      return reduced ? 0 : 0.15;
    case "UnitDestroyed":
      return reduced ? 0.06 : 0.18;
    case "LocationRevealed":
      return reduced ? 0.1 : 0.6;
    case "PowerUsed":
      return reduced
        ? 0.08
        : event.payload.definitionId.startsWith("S_")
          ? 0.55
          : 0.35;
    case "BlockOccurred":
      return reduced ? 0 : 0.25;
    case "HeroHealed":
      return reduced ? 0.06 : 0.25;
    case "MatchEnded":
      return reduced ? 0.12 : 0.6;
    default:
      return 0;
  }
}
/** Completion callbacks advance presentation only; no command transport is in this module. */
export function createEventTimeline(
  scene: BattleScene,
  event: VisibleEvent,
  reduced: boolean,
  commit: () => void,
  done: () => void,
) {
  const duration = eventDuration(event, reduced);
  const cue: Cue = { progress: 0, alpha: 1, evil: 0, good: 0, reduced };
  const timeline = gsap.timeline({ paused: true, onComplete: done });
  timeline.to(
    cue,
    {
      progress: 1,
      duration,
      ease: "power1.inOut",
      onUpdate: () => scene.present(event, cue),
    },
    0,
  );
  if (event.kind === "AttackDeclared" && !reduced) {
    timeline.to(cue, { evil: 1, duration: 0.1, ease: "power2.out" }, 0);
    timeline.to(cue, { good: 1, duration: 0.1, ease: "power2.out" }, 0.08);
  }
  const beat = event.kind === "DamageBatchResolved" ? duration * 0.4 : duration;
  timeline.call(commit, [], beat);
  if (duration > 0)
    timeline.to(
      cue,
      { alpha: 0, duration: duration * 0.35, ease: "none" },
      duration * 0.65,
    );
  return timeline;
}

export function bindCardFeedback(root: HTMLElement, reduced: () => boolean) {
  const context = gsap.context(() => {}, root);
  const enter = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const card = target.closest<HTMLElement>(".hand-card");
    if (!card) return;
    gsap.killTweensOf(card);
    context.add(() =>
      gsap.to(card, {
        y: reduced() ? 0 : -6,
        duration: reduced() ? 0 : 0.12,
        ease: "power2.out",
      }),
    );
  };
  const leave = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const card = target.closest<HTMLElement>(".hand-card");
    if (!card) return;
    if (
      event instanceof MouseEvent &&
      event.relatedTarget instanceof Node &&
      card.contains(event.relatedTarget)
    )
      return;
    gsap.killTweensOf(card);
    context.add(() =>
      gsap.to(card, {
        y: 0,
        duration: reduced() ? 0 : 0.1,
        ease: "power2.out",
      }),
    );
  };
  root.addEventListener("pointerover", enter);
  root.addEventListener("focusin", enter);
  root.addEventListener("pointerout", leave);
  root.addEventListener("focusout", leave);
  return () => {
    root.removeEventListener("pointerover", enter);
    root.removeEventListener("focusin", enter);
    root.removeEventListener("pointerout", leave);
    root.removeEventListener("focusout", leave);
    context.revert();
  };
}
