import { gsap } from "gsap";
import type { VisibleEvent } from "@oathfront/contracts";
import type { BattleScene, Cue } from "../rendering/scene";
export interface EventContext {
  ownSide?: "GOOD" | "EVIL" | undefined;
  unitCardIds?: ReadonlySet<string> | undefined;
}
export function eventDuration(
  event: VisibleEvent,
  reduced: boolean,
  context: EventContext = {},
): number {
  switch (event.kind) {
    case "CardDrawn":
      return reduced ? 0.06 : 0.22;
    case "HandCountChanged":
      return event.payload.side === context.ownSide ? 0 : reduced ? 0.06 : 0.22;
    case "UnitCreated":
      return reduced ? 0.08 : 0.3;
    case "CardPlayed":
      return context.unitCardIds?.has(event.payload.definitionId)
        ? 0
        : reduced
          ? 0.04
          : 0.1;
    case "UnitMoved":
      return reduced ? 0.08 : 0.3;
    case "AttackDeclared":
      return reduced ? 0.04 : 0.18;
    case "DamageBatchResolved":
      return reduced
        ? 0.06
        : event.payload.packets.some((packet) => packet.damageType === "COMBAT")
          ? 0.3
          : 0.2;
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
          : 0.1;
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
  context: EventContext = {},
) {
  const duration = eventDuration(event, reduced, context);
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
  // One reversible tween per live card: replacing tweens retained every old tween
  // in GSAP's parent context until scene teardown.
  const cards = new Map<
    HTMLElement,
    { context: gsap.Context; tween: gsap.core.Tween }
  >();
  function animate(event: Event, lifted: boolean) {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest<HTMLElement>(".hand-card");
    if (!card || !root.contains(card)) return;
    if (
      event instanceof MouseEvent &&
      event.relatedTarget instanceof Node &&
      card.contains(event.relatedTarget)
    )
      return;
    let owner = cards.get(card);
    if (!owner) {
      let tween!: gsap.core.Tween;
      const context = gsap.context(() => {
        tween = gsap.to(card, {
          y: -6,
          duration: 0.12,
          ease: "power2.out",
          paused: true,
        });
      }, root);
      owner = { context, tween };
      cards.set(card, owner);
    }
    if (reduced()) owner.tween.pause(0);
    else if (lifted) owner.tween.play();
    else owner.tween.reverse();
  }
  const enter = (event: Event) => animate(event, true);
  const leave = (event: Event) => animate(event, false);
  const observer = new MutationObserver(() => {
    for (const [card, owner] of cards)
      if (!root.contains(card)) {
        owner.context.revert();
        cards.delete(card);
      }
  });
  observer.observe(root, { childList: true, subtree: true });
  root.addEventListener("pointerover", enter);
  root.addEventListener("focusin", enter);
  root.addEventListener("pointerout", leave);
  root.addEventListener("focusout", leave);
  return () => {
    observer.disconnect();
    root.removeEventListener("pointerover", enter);
    root.removeEventListener("focusin", enter);
    root.removeEventListener("pointerout", leave);
    root.removeEventListener("focusout", leave);
    cards.forEach((owner) => owner.context.revert());
    cards.clear();
  };
}
