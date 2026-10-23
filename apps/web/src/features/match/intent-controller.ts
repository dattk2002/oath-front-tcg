import type {
  CommandEnvelope,
  CommandResponse,
  PlayerAction,
  Target,
} from "@oathfront/contracts";
import type { MatchViewStore } from "./view-store";
import { ApiError } from "./api-error";
function publicIdentity(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(publicIdentity).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${publicIdentity(item)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
export function targetEqual(a: Target | null, b: Target | null): boolean {
  return publicIdentity(a) === publicIdentity(b);
}
export function actionEqual(a: PlayerAction, b: PlayerAction): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "MULLIGAN" && b.kind === "MULLIGAN")
    return (
      [...a.cardInstanceIds].sort().join("|") ===
      [...b.cardInstanceIds].sort().join("|")
    );
  return publicIdentity(a) === publicIdentity(b);
}
export function sourceActions(
  store: MatchViewStore,
  instanceId: string,
): PlayerAction[] {
  return store
    .getSnapshot()
    .authoritativeView.legalActions.filter(
      (action) =>
        ("cardInstanceId" in action && action.cardInstanceId === instanceId) ||
        ("powerInstanceId" in action && action.powerInstanceId === instanceId),
    );
}
export function targetFor(action: PlayerAction): Target | null {
  return action.kind === "PLAY_UNIT"
    ? { kind: "LANE", laneId: action.laneId }
    : "target" in action
      ? action.target
      : null;
}
export function createIntentController(
  store: MatchViewStore,
  options: {
    send: (envelope: CommandEnvelope) => Promise<CommandResponse>;
    makeId: () => string;
    persistPending?: (envelope: CommandEnvelope | null) => void;
    fastForward?: () => void;
  },
) {
  let durable = true;
  function pending(
    envelope: CommandEnvelope | null,
    status: "SENDING" | "UNCERTAIN" = "SENDING",
  ) {
    store.setPending(envelope ? { envelope, status } : null);
    try {
      options.persistPending?.(envelope);
    } catch {
      durable = false;
    }
  }
  async function send(envelope: CommandEnvelope) {
    pending(envelope);
    store.setMessage(null);
    try {
      const response = await options.send(envelope);
      store.acceptResponse(response);
      if (response.eventsThroughSeq < response.latestSeq) {
        options.fastForward?.();
        store.setPresentationCursor(store.getSnapshot().latestSeq);
      }
      pending(null);
      store.setSelection(null);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "STALE_REVISION"
      ) {
        store.acceptResponse(error.body.error.details.snapshot);
        options.fastForward?.();
        store.setPresentationCursor(store.getSnapshot().latestSeq);
        pending(null);
        store.setSelection(null);
        store.setMessage("The board changed. Choose your action again.");
      } else if (
        error instanceof ApiError &&
        error.body.error.code === "SESSION_EXPIRED"
      ) {
        pending(envelope, "UNCERTAIN");
        store.setMessage(
          "Your session expired. Restore it at the top of the page, then retry the same request.",
        );
      } else if (!(error instanceof ApiError) || error.status >= 500) {
        pending(envelope, "UNCERTAIN");
        store.setMessage(
          durable
            ? "Send result is unconfirmed. Retry the same request to confirm."
            : "The request could not be saved on this device. Keep this page open and retry; reloading loses request recovery.",
        );
      } else {
        pending(null);
        store.setSelection(null);
        store.setMessage(
          "That action could not be performed. Reload the board or choose again.",
        );
      }
    }
  }
  async function submitIntent(action: PlayerAction) {
    const snapshot = store.getSnapshot();
    if (snapshot.pendingCommand) return;
    const legal =
      action.kind === "ADVANCE"
        ? snapshot.needsAdvance
        : snapshot.authoritativeView.legalActions.some((candidate) =>
            actionEqual(candidate, action),
          );
    if (!legal) {
      store.setMessage("That target or action is no longer legal.");
      return;
    }
    if (
      action.kind !== "ADVANCE" &&
      action.kind !== "PAUSE" &&
      action.kind !== "RESUME" &&
      snapshot.presentationCursor < snapshot.latestSeq
    ) {
      options.fastForward?.();
      store.setPresentationCursor(snapshot.latestSeq);
    }
    await send({
      commandId: options.makeId(),
      expectedRevision: snapshot.revision,
      action,
    });
  }
  return {
    getSnapshot: store.getSnapshot,
    /** Drag is transient; settle the table without opening the card inspector. */
    prepareDrag() {
      const snapshot = store.getSnapshot();
      if (
        snapshot.pendingCommand ||
        snapshot.authoritativeView.lifecycle !== "ACTIVE"
      )
        return false;
      if (snapshot.presentationCursor < snapshot.latestSeq) {
        options.fastForward?.();
        store.setPresentationCursor(snapshot.latestSeq);
      }
      store.setSelection(null);
      store.setMessage(null);
      return true;
    },
    submitIntent,
    async retryPending() {
      const command = store.getSnapshot().pendingCommand;
      if (command?.status === "UNCERTAIN") await send(command.envelope);
    },
    selectCard(instanceId: string) {
      if (store.getSnapshot().pendingCommand) return;
      const view = store.getSnapshot().authoritativeView;
      if (
        ![...view.self.hand, ...view.self.reserve].some(
          (card) => card.instanceId === instanceId,
        )
      ) {
        store.setSelection(null);
        return;
      }
      if (
        store.getSnapshot().presentationCursor < store.getSnapshot().latestSeq
      ) {
        options.fastForward?.();
        store.setPresentationCursor(store.getSnapshot().latestSeq);
      }
      store.setSelection({ instanceId, unitInstanceId: null });
      store.setMessage(null);
    },
    async selectTarget(target: Target) {
      const { selection, pendingCommand } = store.getSnapshot();
      if (!selection || pendingCommand) return;
      const actions = sourceActions(store, selection.instanceId);
      const resolved =
        selection.unitInstanceId && target.kind === "LANE"
          ? {
              kind: "UNIT_AND_LANE" as const,
              instanceId: selection.unitInstanceId,
              laneId: target.laneId,
            }
          : target;
      const action = actions.find((candidate) =>
        targetEqual(targetFor(candidate), resolved),
      );
      if (action) {
        await submitIntent(action);
        return;
      }
      if (
        target.kind === "UNIT" &&
        actions.some((candidate) => {
          const t = targetFor(candidate);
          return (
            t?.kind === "UNIT_AND_LANE" && t.instanceId === target.instanceId
          );
        })
      ) {
        store.setSelection({ ...selection, unitInstanceId: target.instanceId });
        return;
      }
      store.setMessage("Invalid target. Choose a highlighted area.");
    },
    cancelSelection() {
      if (!store.getSnapshot().pendingCommand) {
        store.setSelection(null);
        store.setMessage(null);
      }
    },
  };
}
export type IntentController = ReturnType<typeof createIntentController>;
