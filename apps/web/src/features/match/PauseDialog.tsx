import { useUiMotion } from "../motion/use-ui-motion";
import SettingsDialog from "../settings/SettingsDialog";
import { useEffect, useRef, useState } from "react";
import { openDialog } from "./keyboard";
import RecoveryControls, {
  type RecoveryControlsProps,
} from "./RecoveryControls";
export default function PauseDialog({
  controller,
  disabled,
  snapshot,
  online,
  recovering,
  onRecover,
}: RecoveryControlsProps & {
  disabled: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useUiMotion(dialog, "panel");
  useEffect(
    () =>
      openDialog(dialog.current!, heading.current, () =>
        document.querySelector<HTMLButtonElement>("[data-pause-control]"),
      ),
    [],
  );
  return (
    <dialog
      ref={dialog}
      className="match-dialog panel"
      aria-labelledby="pause-heading"
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (confirm) setConfirm(false);
        else if (!disabled) void controller.submitIntent({ kind: "RESUME" });
      }}
    >
      <h2 id="pause-heading" ref={heading} tabIndex={-1}>
        Paused
      </h2>
      {confirm ? (
        <>
          <h3>
            {snapshot.authoritativeView.mode === "TUTORIAL"
              ? "Skip tutorial?"
              : "Confirm surrender?"}
          </h3>
          <p>
            {snapshot.authoritativeView.mode === "TUTORIAL"
              ? "You can replay anytime; no loss is recorded."
              : "The match will end and be recorded as a surrender."}
          </p>
          <button
            disabled={disabled}
            onClick={() =>
              void controller.submitIntent({
                kind:
                  snapshot.authoritativeView.mode === "TUTORIAL"
                    ? "TUTORIAL_SKIP"
                    : "SURRENDER",
              })
            }
          >
            {snapshot.authoritativeView.mode === "TUTORIAL"
              ? "Confirm skip"
              : "Confirm surrender"}
          </button>
          <button disabled={disabled} onClick={() => setConfirm(false)}>
            Return to match
          </button>
        </>
      ) : (
        <>
          <p>Your board is saved. Continue when you are ready.</p>
          <button
            className="primary"
            disabled={disabled}
            onClick={() => void controller.submitIntent({ kind: "RESUME" })}
          >
            Continue
          </button>
          <button disabled={disabled} onClick={() => setConfirm(true)}>
            {snapshot.authoritativeView.mode === "TUTORIAL"
              ? "Skip tutorial"
              : "Surrender"}
          </button>
          <a href="/">Back home</a>
        </>
      )}
      <button onClick={() => setSettingsOpen(true)}>Settings</button>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
      <RecoveryControls
        snapshot={snapshot}
        controller={controller}
        online={online}
        recovering={recovering}
        onRecover={onRecover}
      />
    </dialog>
  );
}
