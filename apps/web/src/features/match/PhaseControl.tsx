import type { IntentController } from "./intent-controller";
import type { MatchSnapshot } from "./view-store";
export default function PhaseControl({
  snapshot,
  controller,
  disabled,
}: {
  snapshot: MatchSnapshot;
  controller: IntentController;
  disabled: boolean;
}) {
  const view = snapshot.authoritativeView;
  const legal = view.legalActions;
  const keep = legal.some((action) => action.kind === "KEEP_BLOCK_POWER");
  return (
    <div className="phase-controls">
      <button
        className="primary phase-orb"
        disabled={
          disabled ||
          !legal.some(
            (action) =>
              action.kind === (keep ? "KEEP_BLOCK_POWER" : "PASS_PHASE"),
          )
        }
        onClick={() =>
          void controller.submitIntent({
            kind: keep ? "KEEP_BLOCK_POWER" : "PASS_PHASE",
          })
        }
      >
        <span className="phase-orb-label">
          {keep
            ? "Keep for later"
            : view.tutorial?.stepId === "E01"
              ? "End deployment"
              : view.tutorial?.stepId === "E02"
                ? "End tricks"
                : "End phase"}
        </span>
        <span className="phase-orb-rune" aria-hidden="true">
          ◇
        </span>
      </button>
      <p className="muted">
        {snapshot.needsAdvance
          ? "Resolving the bot's turn and combat…"
          : snapshot.authoritativeView.activeSide ===
              snapshot.authoritativeView.self.side
            ? "Choose your action."
            : "Waiting for the next event."}
      </p>
    </div>
  );
}
