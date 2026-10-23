import { arenaForView } from "./rendering/arena";
import { useSettings } from "../settings/SettingsDialog";
import { soundFamily } from "../settings/audio-manager";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { PlayerView, PublicCatalog } from "@oathfront/contracts";
import type { MatchViewStore } from "./view-store";
import type { PresentationController } from "./motion/presentation-controller";
import { eventLabel } from "./labels";
import {
  SceneFailure,
  type SceneFailureReason,
} from "./rendering/scene-failure";

const failureCopy: Record<
  SceneFailureReason,
  { title: string; detail: string }
> = {
  "graphics-unavailable": {
    title: "3D graphics are unavailable",
    detail:
      "Your browser could not start WebGL. Try enabling graphics acceleration in your browser settings, then restart the browser. You can also retry or use the text board.",
  },
  "context-lost": {
    title: "3D graphics were interrupted",
    detail:
      "The graphics context was lost. Retry 3D to rebuild the battlefield, or continue with the text board.",
  },
  "scene-load-failed": {
    title: "The 3D battlefield could not load",
    detail:
      "Some battlefield resources could not load. Check your connection and retry, or continue with the text board.",
  },
  "render-failed": {
    title: "The 3D battlefield stopped rendering",
    detail:
      "The battlefield could not finish drawing. Retry 3D, or continue with the text board.",
  },
};
/** One mount owns renderer, scoped GSAP timelines, preference/listeners and disposal. */
export default function BattleScene({
  store,
  presentation,
  onView,
  catalog,
}: {
  store: MatchViewStore;
  catalog: PublicCatalog;
  presentation: MutableRefObject<PresentationController | null>;
  onView: (view: PlayerView) => void;
}) {
  const { audio, settings, update } = useSettings();
  const sound = useRef(audio);
  sound.current = audio;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [failure, setFailure] = useState<SceneFailureReason>("render-failed");
  const [textBoard, setTextBoard] = useState(false);
  const recovery = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const [playing, setPlaying] = useState(false),
    [attempt, setAttempt] = useState(0),
    [announcement, setAnnouncement] = useState("");
  const arenaKey = useRef(
    arenaForView(store.getSnapshot().authoritativeView).key,
  );
  const reduced = settings.reducedMotion;
  const quality = settings.quality;
  const reducedSetting = useRef(reduced);
  reducedSetting.current = reduced || settings.reducedMotion;
  useEffect(() => {
    let cancelled = false,
      terminal = false,
      released = false,
      stage: SceneFailureReason = "scene-load-failed";
    const cleanup: (() => void)[] = [];
    const release = () => {
      if (released) return;
      released = true;
      for (const dispose of cleanup.reverse()) dispose();
      cleanup.length = 0;
    };
    const fail = (reason: SceneFailureReason) => {
      if (cancelled || terminal) return;
      terminal = true;
      const board = canvas.current
        ?.closest("[data-battle-root]")
        ?.querySelector(".board");
      restoreFocus.current ||= !!board?.contains(document.activeElement);
      release();
      setPlaying(false);
      setFailure(reason);
      setStatus("failed");
      onView(store.getSnapshot().authoritativeView);
    };
    setStatus("loading");
    setTextBoard(false);
    void Promise.all([
      import("./rendering/three/scene"),
      import("./motion/presentation-controller"),
      import("./motion/reduced-motion"),
      import("./motion/event-timeline"),
    ])
      .then(async ([rendering, motion, preferences, feedback]) => {
        if (cancelled || !canvas.current) return;
        stage = "render-failed";
        const scene = rendering.createThreeBattleScene(
          canvas.current,
          catalog,
          {
            quality:
              quality === "low" ||
              (quality === "auto" && matchMedia("(max-width: 1100px)").matches)
                ? "low"
                : "high",
            arenaKey: arenaKey.current,
            reducedMotion: () =>
              reducedSetting.current ||
              matchMedia("(prefers-reduced-motion: reduce)").matches,
            onFailure: fail,
          },
        );
        cleanup.push(() => scene.dispose());
        cleanup.push(scene.subscribe(onView));
        scene.applyView(store.getSnapshot().authoritativeView);
        const os = preferences.observeReducedMotion(() => {
          if (!cancelled && !terminal)
            controller.fastForward(store.getSnapshot().authoritativeView);
        });
        cleanup.push(() => os.dispose());
        const controller = motion.createPresentationController(scene, {
          reducedMotion: () => os.matches() || reducedSetting.current,
          maxBacklogSeconds: 8,
          getLatestView: () => store.getSnapshot().authoritativeView,
          onPlaying: (value) => {
            if (!cancelled && !terminal) setPlaying(value);
          },
          onEvent: (event) => {
            if (cancelled || terminal) return;
            const family = soundFamily(event);
            if (family) sound.current?.play(family);
          },
          unitCardIds: new Set(
            catalog.cards
              .filter((card) => card.type === "UNIT")
              .map((card) => card.id),
          ),
          onCursor: (sequence) => {
            if (cancelled || terminal) return;
            store.setPresentationCursor(sequence);
            const event = store
              .getSnapshot()
              .events.find((e) => e.sequence === sequence);
            if (
              event &&
              [
                "DamageBatchResolved",
                "BlockOccurred",
                "LocationRevealed",
                "MatchEnded",
              ].includes(event.kind)
            )
              setAnnouncement(
                event.kind === "DamageBatchResolved"
                  ? [
                      "Simultaneous damage",
                      ...event.payload.hpChanges.map((change) => {
                        if (change.target.kind === "HERO")
                          return `Hero ${change.target.side === "GOOD" ? "Dawnward" : "Ashen Court"}: ${change.after} HP`;
                        const id = change.target.instanceId;
                        const unit = scene
                          .getView()
                          ?.board.flatMap((lane) => [lane.good, lane.evil])
                          .find((unit) => unit?.instanceId === id);
                        return `${unit ? `Lane ${unit.laneId}, ${unit.owner === "GOOD" ? "Dawnward" : "Ashen Court"}` : "Unit"}: ${change.after} HP`;
                      }),
                      ...event.payload.packets.flatMap((packet) =>
                        packet.blocked
                          ? ["Block"]
                          : packet.shieldConsumed
                            ? ["Shield"]
                            : packet.mitigatedDamage > 0
                              ? [`Armor −${packet.mitigatedDamage}`]
                              : [],
                      ),
                    ].join(" · ")
                  : (eventLabel[event.kind] ?? "Board updated"),
              );
          },
        });
        cleanup.push(() => {
          if (presentation.current === controller) presentation.current = null;
          controller.dispose();
        });
        const syncPause = () => {
          if (cancelled || terminal) return;
          if (
            document.hidden ||
            !navigator.onLine ||
            store.getSnapshot().authoritativeView.lifecycle === "PAUSED"
          )
            controller.pause();
          else controller.resume();
        };
        const reconnect = () => {
          if (cancelled || terminal) return;
          controller.fastForward(store.getSnapshot().authoritativeView);
          store.setSelection(null);
          syncPause();
        };
        try {
          await scene.ready;
          if (cancelled || terminal) {
            release();
            return;
          }
          presentation.current = controller;
          const snapshot = store.getSnapshot();
          controller.fastForward(snapshot.authoritativeView);
          if (cancelled || terminal) return;
          store.setPresentationCursor(snapshot.latestSeq);
          let receivedRevision = snapshot.revision,
            receivedSeq = snapshot.latestSeq;
          cleanup.push(
            store.subscribe(() => {
              if (cancelled || terminal) return;
              const next = store.getSnapshot();
              if (
                next.revision !== receivedRevision ||
                next.latestSeq !== receivedSeq
              ) {
                receivedRevision = next.revision;
                receivedSeq = next.latestSeq;
                controller.enqueue(
                  next.events.filter(
                    (e) => e.sequence > next.presentationCursor,
                  ),
                );
              }
              syncPause();
            }),
          );
          cleanup.push(
            feedback.bindCardFeedback(
              canvas.current!.closest<HTMLElement>("[data-battle-root]")!,
              () => os.matches() || reducedSetting.current,
            ),
          );
          cleanup.push(() => {
            document.removeEventListener("visibilitychange", syncPause);
            window.removeEventListener("online", reconnect);
            window.removeEventListener("offline", syncPause);
          });
          document.addEventListener("visibilitychange", syncPause);
          window.addEventListener("online", reconnect);
          window.addEventListener("offline", syncPause);
          syncPause();
          if (cancelled || terminal) return;
          setStatus("ready");
        } catch (error) {
          fail(error instanceof SceneFailure ? error.reason : stage);
        }
      })
      .catch((error: unknown) => {
        fail(error instanceof SceneFailure ? error.reason : stage);
      });
    return () => {
      cancelled = true;
      release();
    };
  }, [attempt, onView, presentation, store, catalog, quality, reduced]);
  useEffect(() => {
    presentation.current?.fastForward(store.getSnapshot().authoritativeView);
  }, [reduced, presentation, store]);
  useEffect(() => {
    if (status !== "failed") return;
    onView(store.getSnapshot().authoritativeView);
    return store.subscribe(() => onView(store.getSnapshot().authoritativeView));
  }, [status, store, onView]);
  useEffect(() => {
    if (!restoreFocus.current) return;
    if (status === "loading") {
      recovery.current?.focus();
      return;
    }
    const board = canvas.current
      ?.closest("[data-battle-root]")
      ?.querySelector<HTMLElement>(".board");
    let target =
      textBoard || status === "ready"
        ? board?.querySelector<HTMLElement>("button:not(:disabled), summary")
        : recovery.current?.querySelector<HTMLButtonElement>("button");
    if ((textBoard || status === "ready") && !target && board) {
      // Empty boards have no enabled legal targets until a card is selected.
      if (!board.hasAttribute("tabindex")) board.tabIndex = -1;
      target = board;
    }
    target?.focus({ preventScroll: true });
    restoreFocus.current = false;
  }, [status, textBoard]);
  const retry = () => {
    restoreFocus.current = true;
    setTextBoard(false);
    setStatus("loading");
    setAttempt((n) => n + 1);
  };
  return (
    <>
      <div
        className="battle-scene-layer"
        data-scene-status={status}
        data-text-board={textBoard ? "true" : "false"}
        data-presentation={playing ? "playing" : "idle"}
        aria-hidden="true"
      >
        <canvas
          key={`${quality}-${reduced}-${attempt}`}
          ref={canvas}
          className="battle-canvas"
        />
      </div>
      <div className="motion-controls">
        {playing && (
          <button
            onClick={() =>
              presentation.current?.fastForward(
                store.getSnapshot().authoritativeView,
              )
            }
          >
            Jump to current board
          </button>
        )}
        {status === "failed" && textBoard && (
          <span className="text-board-status" role="status">
            Text board <button onClick={retry}>Retry 3D</button>
          </span>
        )}
      </div>
      {status !== "ready" && !textBoard && (
        <div className="battle-scene-recovery" ref={recovery} tabIndex={-1}>
          {status === "loading" ? (
            <p className="battle-scene-loading" role="status">
              Preparing battlefield…
            </p>
          ) : (
            <section
              className="battle-scene-error"
              aria-labelledby="battle-scene-error-title"
            >
              <div role="status">
                <h2 id="battle-scene-error-title">
                  {failureCopy[failure].title}
                </h2>
                <p>{failureCopy[failure].detail}</p>
              </div>
              <div className="battle-scene-recovery-actions">
                <button onClick={retry}>Retry 3D</button>
                <button
                  onClick={() => {
                    restoreFocus.current = true;
                    setTextBoard(true);
                  }}
                >
                  Use text board
                </button>
              </div>
            </section>
          )}
        </div>
      )}
      <div className="motion-preferences">
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(event) =>
              update({ reducedMotion: event.target.checked })
            }
          />{" "}
          Reduce motion / VFX
        </label>
      </div>
      <p className="motion-announcement" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </>
  );
}
