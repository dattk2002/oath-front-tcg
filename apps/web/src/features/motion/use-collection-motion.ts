import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { useSettings } from "../settings/SettingsDialog";
import { observeReducedMotion } from "../match/motion/reduced-motion";

/** Bounded artwork tilt; the control and its hit area never move on hover. */
export function useCollectionMotion(
  ref: RefObject<HTMLElement | null>,
  identity: string | number,
) {
  const { settings } = useSettings();
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let context: gsap.Context | undefined;
    const listeners: (() => void)[] = [];
    function settle() {
      listeners.splice(0).forEach((remove) => remove());
      context?.revert();
      context = undefined;
    }
    const os = observeReducedMotion(settle);
    const hidden = () => {
      if (document.hidden) settle();
    };
    if (!settings.reducedMotion && !os.matches() && !document.hidden) {
      context = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>(root.children);
        gsap.fromTo(
          cards,
          { y: 10, opacity: 0.7 },
          {
            y: 0,
            opacity: 1,
            duration: 0.28,
            stagger: 0.025,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
        );
        if (matchMedia("(hover: hover) and (pointer: fine)").matches)
          for (const card of cards) {
            const art = card.querySelector(".asset-image");
            if (!art) continue;
            const tilt = gsap.quickTo(art, "rotation", {
              duration: 0.25,
              ease: "power2.out",
            });
            const scaleX = gsap.quickTo(art, "scaleX", {
              duration: 0.25,
              ease: "power2.out",
            });
            const scaleY = gsap.quickTo(art, "scaleY", {
              duration: 0.25,
              ease: "power2.out",
            });
            const move = (event: PointerEvent) => {
              if (
                event.pointerType !== "mouse" ||
                document.hidden ||
                os.matches()
              )
                return;
              const rect = card.getBoundingClientRect();
              tilt(((event.clientX - rect.left) / rect.width - 0.5) * 4);
              scaleX(1.035);
              scaleY(1.035);
            };
            const leave = () => {
              tilt(0);
              scaleX(1);
              scaleY(1);
            };
            card.addEventListener("pointermove", move);
            card.addEventListener("pointerleave", leave);
            listeners.push(() => {
              card.removeEventListener("pointermove", move);
              card.removeEventListener("pointerleave", leave);
            });
          }
      }, root);
    }
    document.addEventListener("visibilitychange", hidden);
    return () => {
      settle();
      os.dispose();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [ref, identity, settings.reducedMotion]);
}
