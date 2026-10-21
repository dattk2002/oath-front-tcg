import type { Application, Graphics, Sprite, Text } from "pixi.js";
import type { EntityRef, PlayerView, VisibleEvent } from "@oathfront/contracts";
import {
  createPlaceholderTextures,
  createIllustratedTextures,
  type BattleAssets,
} from "./assets";
import { createUnitSprite } from "./sprites";
import { drawCardTrace, drawEffect, effectFamily, effectPalette } from "./vfx";
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
  let makeNumber: ((value: string) => Text) | undefined;
  const numbers = new Map<string, Text>();
  const clearNumbers = () => {
    numbers.forEach((label) => label.destroy());
    numbers.clear();
  };
  let current: { event: VisibleEvent; cue: Cue } | null = null;
  const listeners = new Set<(view: PlayerView) => void>(),
    sprites = new Map<string, Sprite>();
  let resize: ResizeObserver | undefined,
    mutation: MutationObserver | undefined;
  let rootBounds: DOMRect;
  const boxes = new Map<
    string,
    { x: number; y: number; w: number; h: number } | null
  >();
  const box = (selector: string) => {
    if (boxes.has(selector)) return boxes.get(selector)!;
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) {
      boxes.set(selector, null);
      return null;
    }
    const r = el.getBoundingClientRect(),
      base = rootBounds;
    const result = {
      x: r.x - base.x + r.width / 2,
      y: r.y - base.y + r.height / 2,
      w: r.width,
      h: r.height,
    };
    boxes.set(selector, result);
    return result;
  };
  function entity(ref: EntityRef | null) {
    if (!ref) return null;
    return ref.kind === "HERO"
      ? (box(`[data-hero-side="${ref.side}"] .hero-hud-art`) ??
          box(`[data-hero-side="${ref.side}"] .hero-target`))
      : box(`[data-unit-id="${CSS.escape(ref.instanceId)}"] .scene-art`);
  }
  function draw() {
    if (!app || !fx || !terrain || disposed) return;
    const bounds = root.getBoundingClientRect();
    rootBounds = bounds;
    boxes.clear();
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
        sprite.width = Math.min(b.w, b.h);
        sprite.height = Math.min(b.w, b.h);
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
      const family = effectFamily(event, view);
      const color = effectPalette[family];
      const ring = (b: ReturnType<typeof box>, progress = cue.progress) => {
        if (b)
          drawEffect(
            fx!,
            family,
            b.x,
            b.y,
            progress,
            strength,
            cue.reduced,
            Math.min(b.w, b.h) * 0.55,
          );
      };
      const link = (
        source: EntityRef | null,
        target: EntityRef,
        damage = false,
      ) => {
        const from = entity(source),
          to = entity(target);
        const p = damage ? Math.min(1, cue.progress / 0.4) : cue.progress;
        if (from && to && !cue.reduced) {
          const x = from.x + (to.x - from.x) * p,
            y = from.y + (to.y - from.y) * p;
          const tail = Math.max(0, p - 0.28);
          fx!
            .moveTo(
              from.x + (to.x - from.x) * tail,
              from.y + (to.y - from.y) * tail,
            )
            .lineTo(x, y)
            .stroke({ color, width: 5, alpha: strength });
          fx!
            .moveTo(
              from.x + (to.x - from.x) * tail + 5,
              from.y + (to.y - from.y) * tail,
            )
            .lineTo(x + 5, y)
            .stroke({
              color: effectPalette.veil,
              width: 1,
              alpha: strength * 0.7,
            });
        }
        if (!damage || cue.progress >= 0.4)
          ring(to, damage ? (cue.progress - 0.4) / 0.6 : cue.progress);
      };
      if (event.kind === "AttackDeclared")
        for (const attack of event.payload.attacks) {
          const sprite = sprites.get(attack.sourceUnitId);
          const b = entity({ kind: "UNIT", instanceId: attack.sourceUnitId });
          const wind = attack.side === "EVIL" ? cue.evil : cue.good;
          if (sprite && b && !cue.reduced) {
            sprite.y += (view?.self.side === attack.side ? -1 : 1) * wind * 18;
            if (wind > 0)
              drawEffect(
                fx,
                "kinetic",
                b.x,
                b.y,
                wind,
                strength * wind,
                false,
                26,
              );
          }
        }
      else if (event.kind === "DamageBatchResolved")
        for (const [index, packet] of event.payload.packets.entries()) {
          link(packet.source, packet.target, true);
          const to = entity(packet.target);
          if (to && cue.progress >= 0.4 && makeNumber) {
            const key = `${event.sequence}:${index}`;
            let label = numbers.get(key);
            if (!label) {
              label = makeNumber(
                packet.blocked ? "BLOCK" : `−${packet.finalDamage}`,
              );
              numbers.set(key, label);
              app.stage.addChild(label);
            }
            label.position.set(
              to.x,
              to.y - (cue.reduced ? 0 : (cue.progress - 0.4) * 12),
            );
            label.alpha = strength;
          }
        }
      else if (event.kind === "PowerUsed" || event.kind === "CardPlayed") {
        ring(entity({ kind: "HERO", side: event.payload.side }));
        if (
          event.kind === "PowerUsed" &&
          event.payload.definitionId.startsWith("S_") &&
          !cue.reduced
        ) {
          const b = entity({ kind: "HERO", side: event.payload.side });
          if (b) {
            const spread = Math.min(32, b.w / 2) + cue.progress * 3;
            for (const side of [-1, 1])
              fx.moveTo(b.x + side * spread, b.y - 36)
                .lineTo(b.x + side * (spread + 5), b.y - 20)
                .lineTo(b.x + side * spread, b.y + 36)
                .stroke({ color, width: 4, alpha: strength });
          }
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
          if (cue.reduced) ring(to);
          else {
            drawCardTrace(fx, x, y, strength, color, Math.min(28, to.w * 0.22));
            if (p > 0.65) ring(to, (p - 0.65) / 0.35);
          }
        }
      } else if (event.kind === "UnitDestroyed") {
        const sprite = sprites.get(event.payload.instanceId);
        if (sprite) sprite.alpha = 1 - cue.progress;
        const b = entity({
          kind: "UNIT",
          instanceId: event.payload.instanceId,
        });
        if (b) {
          if (cue.reduced) ring(b);
          else
            for (const [dx, dy] of [
              [-1, -1],
              [1, -0.6],
              [-0.7, 0.8],
              [0.9, 1],
            ]) {
              const d = 12 + cue.progress * 22,
                x = b.x + dx! * d,
                y = b.y + dy! * d;
              fx.poly([x - 6, y - 9, x + 8, y - 2, x - 2, y + 8]).fill({
                color,
                alpha: strength * 0.8,
              });
            }
        }
      } else if (event.kind === "UnitMoved") {
        const from = entity({
          kind: "UNIT",
          instanceId: event.payload.instanceId,
        });
        const unit = view?.board
          .flatMap((lane) => [lane.good, lane.evil])
          .find((unit) => unit?.instanceId === event.payload.instanceId);
        const to = unit
          ? box(
              `[data-slot-side="${unit.owner}"][data-slot-lane="${event.payload.toLane}"]`,
            )
          : null;
        const sprite = sprites.get(event.payload.instanceId);
        if (from && to && sprite && !cue.reduced) {
          sprite.x = from.x + (to.x - from.x) * cue.progress;
          sprite.y += (to.y - from.y) * cue.progress;
          drawEffect(
            fx,
            "veil",
            sprite.x,
            sprite.y - from.h / 2,
            cue.progress,
            strength,
            false,
            28,
          );
        } else ring(to);
      } else if (event.kind === "LocationRevealed")
        ring(box(`[data-terrain-lane="${event.payload.laneId}"]`));
      else if (event.kind === "BlockOccurred" || event.kind === "HeroHealed")
        ring(entity({ kind: "HERO", side: event.payload.side }));
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
          if (cue.reduced) ring(to);
          else drawCardTrace(fx, x, y, strength, color);
        }
      } else if (
        event.kind === "StatsChanged" ||
        event.kind === "StatusChanged"
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
        const texture =
          pool.textures.get(u.definitionId) ?? pool.textures.get(u.owner)!;
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
    clearNumbers();
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
    const { Application, Graphics, Text } = await import("pixi.js");
    makeNumber = (text) => {
      const label = new Text({
        text,
        style: {
          fontFamily: "Barlow Condensed, sans-serif",
          fontSize: 30,
          fontWeight: "800",
          fill: 0xf0efe8,
          stroke: { color: 0x101218, width: 5 },
        },
      });
      label.anchor.set(0.5);
      return label;
    };
    if (disposed) return;
    const candidate = new Application();
    try {
      await candidate.init({
        canvas,
        preference: "webgl",
        backgroundAlpha: 0,
        antialias: assets.kind === "PLACEHOLDER" || assets.quality !== "low",
        autoStart: false,
        sharedTicker: false,
        resolution: Math.min(
          window.devicePixelRatio || 1,
          assets.kind !== "PLACEHOLDER" && assets.quality === "low" ? 1 : 2,
        ),
        autoDensity: true,
      });
      app = candidate;
      if (disposed) {
        release();
        return;
      }
      if (assets.kind === "PLACEHOLDER") pool = createPlaceholderTextures(app);
      else pool = createIllustratedTextures(app, assets);
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
      if (current?.event.sequence !== event.sequence) clearNumbers();
      current = { event, cue: { ...cue } };
      draw();
    },
    clearEffects() {
      clearNumbers();
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
