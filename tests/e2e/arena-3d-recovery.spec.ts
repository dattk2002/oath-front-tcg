import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import type { CommandResponse } from "../../packages/contracts/src/index.js";
import { response } from "../../apps/web/tests/fixtures.js";

// Exercise the real React mount, controller and renderer without API/DB servers.
// GPU faults are injected at browser APIs; no scene/controller behavior is mocked.
async function mountArena(
  page: Page,
  failure: "unavailable" | "fast-forward" | "resume" | "module" | "none",
  emptyBoard = false,
) {
  const bundle = await build({
    stdin: {
      contents: `
        import { createRoot } from "react-dom/client";
        import { useRef, useState } from "react";
        import BattleScene from "./src/features/match/BattleScene";
        import { createMatchViewStore } from "./src/features/match/view-store";
        const store = createMatchViewStore(window.initialArena);
        const catalog = { cards: [], tokens: [] };
        function Harness() {
          const presentation = useRef(null);
          const [view, setView] = useState(store.getSnapshot().authoritativeView);
          window.arenaPresentation = presentation;
          window.arenaStore = store;
          return <div className="match-screen arena-match"><div className="gameplay arena-stage" data-battle-root>
            <output aria-label="Presented enemy HP">{view.players.EVIL.hp}</output><section className="board" aria-label="Five-lane board"><div className="arena-decor" aria-hidden="true"/><ol className="lanes">{view.board.map(lane => <li className="lane" key={lane.laneId}><h2>Lane {lane.laneId}</h2>{window.arenaEmptyBoard ? <><div className="empty-slot" data-slot-lane={lane.laneId} data-slot-side="GOOD">Empty lane</div><button className="lane-target" data-lane-id={lane.laneId} disabled>Choose lane {lane.laneId}</button></> : <button className="empty-slot" data-slot-lane={lane.laneId} data-slot-side="GOOD" onClick={() => window.arenaCommands++}>Choose lane {lane.laneId}</button>}</li>)}</ol></section>
            <BattleScene store={store} catalog={catalog} presentation={presentation} onView={setView}/>
          </div></div>;
        }
        createRoot(document.getElementById("app")).render(<Harness/>);
      `,
      resolveDir: `${process.cwd()}/apps/web`,
      loader: "tsx",
    },
    plugins:
      failure === "module"
        ? [
            {
              name: "unavailable-scene-module",
              setup(builder) {
                builder.onResolve(
                  { filter: /^\.\/rendering\/three\/scene$/ },
                  () => ({
                    path: 'data:text/javascript,throw new Error("Expected unavailable scene module")',
                    external: true,
                  }),
                );
              },
            },
          ]
        : [],
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    write: false,
  });
  const css = await readFile("apps/web/src/styles/arena-3d.css", "utf8");
  await page.setContent(
    `<style>*{box-sizing:border-box}body{margin:0;font:16px sans-serif;color:#f5efdc;--primary:#d8ef9b;--campaign-display:sans-serif}button{font:inherit;color:inherit;background:#152431;border:1px solid #a4c2bb;border-radius:4px}.battle-scene-layer{position:absolute;inset:0}.battle-canvas{width:100%;height:100%}.board{background:#273d30}.arena-decor{position:absolute;inset:0;pointer-events:none}.lane{background:#233c3b}${css}</style><div id="app"></div>`,
  );
  await page.evaluate(
    ({ initial, failure, emptyBoard }) => {
      const w = window as typeof window & {
        initialArena: unknown;
        arenaEmptyBoard: boolean;
        arenaCommands: number;
        gpuAvailable: boolean;
        arenaPresentation: { current: unknown };
        startupDraws: number;
        injectedFailures: number;
        arenaListeners: Set<EventListenerOrEventListenerObject>;
        loadingHidden: boolean[];
      };
      w.initialArena = initial;
      w.arenaEmptyBoard = emptyBoard;
      w.arenaCommands = 0;
      w.gpuAvailable = failure !== "unavailable";
      w.startupDraws = 0;
      w.injectedFailures = 0;
      w.arenaListeners = new Set();
      w.loadingHidden = [];
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        kind: string,
        ...args: unknown[]
      ) {
        if (
          this.classList.contains("battle-canvas") &&
          kind.includes("webgl") &&
          !w.gpuAvailable
        )
          return null;
        return Reflect.apply(getContext, this, [kind, ...args]);
      } as typeof getContext;
      const clear = WebGL2RenderingContext.prototype.clear;
      WebGL2RenderingContext.prototype.clear = function (mask) {
        if (
          (window as typeof window & { failNextDraw?: boolean }).failNextDraw
        ) {
          (window as typeof window & { failNextDraw?: boolean }).failNextDraw =
            false;
          throw Error("Expected post-ready GPU failure");
        }
        const root = document.querySelector<HTMLElement>("[data-battle-root]");
        const layer = document.querySelector<HTMLElement>(
          "[data-scene-status]",
        );
        if (
          root?.getAttribute("data-arena-3d") === "ready" &&
          layer?.dataset.sceneStatus === "loading"
        ) {
          w.startupDraws++;
          if (
            (failure === "fast-forward" && w.startupDraws === 1) ||
            (failure === "resume" && w.startupDraws === 2)
          ) {
            w.injectedFailures++;
            throw Error("Expected synchronous startup GPU failure");
          }
        }
        return clear.call(this, mask);
      };
      const add = window.addEventListener;
      const remove = window.removeEventListener;
      window.addEventListener = function (
        this: Window,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if ((type === "online" || type === "offline") && listener)
          w.arenaListeners.add(listener);
        return add.call(this, type, listener, options);
      };
      window.removeEventListener = function (
        this: Window,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
      ) {
        if (listener) w.arenaListeners.delete(listener);
        return remove.call(this, type, listener, options);
      };
      new MutationObserver(() => {
        if (document.querySelector('[data-scene-status="loading"]')) {
          const board = document.querySelector(".board");
          if (board)
            w.loadingHidden.push(
              getComputedStyle(board).visibility === "hidden",
            );
        }
      }).observe(document.getElementById("app")!, {
        subtree: true,
        childList: true,
        attributes: true,
      });
    },
    { initial: response(), failure, emptyBoard },
  );
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
}

async function lifecycle(page: Page) {
  return page.evaluate(() => {
    const w = window as typeof window & {
      arenaPresentation: { current: unknown };
      arenaCommands: number;
      arenaListeners: Set<unknown>;
      injectedFailures: number;
      loadingHidden: boolean[];
    };
    return {
      controller: w.arenaPresentation.current !== null,
      commands: w.arenaCommands,
      listeners: w.arenaListeners.size,
      failures: w.injectedFailures,
      loadingHidden: w.loadingHidden,
    };
  });
}

test("WebGL unavailable requires explicit text-board choice and retry restores one renderer", async ({
  page,
}) => {
  await mountArena(page, "unavailable");
  await expect(page.locator('[data-scene-status="failed"]')).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Retry 3D", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/graphics acceleration/i)).toBeVisible();
  await expect(page.locator(".board")).toBeHidden();
  await expect(page.locator(".arena-decor")).toBeVisible();
  expect((await lifecycle(page)).loadingHidden).not.toContain(false);
  expect((await page.locator(".board").boundingBox())!.width).toBeGreaterThan(
    0,
  );
  await expect(page.locator(".board button")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Use text board", exact: true })
    .click();
  await expect(page.locator(".board")).toBeVisible();
  await page
    .getByRole("button", { name: "Choose lane 1", exact: true })
    .press("Enter");
  expect((await lifecycle(page)).commands).toBe(1);
  await page.evaluate(() => {
    (window as typeof window & { gpuAvailable: boolean }).gpuAvailable = true;
  });
  await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
  await expect(page.locator("canvas.battle-canvas")).toHaveCount(1);
  await expect(page.locator('.board [data-projected="true"]')).toHaveCount(5);
  expect(await lifecycle(page)).toMatchObject({
    controller: true,
    commands: 1,
    listeners: 2,
  });
  await expect(
    page.getByRole("button", { name: "Choose lane 1", exact: true }),
  ).toBeFocused();
});

for (const failure of ["fast-forward", "resume"] as const) {
  test(`synchronous startup ${failure} failure stays terminal and releases listeners`, async ({
    page,
  }) => {
    await mountArena(page, failure);
    await expect.poll(async () => (await lifecycle(page)).failures).toBe(1);
    await expect(page.locator('[data-scene-status="failed"]')).toHaveCount(1);
    await expect(page.locator("[data-battle-root]")).not.toHaveAttribute(
      "data-arena-3d",
      "ready",
    );
    expect(await lifecycle(page)).toMatchObject({
      controller: false,
      commands: 0,
      listeners: 0,
    });
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator('[data-scene-status="failed"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
    await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
    await expect(page.locator("canvas.battle-canvas")).toHaveCount(1);
    expect(await lifecycle(page)).toMatchObject({
      controller: true,
      commands: 0,
      listeners: 2,
    });
  });
}

test("context loss keeps text board opt-in and retry does not retain a disposed controller", async ({
  page,
}) => {
  await mountArena(page, "none");
  await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
  await page
    .getByRole("button", { name: "Choose lane 1", exact: true })
    .focus();
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      (canvas as HTMLCanvasElement)
        .getContext("webgl2")!
        .getExtension("WEBGL_lose_context")!
        .loseContext(),
    );
  await expect(page.locator('[data-scene-status="failed"]')).toHaveCount(1);
  await expect(page.getByText(/graphics context was lost/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry 3D", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".board")).toBeHidden();
  expect(await lifecycle(page)).toMatchObject({
    controller: false,
    commands: 0,
    listeners: 0,
  });
  await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(await lifecycle(page)).toMatchObject({
    controller: true,
    commands: 0,
    listeners: 2,
  });
});

test("a post-ready render failure releases resources and keeps the latest view recoverable", async ({
  page,
}) => {
  await mountArena(page, "none");
  await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
  await page.evaluate(() => {
    const w = window as typeof window & { failNextDraw: boolean };
    w.failNextDraw = true;
    window.dispatchEvent(new Event("online"));
  });
  await expect(page.locator('[data-scene-status="failed"]')).toHaveCount(1);
  await expect(page.getByText(/could not finish drawing/i)).toBeVisible();
  await expect(page.getByText(/graphics acceleration/i)).toHaveCount(0);
  const latest = response(2);
  latest.view.players.EVIL.hp = 9;
  await page.evaluate((dto) => {
    (
      window as typeof window & {
        arenaStore: { acceptResponse(dto: CommandResponse): void };
      }
    ).arenaStore.acceptResponse(dto);
  }, latest);
  await expect(page.getByLabel("Presented enemy HP")).toHaveText("9");
  expect(await lifecycle(page)).toMatchObject({
    controller: false,
    commands: 0,
    listeners: 0,
  });
  await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveCount(1);
});

for (const width of [375, 768, 1440]) {
  test(`graphics error panel remains readable and reachable at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await mountArena(page, "unavailable");
    const panel = page.locator(".battle-scene-error");
    await expect(panel).toBeVisible();
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(
      await panel.evaluate((node) => node.scrollHeight <= node.clientHeight),
    ).toBe(true);
    for (const name of ["Retry 3D", "Use text board"]) {
      const action = page.getByRole("button", { name, exact: true });
      await expect(action).toBeInViewport();
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const evidence =
      ".superpowers/sdd/2026-10-23-realtime-recovery/browser-evidence";
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: `${evidence}/error-${width}.png` });
    expect(errors).toEqual([]);
  });
}

test("a scene module load failure offers recovery without graphics-settings advice", async ({
  page,
}) => {
  await mountArena(page, "module");
  await expect(page.locator('[data-scene-status="failed"]')).toHaveCount(1);
  await expect(
    page.getByText(/battlefield resources could not load/i),
  ).toBeVisible();
  await expect(page.getByText(/graphics acceleration/i)).toHaveCount(0);
  await expect(page.locator(".board")).toBeHidden();
  expect(await lifecycle(page)).toMatchObject({
    controller: false,
    commands: 0,
    listeners: 0,
  });
  await page
    .getByRole("button", { name: "Use text board", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Choose lane 1", exact: true }),
  ).toBeFocused();
});

test("recovery returns keyboard focus to an empty board with no enabled targets", async ({
  page,
}) => {
  await mountArena(page, "unavailable", true);
  await page
    .getByRole("button", { name: "Use text board", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Five-lane board" }),
  ).toBeFocused();
  await page.evaluate(() => {
    (window as typeof window & { gpuAvailable: boolean }).gpuAvailable = true;
  });
  await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "Five-lane board" }),
  ).toBeFocused();
});
