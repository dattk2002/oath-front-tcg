import type { PlayerView, VisibleEvent } from "@oathfront/contracts";
export interface Cue {
  progress: number;
  alpha: number;
  evil: number;
  good: number;
  reduced: boolean;
}
export interface BattleScene {
  ready: Promise<void>;
  applyView(view: PlayerView): void;
  getView(): PlayerView | null;
  subscribe(listener: (view: PlayerView) => void): () => void;
  commit(event: VisibleEvent): void;
  present(event: VisibleEvent, cue: Cue): void;
  clearEffects(): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}
/** Projection of explicit public values, never calculation of damage or game legality. */
export function applyVisibleEvent(
  view: PlayerView,
  event: VisibleEvent,
): PlayerView {
  const next = structuredClone(view);
  const unit = (id: string) =>
    next.board
      .flatMap((lane) => [lane.good, lane.evil])
      .find((u) => u?.instanceId === id);
  switch (event.kind) {
    case "UnitCreated": {
      const u = event.payload.unit,
        lane = next.board.find((l) => l.laneId === u.laneId);
      if (lane) lane[u.owner === "GOOD" ? "good" : "evil"] = structuredClone(u);
      break;
    }
    case "UnitMoved": {
      const u = unit(event.payload.instanceId);
      if (u) {
        for (const lane of next.board)
          for (const side of ["good", "evil"] as const)
            if (lane[side]?.instanceId === u.instanceId) lane[side] = null;
        u.laneId = event.payload.toLane;
        const lane = next.board.find((l) => l.laneId === u.laneId);
        if (lane) lane[u.owner === "GOOD" ? "good" : "evil"] = u;
      }
      break;
    }
    case "DamageBatchResolved":
      for (const change of event.payload.hpChanges) {
        if (change.target.kind === "HERO")
          next.players[change.target.side].hp = change.after;
        else {
          const u = unit(change.target.instanceId);
          if (u) u.current.hp = change.after;
        }
      }
      break;
    case "StatsChanged": {
      const u = unit(event.payload.instanceId);
      if (u) {
        u.current = structuredClone(event.payload.after);
        u.modifiers = structuredClone(event.payload.modifiers);
      }
      break;
    }
    case "StatusChanged": {
      const u = unit(event.payload.instanceId);
      if (u) u.statuses = structuredClone(event.payload.after);
      break;
    }
    case "UnitDestroyed":
      for (const lane of next.board)
        for (const side of ["good", "evil"] as const)
          if (lane[side]?.instanceId === event.payload.instanceId)
            lane[side] = null;
      break;
    case "HeroHealed":
      next.players[event.payload.side].hp = event.payload.after;
      break;
    case "LocationRevealed": {
      const lane = next.board.find((l) => l.laneId === event.payload.laneId);
      if (lane)
        lane.location = {
          state: "REVEALED",
          definitionId: event.payload.definitionId,
          revealTurn:
            lane.location.state === "NORMAL"
              ? view.turn
              : lane.location.revealTurn,
        };
      break;
    }
    default:
      break;
  }
  return next;
}
