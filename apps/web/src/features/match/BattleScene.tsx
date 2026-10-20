import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { PlayerView } from "@oathfront/contracts";
import type { MatchViewStore } from "./view-store";
import type { PresentationController } from "./motion/presentation-controller";
import { eventLabel } from "./labels";
/** One mount owns renderer, scoped GSAP timelines, preference/listeners and disposal. */
export default function BattleScene({
  store,
  presentation,
  onView,
}: {
  store: MatchViewStore;
  presentation: MutableRefObject<PresentationController | null>;
  onView: (view: PlayerView) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [playing, setPlaying] = useState(false),
    [reduced, setReduced] = useState(false),
    [attempt, setAttempt] = useState(0),
    [announcement, setAnnouncement] = useState("");
  const reducedSetting = useRef(reduced);
  reducedSetting.current = reduced;
  useEffect(() => {
    let cancelled = false,
      release = () => {};
    setStatus("loading");
    void Promise.all([
      import("./rendering/scene"),
      import("./rendering/assets"),
      import("./motion/presentation-controller"),
      import("./motion/reduced-motion"),
      import("./motion/event-timeline"),
    ])
      .then(async ([rendering, assets, motion, preferences, feedback]) => {
        if (cancelled || !canvas.current) return;
        const scene = rendering.createBattleScene(
          canvas.current,
          assets.placeholderAssets,
        );
        const unsubscribeView = scene.subscribe(onView);
        scene.applyView(store.getSnapshot().authoritativeView);
        const os = preferences.observeReducedMotion(() =>
          controller.fastForward(store.getSnapshot().authoritativeView),
        );
        const controller = motion.createPresentationController(scene, {
          reducedMotion: () => os.matches() || reducedSetting.current,
          getLatestView: () => store.getSnapshot().authoritativeView,
          onPlaying: setPlaying,
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
              setAnnouncement(eventLabel[event.kind] ?? "Bàn chơi đã cập nhật");
          },
        });
        let unsubscribeStore = () => {},
          removeFeedback = () => {};
        const media = window.matchMedia(
          "(min-width: 1024px) and (min-height: 640px)",
        );
        const syncPause = () => {
          if (
            document.hidden ||
            !navigator.onLine ||
            !media.matches ||
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
          media.removeEventListener("change", syncPause);
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
          media.addEventListener("change", syncPause);
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
        if (!cancelled) setStatus("fallback");
      });
    return () => {
      cancelled = true;
      release();
    };
  }, [attempt, onView, presentation, store]);
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
        <canvas ref={canvas} className="battle-canvas" />
      </div>
      <div className="motion-controls">
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(event) => setReduced(event.target.checked)}
          />{" "}
          Giảm chuyển động / VFX
        </label>
        {playing && (
          <button
            onClick={() =>
              presentation.current?.fastForward(
                store.getSnapshot().authoritativeView,
              )
            }
          >
            Đến bàn hiện tại
          </button>
        )}
        {status === "loading" && (
          <span role="status">Đang chuẩn bị hình khối…</span>
        )}
        {status === "fallback" && (
          <span role="status">
            Đang dùng bàn văn bản.{" "}
            <button onClick={() => setAttempt((n) => n + 1)}>
              Thử lại hình khối
            </button>
          </span>
        )}
      </div>
      <p className="motion-announcement" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </>
  );
}
