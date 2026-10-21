import { contentName, contentText } from "../../content/english-content";
import type { PublicCatalog } from "@oathfront/contracts";
import { useState } from "react";
import SettingsDialog from "../settings/SettingsDialog";
import type { ReactNode } from "react";
import type { MatchSnapshot } from "./view-store";
import type { IntentController } from "./intent-controller";
import { phaseLabel, sideLabel } from "./labels";
import RecoveryControls from "./RecoveryControls";
export default function MatchShell({
  snapshot,
  catalog,
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
  const enemy = view.self.side === "GOOD" ? "EVIL" : "GOOD";
  return (
    <section
      className="match-screen"
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
        <p data-testid="phase-label" aria-live="polite" aria-atomic="true">
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
              disabled ||
              view.lifecycle !== "ACTIVE" ||
              !view.legalActions.some((action) => action.kind === "PAUSE")
            }
            onClick={() =>
              void controller.submitIntent({
                kind: "PAUSE",
              })
            }
          >
            Pause
          </button>
        }
      </div>
      <section className="small-fallback panel">
        <h1>Rotate your device or use a larger screen to play</h1>
        <p>
          Your match is saved. The battlefield needs at least 1024 × 640 pixels
          for interaction.
        </p>
        <details>
          <summary>Read the current board</summary>
          <p>
            Your hero: {view.players[view.self.side].hp} HP · Opponent hero:{" "}
            {view.players[enemy].hp} HP
          </p>
          <ol>
            {view.board.map((lane) => (
              <li key={lane.laneId}>
                Lane {lane.laneId}: Dawnward{" "}
                {lane.good
                  ? `${lane.good.current.attack} ATK / ${lane.good.current.hp} HP`
                  : "empty"}
                ; Ashen Court{" "}
                {lane.evil
                  ? `${lane.evil.current.attack} ATK / ${lane.evil.current.hp} HP`
                  : "empty"}
              </li>
            ))}
          </ol>
        </details>
        <details>
          <summary>Hand and powers · full text</summary>
          <ul>
            {[...view.self.hand, ...view.self.reserve].map((card) => {
              const def = [...catalog.cards, ...catalog.powers].find(
                (d) => d.id === card.definitionId,
              );
              return (
                <li key={card.instanceId}>
                  <strong>{contentName(def?.id ?? "")}</strong>
                  <p>{contentText(def?.id ?? "")}</p>
                </li>
              );
            })}
          </ul>
        </details>
        <p className="muted">
          You can return home. Resizing your screen does not surrender the
          match.
        </p>
      </section>
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
