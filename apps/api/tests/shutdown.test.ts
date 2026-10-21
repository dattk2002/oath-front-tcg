import { it, expect } from "vitest";
import { shutdownWithin } from "../src/shutdown.js";
it("waits for settlement before closing the pool and bounds a stuck shutdown", async () => {
  let release!: () => void;
  const order: string[] = [];
  const work = new Promise<void>((r) => {
    release = r;
  });
  const closing = shutdownWithin(
    async () => {
      await work;
      order.push("transaction");
    },
    async () => {
      order.push("pool");
    },
    1000,
  );
  await Promise.resolve();
  expect(order).toEqual([]);
  release();
  expect(await closing).toBe(true);
  expect(order).toEqual(["transaction", "pool"]);
  expect(
    await shutdownWithin(
      () => new Promise(() => {}),
      async () => {},
      20,
    ),
  ).toBe(false);
});
