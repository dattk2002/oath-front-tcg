import { readFile, writeFile, mkdir } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";
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
const outputs = [
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
