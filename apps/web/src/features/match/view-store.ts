import type {
  CommandEnvelope,
  CommandResponse,
  PlayerView,
  VisibleEvent,
} from "@oathfront/contracts";
export interface Selection {
  instanceId: string;
  unitInstanceId: string | null;
}
export interface PendingCommand {
  envelope: CommandEnvelope;
  status: "SENDING" | "UNCERTAIN";
}
export interface MatchSnapshot {
  authoritativeView: PlayerView;
  revision: number;
  latestSeq: number;
  presentationCursor: number;
  events: readonly VisibleEvent[];
  logCursor: number;
  logExpired: boolean;
  needsAdvance: boolean;
  pendingCommand: PendingCommand | null;
  selection: Selection | null;
  message: string | null;
}
export interface MatchViewStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): MatchSnapshot;
  acceptResponse(response: CommandResponse): void;
  mergeLog(
    events: readonly VisibleEvent[],
    cursor: number,
    expired: boolean,
  ): void;
  setSelection(selection: Selection | null): void;
  setPending(command: PendingCommand | null): void;
  setMessage(message: string | null): void;
  setPresentationCursor(sequence: number): void;
}
export function createMatchViewStore(initial: CommandResponse): MatchViewStore {
  let snapshot: MatchSnapshot = {
    authoritativeView: initial.view,
    revision: initial.revision,
    latestSeq: initial.latestSeq,
    presentationCursor: 0,
    events: [...initial.events],
    logCursor: 0,
    logExpired: false,
    needsAdvance: initial.needsAdvance,
    pendingCommand: null,
    selection: null,
    message: null,
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<MatchSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    acceptResponse(response) {
      if (response.view.matchId !== snapshot.authoritativeView.matchId) return;
      const bySequence = new Map(
        snapshot.events.map((event) => [event.eventId, event]),
      );
      response.events.forEach((event) => bySequence.set(event.eventId, event));
      const events = [...bySequence.values()].sort(
        (a, b) => a.sequence - b.sequence,
      );
      if (
        response.revision < snapshot.revision ||
        response.latestSeq < snapshot.latestSeq
      ) {
        if (events.length !== snapshot.events.length) update({ events });
        return;
      }
      update({
        authoritativeView: response.view,
        revision: response.revision,
        latestSeq: response.latestSeq,
        needsAdvance: response.needsAdvance,
        events,
        selection:
          response.revision > snapshot.revision ? null : snapshot.selection,
      });
    },
    mergeLog(incoming, cursor, expired) {
      const byId = new Map(
        snapshot.events.map((event) => [event.eventId, event]),
      );
      incoming.forEach((event) => byId.set(event.eventId, event));
      update({
        events: [...byId.values()].sort((a, b) => a.sequence - b.sequence),
        logCursor: Math.max(snapshot.logCursor, cursor),
        logExpired: snapshot.logExpired || expired,
      });
    },
    setSelection: (selection) => update({ selection }),
    setPending: (pendingCommand) => update({ pendingCommand }),
    setMessage: (message) => update({ message }),
    setPresentationCursor(sequence) {
      update({
        presentationCursor: Math.max(
          snapshot.presentationCursor,
          Math.min(sequence, snapshot.latestSeq),
        ),
      });
    },
  };
}
