import { readFile, writeFile, mkdir } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";
import { createRequire } from "node:module";
import { build } from "esbuild";
const require = createRequire(
  new URL("../packages/contracts/package.json", import.meta.url),
);
const { Ajv } = require("ajv");
const addFormats = require("ajv-formats");
const standaloneCode = require("ajv/dist/standalone").default;
const source = await readFile(
  new URL("../docs/contracts/api-v1.schema.json", import.meta.url),
  "utf8",
);
const schema = JSON.parse(source);
let types = await compile(schema, "ApiV1", {
  unreachableDefinitions: true,
  bannerComment:
    "/* Generated from docs/contracts/api-v1.schema.json. Run pnpm contracts:generate. */",
  maxItems: -1,
});
types +=
  "\nexport interface WireDefinitions {\n" +
  Object.keys(schema.definitions)
    .map((name) => `  ${name}: ${name};`)
    .join("\n") +
  "\n}\n";
// One canonical schema also produces static browser validators. Ajv's code generator
// runs only here in Node; the shipped ESM contains no runtime compiler/eval.
const ajv = new Ajv({
  allErrors: true,
  strict: true,
  inlineRefs: false,
  code: { source: true },
});
addFormats(ajv);
ajv.addSchema(schema, "api");
const standalone = standaloneCode(
  ajv,
  Object.fromEntries(
    Object.keys(schema.definitions).map((name) => [
      name,
      `api#/definitions/${name}`,
    ]),
  ),
);
const browser = await build({
  stdin: {
    contents: standalone,
    resolveDir: new URL("../packages/contracts", import.meta.url).pathname,
    loader: "js",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  minify: true,
  legalComments: "none",
});
const banner =
  "/* Generated from docs/contracts/api-v1.schema.json. Run pnpm contracts:generate. */\n";
const outputs = [
  [
    "packages/contracts/src/generated/browser-wire.js",
    banner + browser.outputFiles[0].text,
  ],
  [
    "packages/contracts/src/generated/browser-wire.d.ts",
    banner +
      "import type { WireDefinitions } from './api-v1.js';\ndeclare const validators: { [K in keyof WireDefinitions]: (value: unknown) => boolean };\nexport default validators;\n",
  ],
  ["packages/contracts/schema/api-v1.schema.json", source],
  ["packages/contracts/src/generated/api-v1.ts", types],
];
for (const [path, content] of outputs) {
  const url = new URL("../" + path, import.meta.url);
  if (process.argv.includes("--check")) {
    if ((await readFile(url, "utf8").catch(() => "")) !== content)
      throw new Error(`Generated contract drift: ${path}`);
  } else {
    await mkdir(new URL(".", url), { recursive: true });
    await writeFile(url, content);
  }
}
