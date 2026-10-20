import type { Page } from "@playwright/test";
export async function instrument(page: Page) {
  await page.addInitScript(() => {
    const stats = {
      created: 0,
      deleted: 0,
      live: 0,
      bytes: 0,
      peakBytes: 0,
      frames: [] as number[],
      longTasks: [] as number[],
      cls: 0,
      shifts: [] as { value: number; time: number; targets: string[] }[],
      measuring: false,
      canvasSizes: [] as {
        width: number;
        height: number;
        controlsHeight: number;
      }[],
    };
    Object.assign(window, { qualityMetrics: stats });
    new MutationObserver((records) => {
      if (!stats.measuring) return;
      for (const record of records) {
        const canvas = record.target;
        if (
          canvas instanceof HTMLCanvasElement &&
          canvas.classList.contains("battle-canvas")
        ) {
          stats.canvasSizes.push({
            width: canvas.width,
            height: canvas.height,
            controlsHeight:
              document
                .querySelector(".motion-controls")
                ?.getBoundingClientRect().height ?? 0,
          });
        }
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["width", "height"],
    });
    for (const proto of [
      WebGLRenderingContext.prototype,
      WebGL2RenderingContext.prototype,
    ]) {
      const textures = new Map<WebGLTexture, number>();
      let bound: WebGLTexture | null = null;
      const create = proto.createTexture,
        remove = proto.deleteTexture,
        bind = proto.bindTexture,
        upload = proto.texImage2D;
      proto.createTexture = function () {
        const texture = create.call(this);
        if (texture) {
          textures.set(texture, 0);
          stats.created++;
          stats.live++;
        }
        return texture;
      };
      proto.deleteTexture = function (texture) {
        if (texture && textures.has(texture)) {
          stats.bytes -= textures.get(texture)!;
          textures.delete(texture);
          stats.deleted++;
          stats.live--;
        }
        return remove.call(this, texture);
      };
      proto.bindTexture = function (target, texture) {
        bound = texture;
        return bind.call(this, target, texture);
      };
      proto.texImage2D = function (
        this: WebGLRenderingContext,
        ...args: unknown[]
      ) {
        if (bound && textures.has(bound)) {
          let width: number, height: number;
          if (args.length >= 9) {
            width = Number(args[3]);
            height = Number(args[4]);
          } else {
            const source = args[5] as
              { width?: number; height?: number } | undefined;
            width = source?.width ?? 0;
            height = source?.height ?? 0;
          }
          const bytes = width * height * 4;
          stats.bytes += bytes - textures.get(bound)!;
          textures.set(bound, bytes);
          stats.peakBytes = Math.max(stats.peakBytes, stats.bytes);
        }
        return Reflect.apply(upload, this, args);
      } as typeof upload;
    }
    new PerformanceObserver((list) => {
      if (stats.measuring)
        for (const e of list.getEntries()) stats.longTasks.push(e.duration);
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      })[])
        if (!e.hadRecentInput) {
          stats.cls += e.value;
          const shift = e as typeof e & { sources?: { node?: Element }[] };
          stats.shifts.push({
            value: e.value,
            time: e.startTime,
            targets: shift.sources?.map((s) => s.node?.className ?? "") ?? [],
          });
        }
    }).observe({ type: "layout-shift", buffered: true });
  });
}
export interface Metrics {
  created: number;
  deleted: number;
  live: number;
  bytes: number;
  peakBytes: number;
  frames: number[];
  longTasks: number[];
  cls: number;
  shifts: { value: number; time: number; targets: string[] }[];
  measuring: boolean;
  canvasSizes: { width: number; height: number; controlsHeight: number }[];
}
declare global {
  interface Window {
    qualityMetrics: Metrics;
  }
}
export const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
