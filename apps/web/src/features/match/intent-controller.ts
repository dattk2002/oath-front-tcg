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
  function pending(
    envelope: CommandEnvelope | null,
    status: "SENDING" | "UNCERTAIN" = "SENDING",
  ) {
    store.setPending(envelope ? { envelope, status } : null);
    options.persistPending?.(envelope);
  }
  async function send(envelope: CommandEnvelope) {
    pending(envelope);
    store.setMessage(null);
    try {
      store.acceptResponse(await options.send(envelope));
      pending(null);
      store.setSelection(null);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "STALE_REVISION"
      ) {
        store.acceptResponse(error.body.error.details.snapshot);
        pending(null);
        store.setSelection(null);
        store.setMessage("Bàn chơi đã thay đổi. Hãy chọn lại hành động.");
      } else if (!(error instanceof ApiError) || error.status >= 500) {
        pending(envelope, "UNCERTAIN");
        store.setMessage(
          "Chưa xác định kết quả gửi. Thử lại cùng yêu cầu để xác nhận.",
        );
      } else {
        pending(null);
        store.setSelection(null);
        store.setMessage(
          "Không thể thực hiện hành động. Hãy tải lại bàn chơi hoặc chọn lại.",
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
      store.setMessage("Mục tiêu hoặc hành động không còn hợp lệ.");
      return;
    }
    await send({
      commandId: options.makeId(),
      expectedRevision: snapshot.revision,
      action,
    });
  }
  return {
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
      store.setMessage("Mục tiêu không hợp lệ. Chọn vùng đang được đánh dấu.");
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
