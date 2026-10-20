import type { Application, Graphics, Sprite } from "pixi.js";
import type { EntityRef, PlayerView, VisibleEvent } from "@oathfront/contracts";
import { createPlaceholderTextures, type BattleAssets } from "./assets";
import { createUnitSprite } from "./sprites";
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
export function createBattleScene(
  canvas: HTMLCanvasElement,
  assets: BattleAssets,
): BattleScene {
  const root =
    canvas.closest<HTMLElement>("[data-battle-root]") ?? canvas.parentElement!;
  let app: Application | undefined,
    fx: Graphics | undefined,
    terrain: Graphics | undefined;
  let pool: Awaited<ReturnType<typeof createPlaceholderTextures>> | undefined;
  let view: PlayerView | null = null,
    disposed = false,
    paused = false;
  let current: { event: VisibleEvent; cue: Cue } | null = null;
  const listeners = new Set<(view: PlayerView) => void>(),
    sprites = new Map<string, Sprite>();
  let resize: ResizeObserver | undefined,
    mutation: MutationObserver | undefined;
  const box = (selector: string) => {
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect(),
      base = root.getBoundingClientRect();
    return {
      x: r.x - base.x + r.width / 2,
      y: r.y - base.y + r.height / 2,
      w: r.width,
      h: r.height,
    };
  };
  function entity(ref: EntityRef | null) {
    if (!ref) return null;
    return ref.kind === "HERO"
      ? box(`[data-hero-side="${ref.side}"] .hero-target`)
      : box(`[data-unit-id="${CSS.escape(ref.instanceId)}"] .scene-art`);
  }
  function draw() {
    if (!app || !fx || !terrain || disposed) return;
    const bounds = root.getBoundingClientRect();
    if (
      bounds.width > 0 &&
      bounds.height > 0 &&
      (app.screen.width !== bounds.width || app.screen.height !== bounds.height)
    )
      app.renderer.resize(bounds.width, bounds.height);
    for (const [id, sprite] of sprites) {
      const b = box(`[data-unit-id="${CSS.escape(id)}"] .scene-art`);
      sprite.visible = !!b;
      if (b) {
        sprite.position.set(b.x, b.y + b.h / 2);
        sprite.width = Math.min(b.w, 48);
        sprite.height = b.h;
        sprite.alpha = 1;
      }
    }
    fx.clear();
    terrain.clear();
    // Result dim is a stable public-view decoration after the entrance cue ends.
    if (
      (view?.lifecycle === "COMPLETED" || view?.lifecycle === "ABANDONED") &&
      current?.event.kind !== "MatchEnded"
    )
      fx.rect(0, 0, app.screen.width, app.screen.height).fill({
        color: 0x101923,
        alpha: 0.22,
      });
    if (view)
      for (const lane of view.board)
        if (lane.location.state === "REVEALED") {
          const b = box(`[data-terrain-lane="${lane.laneId}"]`);
          if (b)
            terrain
              .roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 8)
              .fill({ color: 0xf4cb76, alpha: 0.045 });
        }
    if (current) {
      const { event, cue } = current;
      const strength = cue.alpha;
      const ring = (b: ReturnType<typeof box>, color = 0xf4cb76) => {
        if (b)
          fx!
            .circle(b.x, b.y, 12 + (cue.reduced ? 0 : cue.progress * 22))
            .stroke({ color, width: 3, alpha: strength });
      };
      const link = (source: EntityRef | null, target: EntityRef) => {
        const from = entity(source),
          to = entity(target);
        if (from && to && !cue.reduced)
          fx!
            .moveTo(from.x, from.y)
            .lineTo(
              from.x + (to.x - from.x) * cue.progress,
              from.y + (to.y - from.y) * cue.progress,
            )
            .stroke({ color: 0xf4cb76, width: 2, alpha: strength });
        ring(to);
      };
      if (event.kind === "AttackDeclared")
        for (const attack of event.payload.attacks) {
          const sprite = sprites.get(attack.sourceUnitId);
          const b = entity({ kind: "UNIT", instanceId: attack.sourceUnitId });
          const wind = attack.side === "EVIL" ? cue.evil : cue.good;
          if (sprite && b && !cue.reduced)
            sprite.y += (view?.self.side === attack.side ? -1 : 1) * wind * 18;
        }
      else if (event.kind === "DamageBatchResolved")
        for (const packet of event.payload.packets)
          link(packet.source, packet.target);
      else if (event.kind === "PowerUsed" || event.kind === "CardPlayed") {
        ring(
          entity({ kind: "HERO", side: event.payload.side }),
          event.payload.side === "EVIL" ? 0xffb078 : 0x76d9c4,
        );
        if (
          event.kind === "PowerUsed" &&
          event.payload.definitionId.startsWith("S_") &&
          !cue.reduced
        ) {
          const b = entity({ kind: "HERO", side: event.payload.side });
          if (b)
            fx.poly([
              b.x,
              b.y - 20,
              b.x + 16,
              b.y,
              b.x,
              b.y + 20,
              b.x - 16,
              b.y,
              b.x,
              b.y - 20,
            ]).stroke({ color: 0xf4cb76, width: 3, alpha: strength });
        }
        const t = event.payload.target;
        if (t.kind === "UNIT" || t.kind === "HERO")
          link({ kind: "HERO", side: event.payload.side }, t);
        else if (t.kind === "LANE" || t.kind === "UNIT_AND_LANE")
          ring(box(`[data-terrain-lane="${t.laneId}"]`));
      } else if (event.kind === "UnitCreated") {
        const u = event.payload.unit;
        const to =
          box(`[data-unit-id="${CSS.escape(u.instanceId)}"] .scene-art`) ??
          box(`[data-slot-side="${u.owner}"][data-slot-lane="${u.laneId}"]`);
        const from = box(
          u.owner === view?.self.side
            ? ".hand"
            : `[data-hero-side="${u.owner}"] .hero-target`,
        );
        if (to) {
          const p = cue.reduced ? 1 : cue.progress,
            x = (from?.x ?? to.x) + (to.x - (from?.x ?? to.x)) * p,
            y = (from?.y ?? to.y) + (to.y - (from?.y ?? to.y)) * p;
          fx.roundRect(x - 12, y - 18, 24, 36, 4).fill({
            color: u.owner === "GOOD" ? 0x76d9c4 : 0xffb078,
            alpha: strength,
          });
        }
      } else if (event.kind === "UnitDestroyed") {
        const sprite = sprites.get(event.payload.instanceId);
        if (sprite) sprite.alpha = 1 - cue.progress;
      } else if (event.kind === "LocationRevealed")
        ring(box(`[data-terrain-lane="${event.payload.laneId}"]`));
      else if (event.kind === "BlockOccurred" || event.kind === "HeroHealed")
        ring(entity({ kind: "HERO", side: event.payload.side }), 0x76d9c4);
      else if (
        event.kind === "CardDrawn" ||
        event.kind === "HandCountChanged"
      ) {
        const from = box(
            `[data-hero-side="${event.payload.side}"] .hero-target`,
          ),
          to = box(
            event.payload.side === view?.self.side
              ? ".hand-card:last-child"
              : `[data-hero-side="${event.payload.side}"] .hero-target`,
          );
        if (from && to) {
          const p = cue.reduced ? 1 : cue.progress,
            x = from.x + (to.x - from.x) * p,
            y = from.y + (to.y - from.y) * p;
          fx.roundRect(x - 10, y - 15, 20, 30, 4)
            .fill({ color: 0x283e49, alpha: strength })
            .stroke({ color: 0xf4cb76, width: 2, alpha: strength });
        }
      } else if (
        event.kind === "StatsChanged" ||
        event.kind === "StatusChanged" ||
        event.kind === "UnitMoved"
      )
        ring(entity({ kind: "UNIT", instanceId: event.payload.instanceId }));
      else if (event.kind === "MatchEnded")
        fx.rect(0, 0, app.screen.width, app.screen.height).fill({
          color: 0x101923,
          alpha: 0.22 * cue.progress,
        });
    }
    app.render();
  }
  function syncSprites() {
    if (!app || !pool || !view || disposed) return;
    const units = view.board
      .flatMap((l) => [l.good, l.evil])
      .filter((u) => u !== null);
    for (const [id, sprite] of sprites)
      if (!units.some((u) => u.instanceId === id)) {
        sprite.destroy();
        sprites.delete(id);
      }
    for (const u of units)
      if (!sprites.has(u.instanceId)) {
        const texture = pool.textures.get(u.owner)!;
        const sprite = createUnitSprite(texture);
        if (disposed) {
          sprite.destroy();
          return;
        }
        sprites.set(u.instanceId, sprite);
        app.stage.addChildAt(sprite, 0);
      }
    draw();
  }
  function notify() {
    if (view) listeners.forEach((listener) => listener(view!));
    void syncSprites();
    draw();
  }
  function release() {
    resize?.disconnect();
    mutation?.disconnect();
    sprites.forEach((sprite) => sprite.destroy());
    sprites.clear();
    pool?.dispose();
    pool = undefined;
    if (app) {
      app.destroy(
        { removeView: false },
        { children: true, texture: false, textureSource: false },
      );
      app = undefined;
    }
  }
  const ready = (async () => {
    await import("pixi.js/unsafe-eval");
    const { Application, Graphics } = await import("pixi.js");
    if (disposed) return;
    const candidate = new Application();
    try {
      await candidate.init({
        canvas,
        preference: "webgl",
        backgroundAlpha: 0,
        antialias: true,
        autoStart: false,
        sharedTicker: false,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      app = candidate;
      if (disposed) {
        release();
        return;
      }
      if (assets.kind === "PLACEHOLDER") pool = createPlaceholderTextures(app);
      if (disposed) {
        release();
        return;
      }
      terrain = new Graphics();
      fx = new Graphics();
      app.stage.addChild(terrain, fx);
      app.stage.eventMode = "none";
      resize = new ResizeObserver(draw);
      resize.observe(root);
      mutation = new MutationObserver(() => {
        void syncSprites();
      });
      mutation.observe(root, { childList: true, subtree: true });
      syncSprites();
      draw();
    } catch (error) {
      if (app) release();
      else if (candidate.renderer)
        candidate.destroy({ removeView: false }, { children: true });
      throw error;
    }
  })();
  return {
    ready,
    getView: () => view,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    applyView(next) {
      if (disposed) return;
      view = structuredClone(next);
      notify();
    },
    commit(event) {
      if (disposed || !view) return;
      view = applyVisibleEvent(view, event);
      notify();
    },
    present(event, cue) {
      if (disposed || paused) return;
      current = { event, cue: { ...cue } };
      draw();
    },
    clearEffects() {
      current = null;
      draw();
    },
    setPaused(value) {
      paused = value;
      if (value) app?.stop();
      else draw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      current = null;
      release();
    },
  };
}
