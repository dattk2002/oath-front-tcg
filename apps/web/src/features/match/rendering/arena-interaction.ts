import type { LaneId, Side } from "@oathfront/contracts";
/** Presentation-only identities. The UI supplies and revalidates authoritative legality. */
export type ArenaHit =
  | { kind: "SLOT"; side: Side; laneId: LaneId }
  | { kind: "UNIT"; instanceId: string }
  | { kind: "LANE"; laneId: LaneId }
  | { kind: "CAST" };
export interface ArenaDragPreview {
  definitionId: string;
  instanceId: string;
  clientX: number;
  clientY: number;
  allowedHits: readonly ArenaHit[];
  hoveredHit: ArenaHit | null;
  valid: boolean;
}
export interface ArenaInteractionSurface {
  pick(
    clientX: number,
    clientY: number,
    allowedHits: readonly ArenaHit[],
  ): ArenaHit[];
  setDragPreview(preview: ArenaDragPreview | null): void;
  holdCamera(held: boolean): void;
  clearInteraction(): void;
}
