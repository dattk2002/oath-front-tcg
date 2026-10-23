import * as T from "three";
import type { PlayerView, LaneId, Side } from "@oathfront/contracts";
import type { ArenaHit } from "../arena-interaction";
import { CARD_WIDTH, CARD_DEPTH, SURFACE_Y, cardAnchor } from "./layout";
export function arenaHitEqual(a: ArenaHit, b: ArenaHit) {
  return (
    a.kind === b.kind &&
    (a.kind === "CAST" ||
      (a.kind === "UNIT" &&
        b.kind === "UNIT" &&
        a.instanceId === b.instanceId) ||
      (a.kind === "LANE" && b.kind === "LANE" && a.laneId === b.laneId) ||
      (a.kind === "SLOT" &&
        b.kind === "SLOT" &&
        a.laneId === b.laneId &&
        a.side === b.side))
  );
}
export type ArenaRect = Pick<DOMRect, "left" | "top" | "width" | "height">;
export function createArenaPicker() {
  const group = new T.Group(),
    material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    geometries = new Map<string, T.PlaneGeometry>();
  let disposed = false;
  function surface(hit: ArenaHit, anchor: T.Vector3, w: number, d: number) {
    const key = `${w}:${d}`;
    let geometry = geometries.get(key);
    if (!geometry) {
      geometry = new T.PlaneGeometry(w, d);
      geometry.rotateX(-Math.PI / 2);
      geometries.set(key, geometry);
    }
    const mesh = new T.Mesh(geometry, material);
    mesh.position.copy(anchor);
    mesh.userData.hit = hit;
    group.add(mesh);
  }
  return {
    update(view: PlayerView) {
      if (disposed) return;
      group.clear();
      for (const lane of view.board) {
        for (const side of ["GOOD", "EVIL"] as const) {
          const anchor = cardAnchor(lane.laneId, side, view.self.side);
          surface(
            { kind: "SLOT", side, laneId: lane.laneId },
            anchor,
            CARD_WIDTH,
            CARD_DEPTH,
          );
          const unit = lane[side === "GOOD" ? "good" : "evil"];
          if (unit)
            surface(
              { kind: "UNIT", instanceId: unit.instanceId },
              anchor.clone().add(new T.Vector3(0, 0.081, 0)),
              CARD_WIDTH,
              CARD_DEPTH,
            );
        }
        // A lane is the entire column. Matching happens before ordering, so a unit never swallows a lane drop.
        surface(
          { kind: "LANE", laneId: lane.laneId },
          new T.Vector3((lane.laneId - 3) * 2.4, SURFACE_Y - 0.02, 0),
          2.05,
          6.45,
        );
      }
      surface(
        { kind: "CAST" },
        new T.Vector3(0, SURFACE_Y + 0.02, 0),
        11.3,
        1.25,
      );
      group.updateMatrixWorld(true);
    },
    pick(
      x: number,
      y: number,
      allowed: readonly ArenaHit[],
      camera: T.Camera,
      rect: ArenaRect,
    ): ArenaHit[] {
      if (
        disposed ||
        !allowed.length ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        x < rect.left ||
        y < rect.top ||
        x > rect.left + rect.width ||
        y > rect.top + rect.height
      )
        return [];
      const ray = new T.Raycaster();
      ray.setFromCamera(
        new T.Vector2(
          ((x - rect.left) / rect.width) * 2 - 1,
          1 - ((y - rect.top) / rect.height) * 2,
        ),
        camera,
      );
      const results = ray.intersectObjects(group.children, false);
      const hits: ArenaHit[] = [];
      for (const result of results) {
        const hit = result.object.userData.hit as ArenaHit;
        if (
          allowed.some((candidate) => arenaHitEqual(candidate, hit)) &&
          !hits.some((candidate) => arenaHitEqual(candidate, hit))
        )
          hits.push(hit);
      }
      return hits;
    },
    anchor(
      hit: ArenaHit,
      self: Side,
      view: PlayerView | null,
    ): T.Vector3 | null {
      if (hit.kind === "SLOT") return cardAnchor(hit.laneId, hit.side, self);
      if (hit.kind === "LANE")
        return new T.Vector3((hit.laneId - 3) * 2.4, SURFACE_Y, 0);
      if (hit.kind === "CAST") return new T.Vector3(0, SURFACE_Y, 0);
      const unit = view?.board
        .flatMap((l) => [l.good, l.evil])
        .find((u) => u?.instanceId === hit.instanceId);
      return unit ? cardAnchor(unit.laneId as LaneId, unit.owner, self) : null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.clear();
      geometries.forEach((g) => g.dispose());
      geometries.clear();
      material.dispose();
    },
  };
}

import type { PublicCatalog, UnitView } from "@oathfront/contracts";
import type { ArenaDragPreview } from "../arena-interaction";
import { createCardTexture } from "./card-texture";
export function createDragFeedback(
  catalog: PublicCatalog,
  quality: "low" | "high",
  changed: () => void,
  picker: ReturnType<typeof createArenaPicker>,
) {
  const group = new T.Group();
  group.name = "drag-feedback";
  const shape = new T.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0.5);
  shape.lineTo(-0.5, 0.5);
  shape.closePath();
  const hole = new T.Path();
  hole.moveTo(-0.48, -0.48);
  hole.lineTo(-0.48, 0.48);
  hole.lineTo(0.48, 0.48);
  hole.lineTo(0.48, -0.48);
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new T.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  const outlines = Array.from({ length: 26 }, () => {
    const m = new T.Mesh(
      geometry,
      new T.MeshBasicMaterial({
        color: 0xa4e3bb,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: T.DoubleSide,
        toneMapped: false,
      }),
    );
    m.visible = false;
    group.add(m);
    return m;
  });
  const cast = new T.Mesh(
    new T.PlaneGeometry(11.3, 1.25),
    new T.MeshBasicMaterial({
      color: 0x68c8bd,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  cast.rotation.x = -Math.PI / 2;
  cast.position.set(0, SURFACE_Y + 0.04, 0);
  cast.visible = false;
  group.add(cast);
  const ghost = new T.Mesh(
    new T.PlaneGeometry(CARD_WIDTH, CARD_DEPTH),
    new T.MeshBasicMaterial({
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: T.DoubleSide,
      toneMapped: false,
    }),
  );
  ghost.rotation.x = -Math.PI / 2;
  ghost.visible = false;
  group.add(ghost);
  const ring = new T.Mesh(
    new T.RingGeometry(0.72, 0.77, 48),
    new T.MeshBasicMaterial({
      color: 0x9ff0da,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: T.DoubleSide,
      toneMapped: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  group.add(ring);
  let source = "",
    texture: ReturnType<typeof createCardTexture> | undefined,
    disposed = false;
  const clear = () => {
    outlines.forEach((m) => (m.visible = false));
    cast.visible = false;
    ghost.visible = false;
    ring.visible = false;
  };
  return {
    group,
    update(preview: ArenaDragPreview | null, view: PlayerView | null) {
      if (disposed) return;
      clear();
      if (!preview || !view) {
        if (!preview) {
          ghost.material.map = null;
          texture?.dispose();
          texture = undefined;
          source = "";
        }
        return;
      }
      for (const [i, hit] of preview.allowedHits
        .slice(0, outlines.length)
        .entries()) {
        const a = picker.anchor(hit, view.self.side, view);
        if (!a) continue;
        const outline = outlines[i]!;
        outline.position.copy(a);
        const isUnit = hit.kind === "UNIT";
        outline.position.y += isUnit ? 0.13 : 0.025;
        // Unit perimeters render above the opaque face, even during a residual hover lift.
        outline.material.depthTest = !isUnit;
        outline.renderOrder = isUnit ? 100 : 0;
        outline.scale.set(
          hit.kind === "CAST"
            ? 11.3
            : hit.kind === "LANE"
              ? 2.05
              : CARD_WIDTH + (isUnit ? 0.12 : 0),
          1,
          hit.kind === "CAST"
            ? 1.25
            : hit.kind === "LANE"
              ? 6.45
              : CARD_DEPTH + (isUnit ? 0.12 : 0),
        );
        outline.visible = true;
        const hovered =
          preview.valid &&
          preview.hoveredHit &&
          arenaHitEqual(preview.hoveredHit, hit);
        outline.material.opacity = hovered ? 0.95 : 0.42;
        outline.material.color.setHex(hovered ? 0xe0f7b5 : 0x80bda7);
        if (hit.kind === "CAST") cast.visible = true;
      }
      const hit = preview.hoveredHit;
      if (
        !preview.valid ||
        !hit ||
        !preview.allowedHits.some((allowed) => arenaHitEqual(allowed, hit))
      )
        return;
      const a = picker.anchor(hit, view.self.side, view);
      if (!a) return;
      const definition = [...catalog.cards, ...catalog.tokens].find(
        (d) => d.id === preview.definitionId,
      );
      if (
        hit.kind === "SLOT" &&
        definition &&
        (!("type" in definition) || definition.type === "UNIT")
      ) {
        const nextSource = `${preview.instanceId}:${preview.definitionId}`;
        if (source !== nextSource) {
          ghost.material.map = null;
          texture?.dispose();
          source = nextSource;
          const stats = {
            attack: definition.printed?.attack ?? 0,
            hp: definition.printed?.hp ?? 0,
            maxHp: definition.printed?.hp ?? 0,
          };
          const unit = {
            instanceId: preview.instanceId,
            definitionId: definition.id,
            owner: hit.side,
            laneId: hit.laneId,
            isToken: !("cost" in definition),
            printed: stats,
            current: stats,
            statuses: {
              shield: false,
              armor: 0,
              poisoned: false,
              stunned: false,
              exhausted: false,
              pierce: false,
            },
            modifiers: [],
            lastRegularAttackTurn: null,
          } as UnitView;
          texture = createCardTexture(definition, unit, changed, quality);
          ghost.material.map = texture.texture;
          ghost.material.needsUpdate = true;
        }
        ghost.position.copy(a);
        ghost.position.y += 0.09;
        ghost.visible = true;
      } else if (hit.kind !== "UNIT") {
        // Unit hover uses its bright perimeter, leaving the face and stats unobstructed.
        ring.position.copy(a);
        ring.position.y += 0.07;
        ring.scale.setScalar(hit.kind === "CAST" ? 1.25 : 1);
        ring.visible = true;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ghost.material.map = null;
      texture?.dispose();
      texture = undefined;
      geometry.dispose();
      outlines.forEach((m) => m.material.dispose());
      for (const mesh of [cast, ghost, ring]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      group.clear();
    },
  };
}
