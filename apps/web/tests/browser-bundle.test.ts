import { it, expect } from "vitest";
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
it("split browser app excludes private engine/compiler and loads Three without runtime code generators or a second renderer", async () => {
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
      /ajv\/dist\/(compile|core)|\/wire\.ts$|\/game-engine\/src\/(rng|identity|setup|automatic|actions|projection|hash|replay|model|server-events|tutorial)\.ts$/.test(
        path,
      ),
    ),
  ).toBe(false);
  const text = app.outputFiles!.map((file) => file.text).join("\n");
  expect(text).not.toMatch(
    /node:crypto|identityKey|createRandomStreams|MatchState|sceneSeedHex/,
  );
  // The lazy Three renderer needs no runtime JS compiler or legacy Pixi CSP adapter.
  const generators = [];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    if (/new Function\(/.test(source)) generators.push(path);
  }
  expect(generators).toEqual([]);
  expect(paths.some((path) => /pixi\.js\//.test(path))).toBe(false);
  expect(paths.some((path) => /three\/build\/three\.module\.js$/.test(path))).toBe(true);
  const entry = app.outputFiles!.find((file) => file.path.endsWith("/App.js"))!;
  expect(gzipSync(entry.text).length).toBeLessThan(300 * 1024);
  const lazy = app
    .outputFiles!.filter((file) => file !== entry)
    .reduce((bytes, file) => bytes + gzipSync(file.text).length, 0);
  expect(lazy).toBeLessThan(900 * 1024);
});
