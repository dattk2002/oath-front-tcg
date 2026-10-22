import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useReducedMotion } from "../motion/use-reduced-motion";
import type { arenas } from "./rendering/arena";
export function ArenaDecor({
  arena,
  paused,
}: {
  arena: (typeof arenas)[number];
  paused: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !root.current) return;
    const media = matchMedia("(min-width: 1024px) and (min-height: 640px)");
    let motion: gsap.core.Tween | undefined;
    const context = gsap.context(() => {
      motion = gsap.to(root.current!.querySelectorAll(".arena-mote"), {
        y: -18,
        opacity: 0.5,
        duration: 5,
        stagger: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        paused: true,
      });
    }, root);
    const sync = () => {
      if (document.hidden || paused || !media.matches) motion?.pause();
      else motion?.resume();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    media.addEventListener("change", sync);
    return () => {
      context.revert();
      document.removeEventListener("visibilitychange", sync);
      media.removeEventListener("change", sync);
    };
  }, [arena.key, paused, reduced]);
  return (
    <div className="arena-decor" ref={root} aria-hidden="true">
      {failed !== arena.key && (
        <img
          src={arena.medium}
          srcSet={`${arena.small} 768w, ${arena.medium} 1200w, ${arena.wide} 1920w`}
          sizes="(min-width:1280px) 80vw, 100vw"
          alt=""
          decoding="async"
          onError={() => setFailed(arena.key)}
        />
      )}
      <span className="arena-edge arena-edge-dawn" />
      <span className="arena-edge arena-edge-ash" />
      {[0, 1, 2, 3].map((i) => (
        <i className={`arena-mote arena-mote-${i}`} key={i} />
      ))}
    </div>
  );
}
