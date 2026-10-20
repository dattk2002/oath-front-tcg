import { it, expect } from "vitest";
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
it("split browser app excludes private engine/compiler and confines retained code generators to documented Pixi vendor paths", async () => {
  const app = await build({
    entryPoints: [import.meta.dirname + "/../src/app/App.tsx"],
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    metafile: true,
    minify: true,
    splitting: true,
    outdir: "/virtual-oathfront-browser",
    external: ["react", "react/*", "next/*"],
  });
  const paths = Object.keys(app.metafile!.inputs);
  expect(
    paths.some((path) =>
      /ajv\/dist\/(compile|core)|\/wire\.ts$|\/game-engine\/src\/(rng|identity|setup|automatic|actions|projection|hash|replay|model|server-events)\.ts$/.test(
        path,
      ),
    ),
  ).toBe(false);
  const text = app.outputFiles!.map((file) => file.text).join("\n");
  expect(text).not.toMatch(
    /node:crypto|identityKey|createRandomStreams|MatchState/,
  );
  // Pixi's documented CSP adapter replaces these implementations before renderer init.
  // Strict-CSP production E2E verifies the paths actually used by WebGL and effects.
  const allowed =
    /pixi\.js\/lib\/(utils\/browser\/unsafeEvalSupported|scene\/particle-container\/shared\/utils\/generateParticleUpdateFunction|rendering\/renderers\/(shared\/shader\/utils\/compileBufferSync|gl\/shader\/(GenerateShaderSyncCode|utils\/generateUniformsSync)))\.mjs$/;
  const generators = [];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    if (/new Function\(/.test(source)) generators.push(path);
  }
  expect(generators.length).toBeGreaterThan(0);
  expect(generators.filter((path) => !allowed.test(path))).toEqual([]);
  expect(
    paths.some((path) => /pixi\.js\/lib\/unsafe-eval\/init\.mjs$/.test(path)),
  ).toBe(true);
  const entry = app.outputFiles!.find((file) => file.path.endsWith("/App.js"))!;
  expect(gzipSync(entry.text).length).toBeLessThan(300 * 1024);
  const lazy = app
    .outputFiles!.filter((file) => file !== entry)
    .reduce((bytes, file) => bytes + gzipSync(file.text).length, 0);
  expect(lazy).toBeLessThan(900 * 1024);
});
