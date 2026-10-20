import { build } from "esbuild";
await build({
  entryPoints: ["apps/api/src/persistence.ts"],
  outfile: "apps/api/dist/persistence.mjs",
  platform: "node",
  target: "node24",
  format: "esm",
  bundle: true,
  external: ["pg", "pg-native", "ajv"],
  banner: {
    js: "import {createRequire as oathfrontCreateRequire} from 'node:module'; const require=oathfrontCreateRequire(import.meta.url);",
  },
});
