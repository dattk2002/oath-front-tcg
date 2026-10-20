import { gsap } from "gsap";
import type { PlayerView, VisibleEvent } from "@oathfront/contracts";
import type { BattleScene } from "../rendering/scene";
import { createEventTimeline, eventDuration } from "./event-timeline";
export interface PresentationController {
  enqueue(events: readonly VisibleEvent[]): void;
  fastForward(view: PlayerView): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}
export function createPresentationController(
  scene: BattleScene,
  options: {
    reducedMotion: () => boolean;
    getLatestView: () => PlayerView;
    onCursor: (sequence: number) => void;
    onPlaying?: (playing: boolean) => void;
    onEvent?: (event: VisibleEvent) => void;
    maxBacklogSeconds?: number;
    unitCardIds?: ReadonlySet<string>;
  },
): PresentationController {
  let queue: VisibleEvent[] = [],
    timeline: gsap.core.Timeline | null = null;
  let active: VisibleEvent | null = null,
    paused = false,
    disposed = false,
    seen = 0;
  const context = gsap.context(() => {});
  const eventContext = () => ({
    ownSide: scene.getView()?.self.side,
    unitCardIds: options.unitCardIds,
  });
  function playing(value: boolean) {
    options.onPlaying?.(value);
  }
  function stop() {
    timeline?.kill();
    timeline = null;
    active = null;
    queue = [];
    context.revert();
    scene.clearEffects();
    playing(false);
  }
  function pump() {
    if (disposed || paused || timeline) return;
    const event = queue.shift();
    if (!event) {
      scene.applyView(options.getLatestView());
      playing(false);
      return;
    }
    active = event;
    options.onEvent?.(event);
    playing(true);
    const commit = () => {
      if (!disposed) {
        scene.commit(event);
        options.onCursor(event.sequence);
      }
    };
    const done = () => {
      if (disposed) return;
      timeline?.kill();
      timeline = null;
      active = null;
      context.revert();
      scene.clearEffects();
      pump();
    };
    // Zero-duration events commit synchronously; don't rely on GSAP's zero-time callbacks.
    if (eventDuration(event, options.reducedMotion(), eventContext()) === 0) {
      commit();
      active = null;
      pump();
      return;
    }
    context.add(() => {
      timeline = createEventTimeline(
        scene,
        event,
        options.reducedMotion(),
        commit,
        done,
        eventContext(),
      );
      timeline.play();
    });
  }
  function fastForward(view: PlayerView) {
    if (disposed) return;
    const cursor = Math.max(
      seen,
      active?.sequence ?? 0,
      ...queue.map((e) => e.sequence),
    );
    stop();
    scene.applyView(view);
    options.onCursor(cursor);
  }
  return {
    enqueue(events) {
      if (disposed) return;
      const incoming = [...events]
        .filter((e) => e.sequence > seen)
        .sort((a, b) => a.sequence - b.sequence);
      for (const event of incoming) {
        if (event.sequence <= seen) continue;
        queue.push(event);
        seen = event.sequence;
      }
      const seconds =
        (timeline ? Math.max(0, timeline.duration() - timeline.time()) : 0) +
        queue.reduce(
          (n, event) =>
            n + eventDuration(event, options.reducedMotion(), eventContext()),
          0,
        );
      if (seconds > (options.maxBacklogSeconds ?? 2)) {
        fastForward(options.getLatestView());
        return;
      }
      pump();
    },
    fastForward,
    pause() {
      if (disposed) return;
      paused = true;
      timeline?.pause();
      scene.setPaused(true);
    },
    resume() {
      if (disposed) return;
      paused = false;
      scene.setPaused(false);
      if (timeline) timeline.resume();
      else pump();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      scene.dispose();
    },
  };
}
