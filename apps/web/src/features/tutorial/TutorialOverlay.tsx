import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { PlayerView, PlayerAction } from "@oathfront/contracts";
import { getTutorialStep } from "./tutorial-controller";
import { useSettings } from "../settings/SettingsDialog";
export default function TutorialOverlay({
  view,
  disabled,
  onAction,
}: {
  view: PlayerView;
  disabled: boolean;
  onAction: (a: PlayerAction) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [confirm, setConfirm] = useState<"skip" | "restart" | null>(null);
  const { settings } = useSettings();
  const t = view.tutorial;
  useEffect(() => {
    if (!ref.current) return;
    const reduced =
      settings.reducedMotion ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: reduced ? 1 : 0.5, y: reduced ? 0 : 6 },
        { opacity: 1, y: 0, duration: reduced ? 0 : 0.16 },
      );
    }, ref);
    return () => context.revert();
  }, [t?.stepId, settings.reducedMotion]);
  if (!t || ["COMPLETED", "SKIPPED"].includes(t.stepState)) return null;
  const step = getTutorialStep(view, t);
  const can = (kind: PlayerAction["kind"]) =>
    !disabled && view.legalActions.some((a) => a.kind === kind);
  return (
    <aside
      ref={ref}
      className="tutorial-panel panel"
      aria-label="Tutorial"
      data-step={t.stepId}
    >
      <div aria-live="polite" aria-atomic="true">
        <p className="muted">
          Practice scenario ·{" "}
          {t.stepId.startsWith("G")
            ? `${Number(t.stepId.slice(1))} / 8`
            : `${Number(t.stepId.slice(1))} / 2`}
        </p>
        <h2>{step.title}</h2>
        <p>{step.copy}</p>
      </div>
      <div className="tutorial-actions">
        {confirm ? (
          <>
            <p>
              {confirm === "skip"
                ? "Skip the tutorial? You can play it again anytime."
                : "Restart this scenario? Earlier lessons will be kept."}
            </p>
            <button
              disabled={disabled}
              onClick={() => {
                onAction(
                  confirm === "skip"
                    ? { kind: "TUTORIAL_SKIP" }
                    : { kind: "TUTORIAL_RESTART", chapterId: t.chapterId },
                );
                setConfirm(null);
              }}
            >
              Confirm
            </button>
            <button onClick={() => setConfirm(null)}>Stay</button>
          </>
        ) : (
          <>
            {t.stepState === "AWAITING_CONTINUE" && (
              <button
                className="primary"
                disabled={!can("TUTORIAL_CONTINUE")}
                onClick={() =>
                  onAction({ kind: "TUTORIAL_CONTINUE", stepId: t.stepId })
                }
              >
                {step.continueLabel}
              </button>
            )}
            <button
              disabled={!can("TUTORIAL_RESTART")}
              onClick={() => setConfirm("restart")}
            >
              Restart scenario
            </button>
            <button
              disabled={!can("TUTORIAL_SKIP")}
              onClick={() => setConfirm("skip")}
            >
              Skip tutorial
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
