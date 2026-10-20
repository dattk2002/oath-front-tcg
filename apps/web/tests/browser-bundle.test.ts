import { it, expect } from "vitest";
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
it("actual browser app and public preview exclude private engine and runtime schema compiler", async () => {
  const app = await build({
    entryPoints: [import.meta.dirname + "/../src/app/App.tsx"],
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    metafile: true,
    minify: true,
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
  const text = app.outputFiles![0]!.text;
  expect(text).not.toMatch(
    /node:crypto|identityKey|createRandomStreams|MatchState|new Function\(/,
  );
  expect(gzipSync(text).length).toBeLessThan(300 * 1024);
});
