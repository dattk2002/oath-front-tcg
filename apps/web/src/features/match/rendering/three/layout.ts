import { PerspectiveCamera, Vector3, Quaternion } from "three";
import type { PlayerView, Side, VisibleEvent } from "@oathfront/contracts";
import { arenaForView, arenas } from "../arena";
import type { Cue } from "../scene-state";
export const CARD_WIDTH = 1.7;
export const CARD_DEPTH = 2.35;
export const SURFACE_Y = 0.36;
export function cardAnchor(lane: number, owner: Side, self: Side) {
  return new Vector3(
    (lane - 3) * 2.4,
    SURFACE_Y,
    owner === self ? 2.05 : -2.05,
  );
}
export function stableArenaKey(
  view: Pick<PlayerView, "board" | "matchId" | "challenge">,
  initial?: string,
) {
  return arenas.some((a) => a.key === initial)
    ? initial!
    : arenaForView(view).key;
}
export function createCamera(width: number, height: number) {
  const camera = new PerspectiveCamera(
    36,
    Math.max(0.1, width / Math.max(1, height)),
    0.1,
    140,
  );
  // Fit the table horizontally on portrait screens without changing lane geometry.
  const scale = Math.max(1, 1.72 / camera.aspect);
  camera.position.set(0, 14 * scale, 12.6 * scale);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}
export function cinematicPose(
  progress: number,
  reduced: boolean,
  direction: number,
) {
  const p = Math.max(0, Math.min(1, progress));
  const wave = reduced || p === 0 || p === 1 ? 0 : Math.sin(p * Math.PI);
  if (!wave) return { x: 0, y: 0, z: 0, zoom: 1 };
  return {
    x: wave * 0.45 * Math.max(-1, Math.min(1, direction)),
    y: -wave * 0.35,
    z: -wave * 0.5,
    zoom: 1 + wave * 0.065,
  };
}
export function projectTile(
  anchor: Vector3,
  width: number,
  depth: number,
  camera: PerspectiveCamera,
  screenWidth: number,
  screenHeight: number,
  orientation = new Quaternion(),
) {
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
    .map(([x, z]) =>
      new Vector3((x! * width) / 2, 0, (z! * depth) / 2)
        .applyQuaternion(orientation)
        .add(anchor)
        .project(camera),
    )
    .map((v) => ({
      x: ((v.x + 1) * screenWidth) / 2,
      y: ((1 - v.y) * screenHeight) / 2,
    }));
  const x = Math.min(...corners.map((c) => c.x)),
    y = Math.min(...corners.map((c) => c.y));
  const w = Math.max(...corners.map((c) => c.x)) - x,
    h = Math.max(...corners.map((c) => c.y)) - y;
  return {
    x,
    y,
    width: w,
    height: h,
    clip: `polygon(${corners.map((c) => `${((c.x - x) / w) * 100}% ${((c.y - y) / h) * 100}%`).join(",")})`,
  };
}

/** The final presentation camera shared with projection and bounded-pose tests. */
export function cameraForCue(
  width: number,
  height: number,
  event: VisibleEvent | null,
  cue: Cue | null,
  reduced = false,
) {
  const camera = createCamera(width, height);
  if (
    !event ||
    !cue ||
    !["AttackDeclared", "DamageBatchResolved", "PowerUsed"].includes(event.kind)
  )
    return camera;
  const pose = cinematicPose(
    cue.progress,
    reduced || cue.reduced,
    cue.evil > cue.good ? -1 : 1,
  );
  const signature =
    event.kind === "PowerUsed" && event.payload.definitionId.startsWith("S_");
  const amplitude = signature ? 2.7 : 1.35;
  const p = Math.max(0, Math.min(1, cue.progress));
  const shake =
    !reduced &&
    !cue.reduced &&
    event.kind === "DamageBatchResolved" &&
    p > 0.36 &&
    p < 0.7
      ? Math.sin(p * 95) * Math.sin(((p - 0.36) / 0.34) * Math.PI) * 0.11
      : 0;
  camera.position.add(
    new Vector3(
      pose.x * amplitude + shake,
      pose.y * amplitude,
      pose.z * amplitude,
    ),
  );
  camera.zoom = 1 + (pose.zoom - 1) * amplitude;
  camera.lookAt(pose.x * 0.35 * amplitude, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}
