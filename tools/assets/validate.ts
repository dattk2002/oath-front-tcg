import { createHash } from "node:crypto";
import { readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { AssetManifest, AssetFile } from "./types.js";
export async function validateManifest(
  path = "assets/source/manifest.json",
): Promise<string[]> {
  const issues: string[] = [];
  const manifest: AssetManifest = JSON.parse(await readFile(path, "utf8"));
  const ids = new Set<string>(),
    keys = new Set<string>();
  async function file(item: AssetFile) {
    try {
      const bytes = await readFile(item.path);
      if (createHash("sha256").update(bytes).digest("hex") !== item.sha256)
        issues.push(`Hash mismatch: ${item.path}`);
      if (bytes.length !== item.bytes)
        issues.push(`Size mismatch: ${item.path}`);
    } catch {
      issues.push(`Missing file: ${item.path}`);
    }
  }
  if (manifest.catalogVersion !== "core_v1" || manifest.version !== 1)
    issues.push("Unsupported manifest version");
  for (const asset of manifest.assets) {
    if (ids.has(asset.id) || keys.has(asset.artKey))
      issues.push(`Duplicate asset: ${asset.id}`);
    ids.add(asset.id);
    keys.add(asset.artKey);
    if (
      !asset.fallbackLabel ||
      asset.containsRulesText !== false ||
      !asset.license ||
      !asset.provenance
    )
      issues.push(`Missing semantic/provenance data: ${asset.id}`);
    if (
      asset.bounds.x < 0 ||
      asset.bounds.y < 0 ||
      asset.bounds.width <= 0 ||
      asset.bounds.height <= 0 ||
      asset.bounds.x + asset.bounds.width > asset.size.width ||
      asset.bounds.y + asset.bounds.height > asset.size.height
    )
      issues.push(`Invalid bounds: ${asset.id}`);
    if (
      asset.anchor.x < 0 ||
      asset.anchor.x > 1 ||
      asset.anchor.y < 0 ||
      asset.anchor.y > 1
    )
      issues.push(`Invalid anchor: ${asset.id}`);
    if (
      ["hero", "card", "power", "token", "terrain", "board"].includes(
        asset.kind,
      )
    ) {
      if (
        !asset.source.promptPath ||
        asset.source.tool !== "image_gen built-in"
      )
        issues.push(`Missing original raster provenance: ${asset.id}`);
      else
        try {
          await access(asset.source.promptPath);
        } catch {
          issues.push(`Missing prompt: ${asset.id}`);
        }
      if (!asset.exports.thumb || !asset.exports.inspect)
        issues.push(`Missing WebP exports: ${asset.id}`);
    }
    await file(asset.source);
    for (const exported of Object.values(asset.exports)) await file(exported);
    if (asset.cutout) {
      await file(asset.cutout);
      if (!asset.cutout.alpha) issues.push(`Missing cutout alpha: ${asset.id}`);
    }
  }
  for (const atlas of manifest.atlases) {
    await file(atlas);
    if (
      !atlas.width ||
      !atlas.height ||
      atlas.width > 2048 ||
      atlas.height > 2048
    )
      issues.push(`Atlas exceeds 2048: ${atlas.path}`);
    for (const frame of Object.values(atlas.frames))
      if (
        frame.x < 0 ||
        frame.y < 0 ||
        frame.x + frame.width > (atlas.width ?? 0) ||
        frame.y + frame.height > (atlas.height ?? 0)
      )
        issues.push(`Atlas frame out of bounds: ${atlas.path}`);
  }
  const inspection = spawnSync(
    "python3",
    ["tools/assets/inspect-exports.py", path],
    { encoding: "utf8" },
  );
  if (inspection.status !== 0)
    issues.push(
      inspection.stdout.trim() ||
        inspection.stderr.trim() ||
        "Image inspection failed",
    );
  return issues;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const issues = await validateManifest();
  if (issues.length) {
    console.error(issues.join("\n"));
    process.exitCode = 1;
  } else
    console.info(
      "Asset manifest valid: source/export SHA256, dimensions, alpha, bounds, provenance and atlases",
    );
}
