import { it, expect } from "vitest";
import { validateWire } from "../src/wire.js";
import { validateBrowserWire } from "../src/browser.js";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { WireDefinitions } from "../src/generated/api-v1.js";
it("browser validators agree with canonical Node validators on valid and closed-invalid DTOs", () => {
  const cases: [keyof WireDefinitions, unknown, boolean][] = [
    ["PlayerAction", { kind: "PASS_PHASE" }, true],
    ["PlayerAction", { kind: "PASS_PHASE", seed: "private" }, false],
    [
      "CommandEnvelope",
      {
        commandId: "20000000-0000-4000-8000-000000000001",
        expectedRevision: 9,
        action: { kind: "PASS_PHASE" },
      },
      true,
    ],
    [
      "CommandEnvelope",
      {
        commandId: "20000000-0000-4000-8000-000000000001",
        expectedRevision: "9",
        action: { kind: "PASS_PHASE" },
      },
      false,
    ],
    [
      "GuestRequest",
      {
        commandId: "20000000-0000-4000-8000-000000000001",
        recoverySecret: "A".repeat(43),
      },
      true,
    ],
    ["SessionResponse", {}, false],
    ["CommandResponse", { view: { seed: "secret" } }, false],
    ["PublicCatalog", null, false],
  ];
  for (const [definition, value, expected] of cases) {
    expect(validateBrowserWire(definition, value)).toBe(expected);
    expect(validateWire(definition, value)).toBe(expected);
  }
});
it("browser validation executes with string code generation disabled and excludes runtime compiler", async () => {
  const built = await build({
    stdin: {
      contents:
        "import {validateBrowserWire} from './packages/contracts/src/browser.ts'; if (!validateBrowserWire('PlayerAction',{kind:'PASS_PHASE'}) || validateBrowserWire('PlayerAction',{kind:'PASS_PHASE',seed:'secret'})) throw Error('invalid validation');",
      resolveDir: import.meta.dirname + "/../../..",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    metafile: true,
  });
  expect(
    Object.keys(built.metafile!.inputs).some((path) =>
      path.includes("ajv/dist/compile/"),
    ),
  ).toBe(false);
  expect(() =>
    execFileSync(
      process.execPath,
      ["--disallow-code-generation-from-strings", "--input-type=module"],
      { input: built.outputFiles![0]!.text, stdio: "pipe" },
    ),
  ).not.toThrow();
});

const examples = JSON.parse(
  readFileSync(
    new URL("../../../docs/contracts/examples/index.json", import.meta.url),
    "utf8",
  ),
) as { file: string; schemaDefinition: keyof WireDefinitions }[];
it.each(examples)(
  "browser/Node parity for canonical $file and forbidden extensions",
  ({ file, schemaDefinition }) => {
    const value: unknown = JSON.parse(
      readFileSync(
        new URL("../../../docs/contracts/examples/" + file, import.meta.url),
        "utf8",
      ),
    );
    expect(validateWire(schemaDefinition, value)).toBe(true);
    expect(validateBrowserWire(schemaDefinition, value)).toBe(true);
    if (value === null || typeof value !== "object")
      throw Error("Expected canonical object fixture");
    const invalid = { ...value, seed: "forbidden-private-extension" };
    expect(validateWire(schemaDefinition, invalid)).toBe(false);
    expect(validateBrowserWire(schemaDefinition, invalid)).toBe(false);
  },
);
