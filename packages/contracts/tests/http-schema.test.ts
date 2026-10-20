import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateWire, serializeWire } from "../src/wire.js";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (path: string): unknown =>
  JSON.parse(readFileSync(root + path, "utf8"));
const fixtures = read("docs/contracts/examples/index.json") as {
  file: string;
  schemaDefinition: string;
}[];
describe("canonical HTTP boundary", () => {
  it.each(fixtures)(
    "accepts $file with $schemaDefinition",
    ({ file, schemaDefinition }) => {
      const value = read("docs/contracts/examples/" + file);
      expect(validateWire(schemaDefinition, value)).toBe(true);
      expect(JSON.parse(serializeWire(schemaDefinition, value))).toEqual(value);
    },
  );
  it.each([
    [
      "seed",
      (v: Record<string, unknown>) => {
        v.seed = "private";
      },
    ],
    [
      "unknown field",
      (v: Record<string, unknown>) => {
        v.surprise = true;
      },
    ],
    [
      "hidden location",
      (v: Record<string, unknown>) => {
        (v.board as { location: object }[])[4]!.location = {
          state: "HIDDEN",
          revealTurn: 5,
          definitionId: "volcano",
        };
      },
    ],
    [
      "opponent power ID",
      (v: Record<string, unknown>) => {
        v.blockResponse = {
          visibility: "OPPONENT",
          side: "GOOD",
          laneId: 1,
          powerId: "P_B1",
        };
      },
    ],
    [
      "lane six",
      (v: Record<string, unknown>) => {
        (v.board as { laneId: number }[])[0]!.laneId = 6;
      },
    ],
  ] as const)("rejects private or invalid view: %s", (_, mutate) => {
    const view = read(
      "docs/contracts/examples/block-opponent.view.json",
    ) as Record<string, unknown>;
    mutate(view);
    expect(validateWire("PlayerView", view)).toBe(false);
    expect(() => serializeWire("PlayerView", view)).toThrow();
  });
  it("does not coerce string revisions or strip unknown request fields", () => {
    const value = read(
      "docs/contracts/examples/play-unit.request.json",
    ) as Record<string, unknown>;
    value.expectedRevision = "0";
    expect(validateWire("CommandEnvelope", value)).toBe(false);
    expect(value.expectedRevision).toBe("0");
    value.expectedRevision = 0;
    value.seed = "private";
    expect(validateWire("CommandEnvelope", value)).toBe(false);
    expect(value.seed).toBe("private");
  });
  it("rejects unknown definitions rather than accepting arbitrary values", () => {
    expect(() => validateWire("RawPrivateMatch", {})).toThrow();
  });
  it("keeps the generated schema identical to the canonical source", () => {
    expect(
      readFileSync(
        root + "packages/contracts/schema/api-v1.schema.json",
        "utf8",
      ),
    ).toBe(readFileSync(root + "docs/contracts/api-v1.schema.json", "utf8"));
  });
});
