import { arenaForView } from "./rendering/arena";
import { useSettings } from "../settings/SettingsDialog";
import { soundFamily } from "../settings/audio-manager";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { PlayerView, PublicCatalog } from "@oathfront/contracts";
import type { MatchViewStore } from "./view-store";
import type { PresentationController } from "./motion/presentation-controller";
import { eventLabel } from "./labels";
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
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
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
      release = () => {};
    setStatus("loading");
    void Promise.all([
      import("./rendering/three/scene"),
      import("./motion/presentation-controller"),
      import("./motion/reduced-motion"),
      import("./motion/event-timeline"),
    ])
      .then(async ([rendering, motion, preferences, feedback]) => {
        if (cancelled || !canvas.current) return;
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
            onFailure: () => {
              release();
              if (!cancelled) {
                setStatus("fallback");
                onView(store.getSnapshot().authoritativeView);
              }
            },
          },
        );
        const unsubscribeView = scene.subscribe(onView);
        scene.applyView(store.getSnapshot().authoritativeView);
        const os = preferences.observeReducedMotion(() =>
          controller.fastForward(store.getSnapshot().authoritativeView),
        );
        const controller = motion.createPresentationController(scene, {
          reducedMotion: () => os.matches() || reducedSetting.current,
          maxBacklogSeconds: 8,
          getLatestView: () => store.getSnapshot().authoritativeView,
          onPlaying: setPlaying,
          onEvent: (event) => {
            const family = soundFamily(event);
            if (family) sound.current?.play(family);
          },
          unitCardIds: new Set(
            catalog.cards
              .filter((card) => card.type === "UNIT")
              .map((card) => card.id),
          ),
          onCursor: (sequence) => {
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
        let unsubscribeStore = () => {},
          removeFeedback = () => {};
        const syncPause = () => {
          if (
            document.hidden ||
            !navigator.onLine ||
            store.getSnapshot().authoritativeView.lifecycle === "PAUSED"
          )
            controller.pause();
          else controller.resume();
        };
        const reconnect = () => {
          controller.fastForward(store.getSnapshot().authoritativeView);
          store.setSelection(null);
          syncPause();
        };
        release = () => {
          unsubscribeStore();
          unsubscribeView();
          removeFeedback();
          os.dispose();
          document.removeEventListener("visibilitychange", syncPause);
          window.removeEventListener("online", reconnect);
          window.removeEventListener("offline", syncPause);
          if (presentation.current === controller) presentation.current = null;
          controller.dispose();
        };
        try {
          await scene.ready;
          if (cancelled) {
            release();
            return;
          }
          presentation.current = controller;
          const snapshot = store.getSnapshot();
          controller.fastForward(snapshot.authoritativeView);
          store.setPresentationCursor(snapshot.latestSeq);
          let receivedRevision = snapshot.revision,
            receivedSeq = snapshot.latestSeq;
          unsubscribeStore = store.subscribe(() => {
            const next = store.getSnapshot();
            if (
              next.revision !== receivedRevision ||
              next.latestSeq !== receivedSeq
            ) {
              receivedRevision = next.revision;
              receivedSeq = next.latestSeq;
              controller.enqueue(
                next.events.filter((e) => e.sequence > next.presentationCursor),
              );
            }
            syncPause();
          });
          removeFeedback = feedback.bindCardFeedback(
            canvas.current!.closest<HTMLElement>("[data-battle-root]")!,
            () => os.matches() || reducedSetting.current,
          );
          document.addEventListener("visibilitychange", syncPause);
          window.addEventListener("online", reconnect);
          window.addEventListener("offline", syncPause);
          syncPause();
          setStatus("ready");
        } catch {
          release();
          if (!cancelled) {
            setStatus("fallback");
            onView(store.getSnapshot().authoritativeView);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("fallback");
          onView(store.getSnapshot().authoritativeView);
        }
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
    if (status !== "fallback") return;
    onView(store.getSnapshot().authoritativeView);
    return store.subscribe(() => onView(store.getSnapshot().authoritativeView));
  }, [status, store, onView]);
  return (
    <>
      <div
        className="battle-scene-layer"
        data-scene-status={status}
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
        {status === "loading" && (
          <span role="status">Preparing battlefield…</span>
        )}
        {status === "fallback" && (
          <span role="status">
            Using the text board.{" "}
            <button onClick={() => setAttempt((n) => n + 1)}>
              Retry artwork
            </button>
          </span>
        )}
      </div>
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
