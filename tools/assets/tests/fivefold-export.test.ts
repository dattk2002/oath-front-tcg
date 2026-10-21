import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";

it("exports distinct bounded four-card samples and one complete support atlas per quality", () => {
  const output = mkdtempSync(join(tmpdir(), "oathfront-fivefold-"));
  try {
    const run = spawnSync(
      "python3",
      [
        "tools/assets/export-fivefold-cards.py",
        "--ids",
        "GC01,EC01,GC05,EC05",
        "--output",
        output,
      ],
      { encoding: "utf8" },
    );
    expect(run.status, run.stderr || run.stdout).toBe(0);
    const manifest = JSON.parse(
      readFileSync(join(output, "source-manifest.json"), "utf8"),
    );
    const runtime = JSON.parse(
      readFileSync(join(output, "manifest.json"), "utf8"),
    );
    expect(manifest.assets.map((asset: { id: string }) => asset.id)).toEqual([
      "GC01",
      "GC05",
      "EC01",
      "EC05",
    ]);
    expect(runtime.assets).toHaveLength(4);
    expect(runtime.atlases).toHaveLength(2);
    for (const asset of manifest.assets) {
      expect(asset.source.sha256).toBe(
        createHash("sha256")
          .update(readFileSync(asset.source.path))
          .digest("hex"),
      );
      for (const variant of ["thumb", "inspect"]) {
        const exported = asset.exports[variant];
        expect(exported.bytes).toBe(statSync(exported.path).size);
        expect(exported.sha256).toBe(
          createHash("sha256")
            .update(readFileSync(exported.path))
            .digest("hex"),
        );
        expect(exported.width).toBe(variant === "thumb" ? 256 : 512);
        expect(exported.height).toBe(exported.width);
      }
      expect(asset.source.alpha).toBe(asset.kind === "unit");
    }
    expect(runtime.atlases[0].frames.GC01).toBeTruthy();
    expect(runtime.atlases[0].frames.EC01).toBeTruthy();
    expect(runtime.atlases[0].frames.GC05).toBeUndefined();
    expect(Object.keys(runtime.atlases[0].frames)).toHaveLength(11); // 2 units + 6 heroes + 3 tokens
    expect(runtime.atlases[0].url).toContain("cutouts-low.webp");
    expect(runtime.atlases[1].url).toContain("cutouts-high.webp");
    expect(existsSync(join(output, "review", "units-1.jpg"))).toBe(true);
    expect(existsSync(join(output, "review", "tricks-1.jpg"))).toBe(true);
    const inspection = spawnSync(
      "python3",
      [
        "tools/assets/inspect-fivefold.py",
        "--manifest",
        join(output, "source-manifest.json"),
      ],
      { encoding: "utf8" },
    );
    expect(inspection.status, inspection.stderr || inspection.stdout).toBe(0);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}, 120_000);
