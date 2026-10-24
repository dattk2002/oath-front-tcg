import * as T from "three";
import { gsap } from "gsap";
import type {
  EntityRef,
  PlayerView,
  PublicCatalog,
  UnitView,
  VisibleEvent,
} from "@oathfront/contracts";
import { applyVisibleEvent, type BattleScene, type Cue } from "../scene-state";
import { effectFamily, effectPalette } from "../vfx";
import {
  CARD_WIDTH,
  CARD_DEPTH,
  SURFACE_Y,
  cardAnchor,
  createCamera,
  cameraForCue,
  projectTile,
  stableArenaKey,
  unobscuredCardFrame,
  type CardFrame,
} from "./layout";
import {
  buildEnvironment,
  disposeObject,
  prepareAuthoredEnvironment,
} from "./environment";
import { loadArenaAssets, type LoadedArena } from "./arena-assets";
import { prepareCourtyardMaterials } from "./materials";
import { createArenaPicker, createDragFeedback } from "./interaction";
import type { ArenaInteractionSurface } from "../arena-interaction";
import { createCardTexture } from "./card-texture";
import { SceneFailure, type SceneFailureReason } from "../scene-failure";
type Card = {
  group: T.Group;
  face: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;
  texture: ReturnType<typeof createCardTexture>;
  unit: UnitView;
  stats: string;
  lift: number;
  tween?: gsap.core.Tween;
};
export function createThreeBattleScene(
  canvas: HTMLCanvasElement,
  catalog: PublicCatalog,
  options: {
    quality: "low" | "high";
    reducedMotion: () => boolean;
    arenaKey?: string;
    onFailure?: (reason: SceneFailureReason) => void;
  },
): BattleScene & { interaction: ArenaInteractionSurface } {
  const root =
    canvas.closest<HTMLElement>("[data-battle-root]") ?? canvas.parentElement!;
  const board = root.querySelector<HTMLElement>(".board");
  const layer = canvas.parentElement!;
  const scene = new T.Scene();
  const effects = new T.Group();
  scene.add(effects);
  // Card thickness shares one draw and shadow pass; faces retain their own live textures.
  const cardEdges = new T.InstancedMesh(
    new T.BoxGeometry(CARD_WIDTH, 0.075, CARD_DEPTH),
    new T.MeshStandardMaterial({
      color: 0x9e9da9,
      metalness: 0.7,
      roughness: 0.38,
    }),
    12,
  );
  cardEdges.count = 0;
  cardEdges.frustumCulled = false;
  cardEdges.castShadow = true;
  cardEdges.receiveShadow = true;
  cardEdges.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(cardEdges);
  let renderer: T.WebGLRenderer | undefined,
    camera = createCamera(1000, 600),
    view: PlayerView | null = null,
    disposed = false,
    failed: SceneFailureReason | null = null,
    released = false,
    paused = false,
    queued = false,
    settledRefresh = false,
    readyFlag = false;
  let current: { event: VisibleEvent; cue: Cue } | null = null,
    arenaKey = options.arenaKey,
    environment: T.Group | undefined;
  const assetAbort = new AbortController();
  let loadedArena: LoadedArena | null = null,
    cameraHeld = false;
  let ambient: gsap.core.Tween | undefined;
  let ambientClock: { value: number } | undefined;
  const picker = createArenaPicker();
  const dragFeedback = createDragFeedback(
    catalog,
    options.quality,
    () => schedule(true),
    picker,
  );
  scene.add(dragFeedback.group);
  const cards = new Map<string, Card>(),
    listeners = new Set<(v: PlayerView) => void>(),
    projected = new Set<HTMLElement>();
  let resize: ResizeObserver | undefined,
    observer: MutationObserver | undefined;
  let bounds: DOMRect,
    width = 1,
    height = 1;
  let cardFrame: CardFrame | undefined,
    frameKey = "";
  const rings: T.Mesh<T.RingGeometry, T.MeshBasicMaterial>[] = [],
    trails: T.Line<T.BufferGeometry, T.LineBasicMaterial>[] = [],
    labels = new Map<string, T.Sprite>();
  function schedule(settled = false) {
    if (disposed || failed || (paused && !settled)) return;
    settledRefresh ||= settled;
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      const force = settledRefresh;
      queued = false;
      settledRefresh = false;
      draw(force);
    });
  }
  const reduced = () => options.reducedMotion() || !!current?.cue.reduced;
  function removeProjection() {
    for (const el of projected) {
      delete el.dataset.projected;
      for (const name of ["x", "y", "width", "height", "clip"])
        el.style.removeProperty(`--project-${name}`);
    }
    projected.clear();
    board?.style.removeProperty("--cast-x");
    board?.style.removeProperty("--cast-y");
    delete root.dataset.renderer;
    root.removeAttribute("data-arena-3d");
    delete canvas.dataset.renderer;
  }
  function fail(reason: SceneFailureReason) {
    if (disposed || failed) return;
    failed = reason;
    removeProjection();
    release();
    options.onFailure?.(reason);
  }
  function measure() {
    if (!board) return;
    bounds = board.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    if (root.closest(".courtyard-match")) {
      const blockers = Array.from(
        root.querySelectorAll<HTMLElement>(
          ".hand-region, .hero-panel, .phase-controls, .motion-preferences, .motion-controls",
        ),
      ).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left - bounds.left,
          y: rect.top - bounds.top,
          width: rect.width,
          height: rect.height,
        };
      });
      const key = JSON.stringify([width, height, blockers]);
      if (key !== frameKey) {
        frameKey = key;
        cardFrame = unobscuredCardFrame(width, height, blockers);
      }
    }
    Object.assign(layer.style, {
      left: `${bounds.left - r.left + root.scrollLeft}px`,
      top: `${bounds.top - r.top + root.scrollTop}px`,
      width: `${width}px`,
      height: `${height}px`,
      right: "auto",
      bottom: "auto",
      pointerEvents: "none",
    });
    canvas.style.pointerEvents = "none";
    if (
      renderer &&
      (canvas.width !== Math.round(width * renderer.getPixelRatio()) ||
        canvas.height !== Math.round(height * renderer.getPixelRatio()))
    )
      renderer.setSize(width, height, false);
  }
  function anchor(ref: EntityRef | null): T.Vector3 | null {
    if (!ref || !view) return null;
    if (ref.kind === "UNIT") {
      const c = cards.get(ref.instanceId);
      return c?.group.position.clone() ?? null;
    }
    const el =
      root.querySelector<HTMLElement>(
        `[data-hero-side="${ref.side}"] .hero-hud-art`,
      ) ?? root.querySelector<HTMLElement>(`[data-hero-side="${ref.side}"]`);
    if (el && bounds) {
      const r = el.getBoundingClientRect();
      const ray = new T.Raycaster();
      ray.setFromCamera(
        new T.Vector2(
          ((r.left + r.width / 2 - bounds.left) / width) * 2 - 1,
          -(((r.top + r.height / 2 - bounds.top) / height) * 2 - 1),
        ),
        camera,
      );
      const result = new T.Vector3();
      if (
        ray.ray.intersectPlane(
          new T.Plane(new T.Vector3(0, 1, 0), -0.5),
          result,
        )
      )
        return result;
    }
    return new T.Vector3(0, 0.5, view.self.side === ref.side ? 5 : -5);
  }
  function syncCards() {
    if (!view || !renderer) return;
    picker.update(view);
    const units = view.board
      .flatMap((l) => [l.good, l.evil])
      .filter((u): u is UnitView => !!u);
    const arriving =
      current?.event.kind === "UnitCreated" ? current.event.payload.unit : null;
    if (arriving && !units.some((u) => u.instanceId === arriving.instanceId))
      units.push(arriving);
    for (const lane of view.board) {
      const tile = environment?.getObjectByName(`terrain-${lane.laneId}`);
      if (
        tile instanceof T.Mesh &&
        tile.material instanceof T.MeshStandardMaterial
      ) {
        const colors: Record<string, number> = {
          ancient_forest: 0x285c4d,
          quiet_meadow: 0x5c7150,
          volcano: 0x7c392c,
          desert: 0x857044,
          frozen_lake: 0x416e82,
          healing_spring: 0x397e84,
          storm_peak: 0x595081,
          ruined_arena: 0x675d78,
        };
        tile.material.color.setHex(
          lane.location.state === "REVEALED"
            ? (colors[lane.location.definitionId] ?? 0x4d5260)
            : 0x222c34,
        );
        tile.material.emissive.setHex(
          lane.location.state === "REVEALED" ? 0x18212a : 0x000000,
        );
      }
    }
    for (const [id, card] of cards)
      if (!units.some((u) => u.instanceId === id)) {
        card.tween?.kill();
        card.face.material.map = null;
        card.texture.dispose();
        disposeObject(card.group);
        scene.remove(card.group);
        cards.delete(id);
      }
    for (const unit of units) {
      let card = cards.get(unit.instanceId);
      const stats = JSON.stringify([
        unit.definitionId,
        unit.current,
        unit.statuses,
      ]);
      if (!card) {
        const def = [...catalog.cards, ...catalog.tokens].find(
          (d) => d.id === unit.definitionId,
        );
        const texture = createCardTexture(def, unit, schedule, options.quality);
        const group = new T.Group();
        const face = new T.Mesh(
          new T.PlaneGeometry(CARD_WIDTH, CARD_DEPTH),
          new T.MeshBasicMaterial({
            map: texture.texture,
            transparent: true,
            toneMapped: false,
          }),
        );
        face.rotation.x = -Math.PI / 2;
        face.position.y = 0.041;
        group.add(face);
        scene.add(group);
        card = { group, face, texture, unit, stats, lift: 0 };
        cards.set(unit.instanceId, card);
      } else if (card.stats !== stats) {
        card.stats = stats;
        card.texture.update(unit);
      }
      card.unit = unit;
    }
  }
  function resetEffects() {
    rings.forEach((r) => (r.visible = false));
    trails.forEach((t) => (t.visible = false));
    labels.forEach((s) => (s.visible = false));
  }
  function clearLabels() {
    labels.forEach((s) => {
      disposeObject(s);
      effects.remove(s);
    });
    labels.clear();
  }
  function ring(
    position: T.Vector3 | null,
    color: number,
    p: number,
    alpha: number,
    index: number,
  ) {
    if (!position) return;
    let r = rings[index];
    if (!r) {
      r = new T.Mesh(
        new T.RingGeometry(0.78, 0.85, options.quality === "high" ? 48 : 24),
        new T.MeshBasicMaterial({
          color,
          transparent: true,
          depthWrite: false,
          side: T.DoubleSide,
          toneMapped: false,
        }),
      );
      r.rotation.x = -Math.PI / 2;
      effects.add(r);
      rings[index] = r;
    }
    r.visible = true;
    r.position.copy(position);
    r.position.y += 0.13;
    r.scale.setScalar(reduced() ? 1 : 0.65 + p * 0.65);
    r.material.color.setHex(color);
    r.material.opacity = alpha;
  }
  function trail(
    from: T.Vector3 | null,
    to: T.Vector3 | null,
    p: number,
    color: number,
    index: number,
  ) {
    if (!from || !to || reduced()) return;
    let line = trails[index];
    if (!line) {
      line = new T.Line(
        new T.BufferGeometry().setFromPoints([
          new T.Vector3(),
          new T.Vector3(),
        ]),
        new T.LineBasicMaterial({
          color,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      effects.add(line);
      trails[index] = line;
    }
    const a = from.clone().lerp(to, Math.max(0, p - 0.3));
    const b = from.clone().lerp(to, p);
    a.y += 0.2;
    b.y += 0.2;
    const points = line.geometry.getAttribute("position") as T.BufferAttribute;
    points.setXYZ(0, a.x, a.y, a.z);
    points.setXYZ(1, b.x, b.y, b.z);
    points.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.material.color.setHex(color);
    line.material.opacity = current?.cue.alpha ?? 1;
    line.visible = true;
  }
  function label(
    text: string,
    position: T.Vector3,
    index: number,
    alpha: number,
  ) {
    const key = `${current?.event.sequence}:${index}`;
    let s = labels.get(key);
    if (!s) {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 96;
      const ctx = c.getContext("2d")!;
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 9;
      ctx.strokeStyle = "#111624";
      ctx.strokeText(text, 128, 48);
      ctx.fillStyle = "#fff4cd";
      ctx.fillText(text, 128, 48);
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      s = new T.Sprite(
        new T.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: false,
          toneMapped: false,
        }),
      );
      s.scale.set(2.1, 0.79, 1);
      effects.add(s);
      labels.set(key, s);
    }
    s.visible = true;
    s.position.copy(position);
    s.position.y += 0.7;
    s.material.opacity = alpha;
  }
  function drawEffects() {
    resetEffects();
    if (!current || !view) return;
    const { event, cue } = current,
      p = Math.max(0, Math.min(1, cue.progress)),
      alpha = cue.alpha,
      color = effectPalette[effectFamily(event, view)];
    if (event.kind === "AttackDeclared")
      event.payload.attacks.forEach((attack, i) => {
        const card = cards.get(attack.sourceUnitId);
        if (!card) return;
        const wind = attack.side === "EVIL" ? cue.evil : cue.good;
        if (!reduced()) {
          card.group.position.y += wind * 0.75;
          card.group.position.z +=
            (attack.side === view!.self.side ? -1 : 1) * wind * 1.25;
          card.group.rotation.x =
            (attack.side === view!.self.side ? 1 : -1) * wind * 0.12;
        }
        ring(card.group.position, color, wind, alpha * wind, i);
      });
    else if (event.kind === "DamageBatchResolved")
      event.payload.packets.forEach((packet, i) => {
        const from = anchor(packet.source),
          to = anchor(packet.target);
        trail(from, to, Math.min(1, p / 0.4), color, i);
        if (p >= 0.4) {
          ring(
            to,
            packet.shieldConsumed ? effectPalette.shield : color,
            (p - 0.4) / 0.6,
            alpha,
            i,
          );
          if (to)
            label(
              packet.blocked
                ? "BLOCK"
                : packet.shieldConsumed
                  ? "SHIELD"
                  : `−${packet.finalDamage}`,
              to,
              i,
              alpha,
            );
        }
      });
    else if (event.kind === "PowerUsed" || event.kind === "CardPlayed") {
      const from = anchor({ kind: "HERO", side: event.payload.side });
      ring(from, color, p, alpha, 0);
      const target = event.payload.target;
      const to =
        target.kind === "UNIT" || target.kind === "HERO"
          ? anchor(target)
          : target.kind === "LANE" || target.kind === "UNIT_AND_LANE"
            ? new T.Vector3((target.laneId - 3) * 2.4, 0.4, 0)
            : null;
      ring(to, color, p, alpha, 1);
      trail(from, to, p, color, 0);
      if (
        event.kind === "PowerUsed" &&
        event.payload.definitionId.startsWith("S_")
      ) {
        ring(to ?? from, color, p * 0.5, alpha * 0.7, 2);
      }
    } else if (event.kind === "UnitCreated") {
      const u = event.payload.unit,
        to = cardAnchor(u.laneId, u.owner, view.self.side),
        card = cards.get(u.instanceId);
      if (card && !reduced()) {
        card.group.position.y += (1 - p) * 2;
        card.group.scale.setScalar(0.85 + p * 0.15);
      }
      ring(to, color, p, alpha, 0);
    } else if (event.kind === "UnitDestroyed") {
      const card = cards.get(event.payload.instanceId);
      if (card) {
        if (!reduced()) {
          card.group.position.y += p * 0.6;
          card.group.rotation.z = p * 0.14;
          card.group.scale.setScalar(1 - p * 0.3);
        }
        card.face.material.opacity = 1 - p;
        ring(card.group.position, color, p, alpha, 0);
      }
    } else if (event.kind === "UnitMoved") {
      const card = cards.get(event.payload.instanceId);
      if (card) {
        const to = cardAnchor(
          event.payload.toLane,
          card.unit.owner,
          view.self.side,
        );
        if (!reduced()) {
          card.group.position.lerp(to, p);
          card.group.position.y += Math.sin(p * Math.PI) * 0.7;
        }
        ring(to, color, p, alpha, 0);
      }
    } else if (event.kind === "LocationRevealed")
      ring(
        new T.Vector3((event.payload.laneId - 3) * 2.4, 0.4, 0),
        color,
        p,
        alpha,
        0,
      );
    else if (event.kind === "BlockOccurred" || event.kind === "HeroHealed")
      ring(
        anchor({ kind: "HERO", side: event.payload.side }),
        color,
        p,
        alpha,
        0,
      );
    else if (event.kind === "StatsChanged" || event.kind === "StatusChanged")
      ring(
        anchor({ kind: "UNIT", instanceId: event.payload.instanceId }),
        color,
        p,
        alpha,
        0,
      );
    else if (event.kind === "CardDrawn" || event.kind === "HandCountChanged")
      ring(
        anchor({ kind: "HERO", side: event.payload.side }),
        color,
        p,
        alpha,
        0,
      );
  }
  function project() {
    if (!view || !board) return;
    const cast = new T.Vector3(0, SURFACE_Y + 0.02, 0).project(camera);
    board.style.setProperty("--cast-x", `${((cast.x + 1) * width) / 2}px`);
    board.style.setProperty("--cast-y", `${((1 - cast.y) * height) / 2}px`);
    for (const el of projected)
      if (!board.contains(el)) {
        delete el.dataset.projected;
        for (const name of ["x", "y", "width", "height", "clip"])
          el.style.removeProperty(`--project-${name}`);
        projected.delete(el);
      }
    for (const el of board.querySelectorAll<HTMLElement>(
      "[data-slot-lane][data-slot-side], [data-unit-id], [data-lane-id], [data-terrain-lane]",
    )) {
      let a: T.Vector3 | undefined,
        w = CARD_WIDTH,
        d = CARD_DEPTH;
      let orientation = new T.Quaternion();
      const id = el.dataset.unitId;
      if (id) {
        const c = cards.get(id);
        if (c) {
          a = c.group.position.clone();
          a.y += 0.041 - (reduced() ? 0 : c.lift);
          orientation = c.group.quaternion;
          w *= c.group.scale.x;
          d *= c.group.scale.z;
        }
      } else if (el.dataset.terrainLane) {
        a = new T.Vector3((Number(el.dataset.terrainLane) - 3) * 2.4, 0.3, 0);
        w = 2.05;
        d = 0.95;
      } else if (el.dataset.slotLane)
        a = cardAnchor(
          Number(el.dataset.slotLane),
          el.dataset.slotSide as "GOOD" | "EVIL",
          view.self.side,
        );
      else if (el.dataset.laneId)
        a = cardAnchor(
          Number(el.dataset.laneId),
          view.self.side,
          view.self.side,
        );
      if (!a) continue;
      const box = projectTile(a, w, d, camera, width, height, orientation);
      // Union with maximum hover lift keeps native hover/focus from chasing its own target.
      if (id) {
        const lifted = projectTile(
          a.clone().add(new T.Vector3(0, 0.4, 0)),
          w,
          d,
          camera,
          width,
          height,
          orientation,
        );
        const right = Math.max(box.x + box.width, lifted.x + lifted.width),
          bottom = Math.max(box.y + box.height, lifted.y + lifted.height);
        box.x = Math.min(box.x, lifted.x);
        box.y = Math.min(box.y, lifted.y);
        box.width = right - box.x;
        box.height = bottom - box.y;
      }
      for (const [key, value] of Object.entries({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      })) {
        const next = `${value.toFixed(2)}px`;
        if (el.style.getPropertyValue(`--project-${key}`) !== next)
          el.style.setProperty(`--project-${key}`, next);
      }
      if (el.dataset.projected !== "true") el.dataset.projected = "true";
      projected.add(el);
    }
  }
  function draw(settled = false) {
    if (
      !renderer ||
      !view ||
      disposed ||
      failed ||
      (paused && !settled) ||
      !board
    )
      return;
    try {
      measure();
      camera = cameraForCue(
        width,
        height,
        cameraHeld ? null : (current?.event ?? null),
        cameraHeld ? null : (current?.cue ?? null),
        reduced(),
        cardFrame,
      );
      for (const card of cards.values()) {
        card.group.position.copy(
          cardAnchor(card.unit.laneId, card.unit.owner, view.self.side),
        );
        card.group.position.y +=
          0.04 + (reduced() || cameraHeld ? 0 : card.lift);
        card.group.rotation.set(0, 0, 0);
        card.group.scale.setScalar(1);
        card.face.material.opacity = 1;
      }
      drawEffects();
      cardEdges.count = Math.min(cards.size, 12);
      let instance = 0;
      for (const card of cards.values()) {
        if (instance >= cardEdges.count) break;
        card.group.updateMatrixWorld(true);
        cardEdges.setMatrixAt(instance++, card.group.matrixWorld);
      }
      cardEdges.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
      project();
      if (!readyFlag) {
        root.dataset.renderer = "three";
        root.setAttribute("data-arena-3d", "ready");
        readyFlag = true;
      }
      canvas.dataset.renderer = "three";
      canvas.dataset.arena = arenaKey;
      canvas.dataset.material = String(
        environment?.userData.materialStatus ?? "fallback",
      );
      let meshCount = 0;
      scene.traverse((o) => {
        if (o instanceof T.Mesh) meshCount++;
      });
      canvas.dataset.meshes = String(meshCount);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.textures = String(renderer.info.memory.textures);
      canvas.dataset.ambientTime = (ambientClock?.value ?? 0).toFixed(4);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
      canvas.dataset.camera = [...camera.position.toArray(), camera.zoom]
        .map((n) => n.toFixed(4))
        .join(",");
    } catch {
      fail("render-failed");
    }
  }
  function updateHover() {
    if (disposed || failed || paused || !board) return;
    for (const card of cards.values()) {
      const el = board.querySelector<HTMLElement>(
        `[data-unit-id="${CSS.escape(card.unit.instanceId)}"]`,
      );
      const raised =
        !!el &&
        (el.matches(":hover,:focus-within") ||
          el.getAttribute("aria-pressed") === "true" ||
          el.dataset.selected === "true");
      const lift = raised && !reduced() ? 0.36 : 0;
      if (Math.abs(card.lift - lift) < 0.001) continue;
      card.tween?.kill();
      card.tween = gsap.to(card, {
        lift,
        duration: reduced() ? 0 : 0.18,
        ease: "power2.out",
        onUpdate: schedule,
      });
    }
  }
  function release() {
    if (released) return;
    released = true;
    assetAbort.abort();
    ambient?.kill();
    picker.dispose();
    dragFeedback.dispose();
    scene.remove(dragFeedback.group);
    if (loadedArena) {
      scene.remove(loadedArena.group);
      loadedArena.dispose();
      loadedArena = null;
    }
    resize?.disconnect();
    observer?.disconnect();
    board?.removeEventListener("pointerover", updateHover);
    board?.removeEventListener("pointerout", updateHover);
    board?.removeEventListener("focusin", updateHover);
    board?.removeEventListener("focusout", updateHover);
    canvas.removeEventListener("webglcontextlost", contextLost);
    for (const card of cards.values()) {
      card.tween?.kill();
      card.face.material.map = null;
      card.texture.dispose();
    }
    cards.clear();
    disposeObject(scene);
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer = undefined;
    layer.style.left = "";
    layer.style.top = "";
    layer.style.width = "";
    layer.style.height = "";
    layer.style.right = "";
    layer.style.bottom = "";
  }
  function contextLost(e: Event) {
    e.preventDefault();
    fail("context-lost");
  }
  function notify() {
    if (view) listeners.forEach((listener) => listener(view!));
    syncCards();
    syncAmbient();
    // A semantic fast-forward settles once without unpausing cues or hover.
    if (paused) draw(true);
    else schedule();
  }
  const ready = Promise.resolve().then(async () => {
    if (disposed) return;
    try {
      if (!board) throw new SceneFailure("render-failed");
      try {
        renderer = new T.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: options.quality === "high",
          powerPreference:
            options.quality === "low" ? "low-power" : "high-performance",
        });
      } catch (error) {
        throw new SceneFailure("graphics-unavailable", error);
      }
      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          options.quality === "high" ? 1.5 : 1,
        ),
      );
      renderer.shadowMap.enabled = options.quality === "high";
      renderer.shadowMap.type = T.PCFShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      arenaKey = view
        ? stableArenaKey(view, arenaKey)
        : (arenaKey ?? "moonroot-conservatory");
      canvas.addEventListener("webglcontextlost", contextLost);
      try {
        const candidate = await loadArenaAssets(arenaKey, options.quality, {
          signal: assetAbort.signal,
        });
        if (failed || disposed) {
          candidate?.dispose();
          if (failed) throw new SceneFailure(failed);
          return;
        }
        loadedArena = candidate;
        environment =
          candidate?.group ??
          buildEnvironment(arenaKey, options.quality, schedule);
        if (candidate)
          prepareAuthoredEnvironment(environment, options.quality, arenaKey);
      } catch (error) {
        if (failed) throw new SceneFailure(failed, error);
        if (disposed) return;
        throw new SceneFailure("scene-load-failed", error);
      }
      scene.add(environment);
      if (loadedArena) {
        renderer.toneMappingExposure = 1.02;
        const clock = { value: 0 };
        ambientClock = clock;
        const hasAmbient = prepareCourtyardMaterials(environment, clock);
        if (hasAmbient && options.quality === "high")
          ambient = gsap.to(clock, {
            value: Math.PI * 2,
            duration: 8,
            repeat: -1,
            ease: "none",
            paused: true,
            onUpdate: () => {
              if (paused || cameraHeld || reduced() || document.hidden)
                ambient?.pause();
              else schedule();
            },
          });
      }
      resize = new ResizeObserver(() => schedule(true));
      resize.observe(board);
      resize.observe(root);
      observer = new MutationObserver(() => {
        updateHover();
        // React can mount new semantic targets after the synchronous refresh.
        schedule(true);
      });
      observer.observe(board, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          "class",
          "data-selected",
          "aria-pressed",
          "data-legal-target",
        ],
      });
      for (const event of ["pointerover", "pointerout", "focusin", "focusout"])
        board.addEventListener(event, updateHover);
      syncCards();
      draw();
      if (failed) throw new SceneFailure(failed);
      syncAmbient();
    } catch (error) {
      const failure =
        error instanceof SceneFailure
          ? error
          : new SceneFailure("render-failed", error);
      fail(failure.reason);
      throw failure;
    }
  });
  function syncAmbient() {
    if (
      paused ||
      view?.lifecycle !== "ACTIVE" ||
      cameraHeld ||
      reduced() ||
      document.hidden ||
      disposed ||
      failed
    )
      ambient?.pause();
    else ambient?.resume();
  }
  const interaction: ArenaInteractionSurface = {
    pick(x, y, allowed) {
      if (disposed || failed || paused || !readyFlag || !board || !view)
        return [];
      const rect = board.getBoundingClientRect();
      if (rect.width !== width || rect.height !== height) draw(true);
      return picker.pick(x, y, allowed, camera, rect);
    },
    setDragPreview(preview) {
      if (disposed || failed || (preview && (paused || document.hidden)))
        return;
      dragFeedback.update(preview, view);
      schedule(true);
    },
    holdCamera(held) {
      if (disposed || failed) return;
      cameraHeld = held;
      if (held) {
        current = null;
        clearLabels();
        cards.forEach((card) => {
          card.tween?.kill();
          card.lift = 0;
        });
      }
      syncAmbient();
      draw(true);
    },
    clearInteraction() {
      if (disposed || failed) return;
      dragFeedback.update(null, view);
      cameraHeld = false;
      syncAmbient();
      draw(true);
    },
  };
  return {
    ready,
    interaction,
    getView: () => view,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    applyView(next) {
      if (disposed || failed) return;
      view = structuredClone(next);
      notify();
    },
    commit(event) {
      if (disposed || failed || !view) return;
      view = applyVisibleEvent(view, event);
      notify();
    },
    present(event, cue) {
      if (disposed || paused || cameraHeld || failed) return;
      if (current?.event.sequence !== event.sequence) clearLabels();
      current = { event, cue: { ...cue } };
      if (
        event.kind === "UnitCreated" &&
        !cards.has(event.payload.unit.instanceId)
      )
        syncCards();
      draw();
    },
    clearEffects() {
      if (disposed || failed) return;
      current = null;
      clearLabels();
      syncCards();
      draw(true);
    },
    setPaused(value) {
      if (disposed || failed) return;
      paused = value;
      if (value) {
        dragFeedback.update(null, view);
        cameraHeld = false;
      }
      syncAmbient();
      cards.forEach((card) =>
        value ? card.tween?.pause() : card.tween?.resume(),
      );
      if (!value) draw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      current = null;
      removeProjection();
      release();
    },
  };
}
