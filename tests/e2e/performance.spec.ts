import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { checkpoint } from "./quality-fixtures.js";

declare global {
  interface Window {
    qualityHarness: {
      hover(): Promise<{ retained: number; restored: boolean }>;
    };
  }
}
async function harness(page: import("@playwright/test").Page) {
  const result = await build({
    entryPoints: ["apps/web/tests/quality-harness.ts"],
    nodePaths: ["./apps/web/node_modules"],
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    target: "es2022",
  });
  await page.route("**/__quality", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<html><body><main data-battle-root style="width:1000px;height:560px"><canvas></canvas><button class="hand-card">Lá bài</button></main></body></html>',
    }),
  );
  await page.goto("/__quality");
  await page.addScriptTag({ content: result.outputFiles[0]!.text });
}
test("repeated hover owns bounded GSAP resources and restores styles", async ({
  page,
}) => {
  await harness(page);
  const result = await page.evaluate(() => window.qualityHarness.hover());
  expect(result.retained).toBeLessThanOrEqual(2);
  expect(result.restored).toBe(true);
});
import { prepare } from "./quality-fixtures.js";
import { instrument, percentile } from "./performance-metrics.js";
import { writeFile, readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import {
  validateWire,
  type VisibleEvent,
  type DamagePacket,
} from "../../packages/contracts/src/index.js";
test("measured full hand mass effect workload and twenty scene lifecycles", async ({
  page,
  browser,
}) => {
  test.skip(
    process.env.OATHFRONT_BENCHMARK !== "1",
    "Explicit benchmark gate; three60s runs.",
  );
  test.setTimeout(300000);
  const lowDiagnostic = process.env.OATHFRONT_LOW_DIAGNOSTIC === "1";
  const initial = checkpoint();
  const errors = await prepare(page, initial);
  if (lowDiagnostic)
    await page.addInitScript(() =>
      localStorage.setItem(
        "oathfront.settings.v1",
        JSON.stringify({
          version: 1,
          musicVolume: 0.3,
          sfxVolume: 0.6,
          muted: false,
          reducedMotion: false,
          motion: "system",
          quality: "low",
        }),
      ),
    );
  await instrument(page);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Tiếp tục trận", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  const shell = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((e) => new URL(e.name).pathname)
      .filter((p) => p.endsWith(".js")),
  );
  let revision = initial.revision,
    sequence = initial.latestSeq,
    commands = 0;
  await page.route(
    `**/api/v1/matches/${initial.view.matchId}/commands`,
    async (route) => {
      commands++;
      const next = structuredClone(initial);
      next.revision = ++revision;
      next.latestSeq = next.eventsThroughSeq = ++sequence;
      const targets = next.view.board.flatMap((l) => [l.good!, l.evil!]);
      const event: VisibleEvent = {
        kind: "DamageBatchResolved",
        eventId: `${initial.view.matchId}:${sequence}`,
        rootId: `${initial.view.matchId}:${sequence}`,
        sequence,
        visibility: "PUBLIC",
        ownerSide: null,
        payload: {
          batchId: `batch-${sequence}`,
          packets: targets.map((u, i) => ({
            source: { kind: "HERO", side: "EVIL" },
            target: { kind: "UNIT", instanceId: u.instanceId },
            damageType: "COMBAT",
            rawDamage: 1,
            mitigatedDamage: 0,
            finalDamage: 1,
            blocked: false,
            shieldConsumed: false,
            displayOrder: (i % 2) + 1,
          })) as [DamagePacket, ...DamagePacket[]],
          hpChanges: targets.map((u) => ({
            target: { kind: "UNIT", instanceId: u.instanceId },
            before: 7,
            after: 6,
          })),
        },
      };
      next.events = [event];
      expect(validateWire("CommandResponse", next)).toBe(true);
      await route.fulfill({ json: next });
    },
  );
  await page
    .getByRole("button", { name: "Tiếp tục trận", exact: true })
    .click();
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible();
  const renderer = await page.locator("canvas").evaluate((c) => {
    const gl = (c as HTMLCanvasElement).getContext("webgl2")!;
    const ext = gl.getExtension("WEBGL_debug_renderer_info")!;
    return {
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
      version: gl.getParameter(gl.VERSION),
      dpr: devicePixelRatio,
      ua: navigator.userAgent,
    };
  });
  const diagnostic = process.env.OATHFRONT_FRAME_DIAGNOSTIC === "1";
  const profileSession = diagnostic
    ? await page.context().newCDPSession(page)
    : null;
  const idle = diagnostic
    ? await page.evaluate(async () => {
        const frames: number[] = [];
        let last = performance.now(),
          id: number;
        const tick = (t: number) => {
          frames.push(t - last);
          last = t;
          id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        await new Promise((r) => setTimeout(r, 10000));
        cancelAnimationFrame(id);
        return frames.slice(1).sort((a, b) => a - b);
      })
    : null;
  const frameTrace = process.env.OATHFRONT_FRAME_TRACE === "1";
  if (profileSession && frameTrace)
    await profileSession.send("Tracing.start", {
      categories:
        "devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame",
      transferMode: "ReturnAsStream",
    });
  if (profileSession) {
    await profileSession.send("Profiler.enable");
    await profileSession.send("Profiler.start");
  }
  const runs = [];
  for (
    let run = 0;
    run <
    (process.env.OATHFRONT_BENCHMARK_SMOKE || diagnostic || lowDiagnostic
      ? 1
      : 3);
    run++
  ) {
    const before = commands;
    const sample = await page.evaluate(
      async (duration) => {
        const m = window.qualityMetrics;
        m.frames = [];
        m.longTasks = [];
        m.measuring = true;
        const focusSamples: {
          time: number;
          visibility: string;
          focused: boolean;
        }[] = [];
        const focusSample = () =>
          focusSamples.push({
            time: performance.now(),
            visibility: document.visibilityState,
            focused: document.hasFocus(),
          });
        focusSample();
        document.addEventListener("visibilitychange", focusSample);
        window.addEventListener("focus", focusSample);
        window.addEventListener("blur", focusSample);
        const start = performance.now();
        const callbackFrames: number[] = [];
        let lastEntry = start;
        let last = start;
        let frame: number;
        const tick = (now: number) => {
          const entry = performance.now();
          callbackFrames.push(entry - lastEntry);
          lastEntry = entry;
          m.frames.push(now - last);
          last = now;
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        const effects = setInterval(() => {
          const b = document.querySelector<HTMLButtonElement>(
            ".phase-controls button",
          );
          if (b && !b.disabled) b.click();
        }, 450);
        await new Promise((r) => setTimeout(r, duration));
        clearInterval(effects);
        cancelAnimationFrame(frame);
        m.measuring = false;
        focusSample();
        document.removeEventListener("visibilitychange", focusSample);
        window.removeEventListener("focus", focusSample);
        window.removeEventListener("blur", focusSample);
        return {
          ...m,
          callbackFrames,
          focusSamples,
          durationMs: performance.now() - start,
        };
      },
      diagnostic ? 10000 : process.env.OATHFRONT_BENCHMARK_SMOKE ? 2000 : 60000,
    );
    const sorted = sample.frames.slice(1).sort((a, b) => a - b);
    const callbackSorted = sample.callbackFrames.slice(1).sort((a, b) => a - b);
    runs.push({
      ...sample,
      frames: undefined,
      callbackFrames: undefined,
      callbackEntryMedian: percentile(callbackSorted, 0.5),
      callbackEntryP95: percentile(callbackSorted, 0.95),
      callbackEntryP99: percentile(callbackSorted, 0.99),
      frameCount: sorted.length,
      median: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      p99: percentile(sorted, 0.99),
      commands: commands - before,
    });
  }
  if (profileSession) {
    if (frameTrace) {
      const completed = new Promise<{ stream?: string }>((resolve) =>
        profileSession.once("Tracing.tracingComplete", resolve),
      );
      await profileSession.send("Tracing.end");
      const { stream } = await completed;
      if (!stream)
        throw Error("Chrome did not return the requested trace stream");
      let trace = "";
      for (;;) {
        const chunk = await profileSession.send("IO.read", { handle: stream });
        trace += chunk.base64Encoded
          ? Buffer.from(chunk.data, "base64").toString()
          : chunk.data;
        if (chunk.eof) break;
      }
      await profileSession.send("IO.close", { handle: stream });
      await writeFile(
        ".superpowers/sdd/2026-10-20-oathfront-implementation/task-16-evidence/postfix-frame-trace.json",
        trace,
      );
    }
    const profile = await profileSession.send("Profiler.stop");
    await writeFile(
      ".superpowers/sdd/2026-10-20-oathfront-implementation/task-16-evidence/app-diagnostic.cpuprofile",
      JSON.stringify(profile),
    );
  }
  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((e) => ({
      path: new URL(e.name).pathname,
      encoded: (e as PerformanceResourceTiming).encodedBodySize,
    })),
  );
  const unique = [...new Set(resources.map((r) => r.path))];
  async function bytes(paths: string[], gzip = false) {
    let sum = 0;
    for (const path of paths) {
      const file = path.startsWith("/_next/")
        ? `apps/web/${process.env.OATHFRONT_E2E_PRODUCTION === "1" ? ".next" : ".next-e2e"}/${decodeURIComponent(path.slice("/_next/".length))}`
        : `apps/web/public${path}`;
      try {
        sum += gzip
          ? gzipSync(await readFile(file)).byteLength
          : (await stat(file)).size;
      } catch (error) {
        if (process.env.OATHFRONT_E2E_PRODUCTION === "1")
          throw error; /* Dev compiler resources are not a production bundle budget. */
      }
    }
    return sum;
  }
  const allJS = unique.filter((p) => p.endsWith(".js"));
  const budget = {
    shellGzip: await bytes(shell, true),
    battleIncrementalGzip: await bytes(
      allJS.filter((p) => !shell.includes(p)),
      true,
    ),
    assetsEncoded: await bytes(
      unique.filter((p) => p.startsWith("/assets/") || /\.woff2?$/.test(p)),
    ),
    resourceCount: unique.length,
  };
  const cdp = await page.context().newCDPSession(page);
  const cycles = [];
  for (
    let cycle = 0;
    cycle <
    (process.env.OATHFRONT_BENCHMARK_SMOKE || diagnostic || lowDiagnostic
      ? 2
      : 20);
    cycle++
  ) {
    await page.locator(".brand").click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await cdp.send("HeapProfiler.collectGarbage");
    const sample = await page.evaluate(() => ({
      ...window.qualityMetrics,
      frames: undefined,
      longTasks: undefined,
      heap:
        (performance as Performance & { memory?: { usedJSHeapSize: number } })
          .memory?.usedJSHeapSize ?? null,
    }));
    const heap = await cdp.send("Runtime.getHeapUsage");
    cycles.push({ ...sample, heap: heap.usedSize });
    await page
      .getByRole("button", { name: "Tiếp tục trận", exact: true })
      .click();
    await expect(page.locator('[data-scene-status="ready"]')).toBeVisible();
  }
  await page.screenshot({
    path: `docs/implementation/evidence/task16/benchmark${frameTrace ? "-postfix-trace" : lowDiagnostic ? "-low-diagnostic" : diagnostic ? "-diagnostic" : ""}.png`,
  });
  const result = {
    idle: idle
      ? {
          median: percentile(idle, 0.5),
          p95: percentile(idle, 0.95),
          p99: percentile(idle, 0.99),
        }
      : null,
    browser: browser.version(),
    renderer,
    quality: lowDiagnostic ? "low" : "auto",
    requestedAssetPaths: unique.filter((path) =>
      /atlas|terrain|board/.test(path),
    ),
    particleSystems: 0,
    frameMetric:
      "Primary: spacing of rAF-supplied timestamps. Additional diagnostic: performance.now callback-entry spacing. Neither measures GPU presentation/compositor frames directly.",
    runs,
    cycles,
    budget,
    resources,
    errors,
    textureAccounting:
      "Observed RGBA texImage2D allocations; excludes driver/framebuffer overhead and DOM decoded images.",
    network: "loopback, unthrottled; cold profile then warmed assets",
  };
  await writeFile(
    `docs/implementation/evidence/task16/performance${frameTrace ? "-postfix-trace" : lowDiagnostic ? "-low-diagnostic" : diagnostic ? "-diagnostic" : process.env.OATHFRONT_BENCHMARK_SMOKE ? "-smoke" : ""}.json`,
    JSON.stringify(result, null, 2),
  );
  if (
    process.env.OATHFRONT_BROWSER === "chrome" &&
    !process.env.OATHFRONT_BENCHMARK_SMOKE &&
    !diagnostic
  ) {
    for (const run of runs) {
      expect
        .soft(Number(run.median.toFixed(1)), "median frame ms")
        .toBeLessThanOrEqual(16.7);
      expect
        .soft(Number(run.p95.toFixed(1)), "p95 frame ms")
        .toBeLessThanOrEqual(20);
      expect
        .soft(Number(run.p99.toFixed(1)), "p99 frame ms")
        .toBeLessThanOrEqual(33.3);
    }
  }
  expect(
    runs.every((r) => r.canvasSizes.length <= 2),
    "stable canvas dimensions during effects",
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(
    runs.every(
      (r) =>
        r.commands >
        (diagnostic ? 15 : process.env.OATHFRONT_BENCHMARK_SMOKE ? 2 : 100),
    ),
  ).toBe(true);
  expect(cycles.every((c) => c.live === 0)).toBe(true);
  if (process.env.OATHFRONT_E2E_PRODUCTION === "1") {
    expect(budget.shellGzip).toBeGreaterThan(0);
    expect(budget.shellGzip).toBeLessThanOrEqual(300_000);
    expect(budget.battleIncrementalGzip).toBeLessThanOrEqual(900_000);
  }
  expect(budget.assetsEncoded).toBeLessThanOrEqual(12_000_000);
  expect(Math.max(...runs.map((r) => r.peakBytes))).toBeLessThanOrEqual(
    128_000_000,
  );
  expect(Math.max(...runs.map((r) => r.cls))).toBeLessThanOrEqual(0.1);
});
