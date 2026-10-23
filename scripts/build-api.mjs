import { build } from "esbuild";
const common = {
  platform: "node",
  target: "node24",
  format: "esm",
  bundle: true,
  external: ["pg", "pg-native", "ajv", "ws"],
  banner: {
    js: "import {createRequire as oathfrontCreateRequire} from 'node:module'; const require=oathfrontCreateRequire(import.meta.url);",
  },
};
await build({
  ...common,
  entryPoints: ["apps/api/src/persistence.ts"],
  outfile: "apps/api/dist/persistence.mjs",
});
await build({
  ...common,
  entryPoints: ["apps/api/src/server.ts"],
  outfile: "apps/api/dist/server.mjs",
});
await build({
  ...common,
  entryPoints: ["apps/api/src/app.ts"],
  outfile: "apps/api/dist/app.mjs",
});
await build({
  ...common,
  entryPoints: ["apps/api/src/hosted.ts"],
  outfile: "apps/api/dist/hosted.mjs",
});

await build({
  ...common,
  entryPoints: ["apps/api/src/maintenance/cli.ts"],
  outfile: "apps/api/dist/maintenance.mjs",
});
