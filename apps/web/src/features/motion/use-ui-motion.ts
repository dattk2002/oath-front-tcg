import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { useSettings } from "../settings/SettingsDialog";
import { observeReducedMotion } from "../match/motion/reduced-motion";

type Reveal = "home" | "hero" | "panel" | "phase";
/** An interrupted reveal always restores its DOM, never owns focus or input. */
export function useUiMotion(
  ref: RefObject<HTMLElement | null>,
  kind: Reveal,
  identity: string | number = "",
  enabled = true,
) {
  const { settings } = useSettings();
  useEffect(() => {
    if (!ref.current || !enabled) return;
    const root: HTMLElement = ref.current;
    let context: gsap.Context | undefined;
    let pendingImage: HTMLImageElement | null = null;
    let revealArt = () => {};
    const removeArtListeners = () => {
      pendingImage?.removeEventListener("load", artReady);
      pendingImage?.removeEventListener("error", artReady);
    };
    function artReady() {
      removeArtListeners();
      // Decode may resolve after selection/reduction/unmount; the old owner is then gone.
      const ready = pendingImage?.naturalWidth
        ? pendingImage.decode().catch(() => {})
        : Promise.resolve();
      void ready.then(() => context?.add(revealArt));
    }
    const settle = () => {
      removeArtListeners();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      context?.revert();
      context = undefined;
    };
    const os = observeReducedMotion(settle);
    const moves: { x: gsap.QuickToFunc; y: gsap.QuickToFunc; depth: number }[] =
      [];
    function move(event: PointerEvent) {
      if (document.hidden || os.matches() || event.pointerType !== "mouse")
        return;
      const rect = root.getBoundingClientRect();
      for (const layer of moves) {
        layer.x(((event.clientX - rect.left) / rect.width - 0.5) * layer.depth);
        layer.y(((event.clientY - rect.top) / rect.height - 0.5) * layer.depth);
      }
    }
    function leave() {
      for (const layer of moves) {
        layer.x(0);
        layer.y(0);
      }
    }
    const hidden = () => {
      if (document.hidden) settle();
    };
    if (!settings.reducedMotion && !os.matches() && !document.hidden) {
      context = gsap.context(() => {
        const makeTimeline = () =>
          gsap.timeline({
            defaults: { ease: "power2.out", clearProps: "transform,opacity" },
          });
        if (kind === "home") {
          const timeline = makeTimeline();
          timeline.fromTo(
            root.querySelectorAll(
              "[data-home-headline], .home-copy > p, .home-copy > button",
            ),
            { x: -20, y: 10, opacity: 0.75 },
            { x: 0, y: 0, opacity: 1, duration: 0.3, stagger: 0.025 },
            0,
          );
          timeline.fromTo(
            root.querySelectorAll("[data-home-art] .home-hero"),
            { x: 36, y: 18, opacity: 0.45 },
            { x: 0, y: 0, opacity: 1, duration: 0.48 },
            0,
          );
          if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
            root
              .querySelectorAll(".home-hero .asset-image")
              .forEach((layer, index) => {
                moves.push({
                  x: gsap.quickTo(layer, "x", {
                    duration: 0.24,
                    ease: "power2.out",
                  }),
                  y: gsap.quickTo(layer, "y", {
                    duration: 0.24,
                    ease: "power2.out",
                  }),
                  depth: index ? 10 : -6,
                });
              });
          }
        } else if (kind === "hero") {
          revealArt = () => {
            const reveal = makeTimeline();
            reveal.fromTo(
              root.querySelectorAll(
                "[data-hero-art] .asset-image, [data-hero-art] .art-fallback, [data-hero-name]",
              ),
              { x: -16, y: 6, opacity: 0.65 },
              { x: 0, y: 0, opacity: 1, duration: 0.3 },
              0,
            );
            reveal.fromTo(
              root.querySelectorAll(".power-list > button"),
              { x: 10, opacity: 0.6 },
              { x: 0, opacity: 1, duration: 0.2, stagger: 0.025 },
              0.06,
            );
          };
          pendingImage = root.querySelector<HTMLImageElement>(
            "[data-hero-art] img",
          );
          if (pendingImage && !pendingImage.complete) {
            pendingImage.addEventListener("load", artReady, { once: true });
            pendingImage.addEventListener("error", artReady, { once: true });
          } else if (pendingImage) artReady();
          else revealArt();
        } else {
          makeTimeline().fromTo(
            root,
            {
              x: kind === "phase" ? -8 : 12,
              y: kind === "phase" ? 0 : 8,
              opacity: 0.65,
            },
            {
              x: 0,
              y: 0,
              opacity: 1,
              duration: kind === "phase" ? 0.18 : 0.24,
            },
          );
        }
      }, root);
      if (moves.length) {
        root.addEventListener("pointermove", move);
        root.addEventListener("pointerleave", leave);
      }
    }
    document.addEventListener("visibilitychange", hidden);
    return () => {
      settle();
      os.dispose();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [ref, kind, identity, enabled, settings.reducedMotion]);
}
