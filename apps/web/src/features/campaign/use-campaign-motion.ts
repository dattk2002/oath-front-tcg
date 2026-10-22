import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import { useSettings } from "../settings/SettingsDialog";
import { observeReducedMotion } from "../match/motion/reduced-motion";

/** Presentation only: route changes and reduction restore the fully visible DOM. */
export function useCampaignMotion(
  ref: RefObject<HTMLElement | null>,
  identity: string,
  enabled: boolean,
) {
  const { settings } = useSettings();
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    let context: gsap.Context | undefined;
    const listeners: (() => void)[] = [];
    const settle = () => {
      listeners.splice(0).forEach((remove) => remove());
      context?.revert();
      context = undefined;
    };
    const os = observeReducedMotion(settle);
    const hidden = () => {
      if (document.hidden) settle();
    };
    if (!settings.reducedMotion && !os.matches() && !document.hidden) {
      context = gsap.context(() => {
        root
          .querySelectorAll<HTMLElement>("[data-home-reveal]")
          .forEach((section) => {
            gsap.fromTo(
              section,
              { y: 16, opacity: 0.75 },
              {
                y: 0,
                opacity: 1,
                duration: 0.4,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 90%",
                  once: true,
                },
                clearProps: "transform,opacity",
              },
            );
          });
        const reveals = root.querySelectorAll(
          "[data-campaign-reveal] > *, .campaign-editorial-detail > h1",
        );
        if (reveals.length)
          gsap.fromTo(
            reveals,
            { y: 10, opacity: 0.8 },
            {
              y: 0,
              opacity: 1,
              duration: 0.3,
              stagger: 0.025,
              ease: "power2.out",
              clearProps: "transform,opacity",
            },
          );
        const art = root.querySelector(".profile-portrait, .campaign-home-art");
        if (art)
          gsap.fromTo(
            art,
            { opacity: 0.65, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: 0.48,
              ease: "power2.out",
              clearProps: "transform,opacity",
            },
          );
        root
          .querySelectorAll<HTMLElement>(".campaign-hero-card, .editorial-card")
          .forEach((card) => {
            const target = card.querySelector(
              "[data-campaign-card-art], .editorial-cover, .home-featured-art, .home-story-art",
            );
            if (!target) return;
            const scaleX = gsap.quickTo(target, "scaleX", {
              duration: 0.16,
              ease: "power2.out",
            });
            const scaleY = gsap.quickTo(target, "scaleY", {
              duration: 0.16,
              ease: "power2.out",
            });
            let hovered = false;
            let focused = card.contains(document.activeElement);
            const update = () => {
              const value = hovered || focused ? 1.015 : 1;
              scaleX(value);
              scaleY(value);
            };
            const enter = (event: PointerEvent) => {
              if (event.pointerType === "mouse") {
                hovered = true;
                update();
              }
            };
            const leave = () => {
              hovered = false;
              update();
            };
            const focus = () => {
              focused = true;
              update();
            };
            const blur = (event: FocusEvent) => {
              focused =
                event.relatedTarget instanceof Node &&
                card.contains(event.relatedTarget);
              update();
            };
            card.addEventListener("pointerenter", enter);
            card.addEventListener("pointerleave", leave);
            card.addEventListener("focusin", focus);
            card.addEventListener("focusout", blur);
            if (focused) update();
            listeners.push(() => {
              card.removeEventListener("pointerenter", enter);
              card.removeEventListener("pointerleave", leave);
              card.removeEventListener("focusin", focus);
              card.removeEventListener("focusout", blur);
            });
          });
        const stage = root.querySelector<HTMLElement>(".campaign-home-stage");
        const image = stage?.querySelector(".campaign-home-art img");
        if (
          stage &&
          image &&
          matchMedia("(hover: hover) and (pointer: fine)").matches
        ) {
          gsap.set(image, { scale: 1.015 });
          const x = gsap.quickTo(image, "x", {
            duration: 0.24,
            ease: "power2.out",
          });
          const move = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            const bounds = stage.getBoundingClientRect();
            x(((event.clientX - bounds.left) / bounds.width - 0.5) * 6);
          };
          const leave = () => x(0);
          stage.addEventListener("pointermove", move);
          stage.addEventListener("pointerleave", leave);
          listeners.push(() => {
            stage.removeEventListener("pointermove", move);
            stage.removeEventListener("pointerleave", leave);
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
  }, [ref, identity, enabled, settings.reducedMotion]);
}
