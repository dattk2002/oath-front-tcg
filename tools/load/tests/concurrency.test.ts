import { expect, it } from "vitest";
import { parseConcurrency } from "../concurrency.js";

const argv = ["/usr/bin/node", "tools/load/pve.ts"];

it("defaults to 20 when --concurrency is omitted", () => {
  expect(parseConcurrency(argv)).toBe(20);
});

it.each([1, 7, 20])("accepts explicit integer concurrency %i", (value) => {
  expect(parseConcurrency([...argv, "--concurrency", String(value)])).toBe(value);
});

it("rejects an explicitly missing concurrency value", () => {
  expect(() => parseConcurrency([...argv, "--concurrency"])).toThrow(
    /--concurrency.*integer.*1.*20/i,
  );
});

it.each(["", " ", "abc", "--other", "NaN", "Infinity", "1.5", "0", "-1", "21"])(
  "rejects invalid or out-of-range concurrency %j",
  (value) => {
    expect(() => parseConcurrency([...argv, "--concurrency", value])).toThrow(
      /--concurrency.*integer.*1.*20/i,
    );
  },
);
