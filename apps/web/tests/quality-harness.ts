import { gsap } from "gsap";
import { bindCardFeedback } from "../src/features/match/motion/event-timeline.js";
const contexts: gsap.Context[] = [];
const original = gsap.context;
gsap.context = ((...args: Parameters<typeof original>) => {
  const context = original(...args);
  contexts.push(context);
  return context;
}) as typeof original;
const api = {
  async hover() {
    const root = document.querySelector<HTMLElement>("[data-battle-root]")!;
    const card = document.querySelector<HTMLElement>(".hand-card")!;
    const style = card.getAttribute("style");
    const dispose = bindCardFeedback(root, () => false);
    for (let i = 0; i < 200; i++) {
      card.dispatchEvent(
        new Event(i % 2 ? "focusout" : "focusin", { bubbles: true }),
      );
    }
    const retained = contexts.reduce((n, c) => n + c.getTweens().length, 0);
    dispose();
    return {
      retained,
      restored:
        style === card.getAttribute("style") ||
        (!style && card.getAttribute("style") === ""),
    };
  },
};
Object.assign(window, { qualityHarness: api });
export type QualityHarness = typeof api;
