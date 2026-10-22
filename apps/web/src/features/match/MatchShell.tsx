import { useUiMotion } from "../motion/use-ui-motion";
import type { PublicCatalog } from "@oathfront/contracts";
import { useRef, useState } from "react";
import SettingsDialog from "../settings/SettingsDialog";
import type { ReactNode } from "react";
import type { MatchSnapshot } from "./view-store";
import type { IntentController } from "./intent-controller";
import { phaseLabel, sideLabel } from "./labels";
import RecoveryControls from "./RecoveryControls";
export default function MatchShell({
  snapshot,
  controller,
  disabled,
  online,
  onCancel,
  recovering,
  onRecover,
  children,
}: {
  snapshot: MatchSnapshot;
  catalog: PublicCatalog;
  controller: IntentController;
  disabled: boolean;
  online: boolean;
  onCancel: () => void;
  recovering: boolean;
  onRecover: () => void;
  children: ReactNode;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const view = snapshot.authoritativeView;
  const phase = useRef<HTMLParagraphElement>(null);
  useUiMotion(
    phase,
    "phase",
    `${view.turn}:${view.phase}:${view.activeSide}`,
    view.lifecycle === "ACTIVE",
  );
  return (
    <section
      className="match-screen arena-match"
      aria-label="Match"
      onKeyDown={(event) => {
        if (event.target instanceof Element && event.target.closest("dialog"))
          return;
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <h1 className="sr-only">OathFront match</h1>
      <div className="match-heading">
        <p
          ref={phase}
          data-testid="phase-label"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>Turn {view.turn}</strong>
          <span>
            · {phaseLabel[view.phase]}
            {view.activeSide ? ` · ${sideLabel[view.activeSide]}` : ""}
          </span>
        </p>
        <button onClick={() => setSettingsOpen(true)}>Settings</button>
        {
          <button
            data-pause-control
            disabled={
              view.lifecycle !== "ACTIVE" ||
              !view.legalActions.some((action) => action.kind === "PAUSE")
            }
            aria-disabled={disabled || undefined}
            onClick={() => {
              if (!disabled) void controller.submitIntent({ kind: "PAUSE" });
            }}
          >
            Pause
          </button>
        }
      </div>
      <details className="orientation-hint">
        <summary>Landscape tip</summary>
        <p>
          Turn your phone sideways for a wider view. You can play in either
          orientation.
        </p>
      </details>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
      {children}
      {view.lifecycle !== "PAUSED" && (
        <RecoveryControls
          snapshot={snapshot}
          controller={controller}
          online={online}
          recovering={recovering}
          onRecover={onRecover}
        />
      )}
    </section>
  );
}
