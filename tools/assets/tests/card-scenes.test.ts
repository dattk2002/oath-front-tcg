import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { elementsCatalog } from "../../../packages/game-content/src/elements-v1.js";
import { contentName } from "../../../apps/web/src/content/english-content.js";
import {
  artById,
  battleAssetRequests,
  resolveArt,
} from "../../../apps/web/src/features/match/rendering/asset-manifest.js";

const source = "assets/source/card-scenes-v1";
const inventory = JSON.parse(readFileSync(`${source}/inventory.json`, "utf8"));
const hash = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

it("keeps all 75 canonical card faces with current names, systems and stable art keys", () => {
  const canonical = [...elementsCatalog.cards, ...elementsCatalog.tokens];
  expect(inventory.assets).toHaveLength(75);
  expect(new Set(inventory.assets.map((a: { id: string }) => a.id)).size).toBe(
    75,
  );
  expect(
    new Set(inventory.assets.map((a: { artKey: string }) => a.artKey)).size,
  ).toBe(75);
  for (const definition of canonical) {
    const row = inventory.assets.find(
      (a: { id: string }) => a.id === definition.id,
    );
    expect(row, definition.id).toMatchObject({
      id: definition.id,
      artKey: definition.artKey,
      name: contentName(definition.id),
    });
    expect(row.type).toBe("type" in definition ? definition.type : "TOKEN");
    expect(row.system).toBe(
      "classId" in definition ? definition.classId : null,
    );
  }
});

it("exports opaque portrait scenes with provenance, cache reuse and independently inspected hashes", () => {
  const output = mkdtempSync(join(tmpdir(), "oathfront-scenes-"));
  const args = [
    "tools/assets/export-card-scenes.py",
    "--partial",
    "--ids",
    "B01",
    "--output",
    output,
  ];
  try {
    const run = spawnSync("python3", args, { encoding: "utf8" });
    expect(run.status, run.stderr || run.stdout).toBe(0);
    const exported = JSON.parse(
      readFileSync(join(output, "source-manifest.json"), "utf8"),
    );
    const runtime = JSON.parse(
      readFileSync(join(output, "manifest.json"), "utf8"),
    );
    expect(exported.complete).toBe(false);
    expect(exported.assets).toHaveLength(1);
    expect(runtime.assets[0]).toEqual({
      id: "B01",
      artKey: "cards/b01.webp",
      thumb: "/assets/card-scenes-v1/cards/b01-thumb.webp",
      inspect: "/assets/card-scenes-v1/cards/b01-inspect.webp",
    });
    expect(runtime.atlases).toBeUndefined();
    const row = exported.assets[0];
    expect(row.source.sha256).toBe(hash(row.source.path));
    expect(row.prompt.sha256).toBe(hash(row.prompt.path));
    expect(row.generation.sha256).toBe(hash(row.generation.path));
    const modified = [];
    for (const [variant, dimensions] of [
      ["thumb", [300, 400]],
      ["inspect", [720, 960]],
    ] as const) {
      const entry = row.exports[variant];
      expect([entry.width, entry.height]).toEqual(dimensions);
      expect(entry.alpha).toBe(false);
      expect(entry.sha256).toBe(hash(entry.path));
      modified.push(statSync(entry.path).mtimeMs);
    }
    const rerun = spawnSync("python3", args, { encoding: "utf8" });
    expect(rerun.status, rerun.stderr || rerun.stdout).toBe(0);
    expect([
      statSync(row.exports.thumb.path).mtimeMs,
      statSync(row.exports.inspect.path).mtimeMs,
    ]).toEqual(modified);
    const inspectArgs = [
      "tools/assets/inspect-card-scenes.py",
      "--partial",
      "--manifest",
      join(output, "source-manifest.json"),
    ];
    const inspection = spawnSync("python3", inspectArgs, { encoding: "utf8" });
    expect(inspection.status, inspection.stderr || inspection.stdout).toBe(0);
    writeFileSync(row.exports.thumb.path, "corrupted");
    const damaged = spawnSync("python3", inspectArgs, { encoding: "utf8" });
    expect(damaged.status).not.toBe(0);
    expect(damaged.stderr).toMatch(/hash|size|image/i);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}, 120_000);

it("rejects transparent scene masters before writing any card-face output", () => {
  const run = spawnSync(
    "python3",
    [
      "-c",
      `
import hashlib, importlib.util, json, shutil, tempfile
from pathlib import Path
from PIL import Image
spec = importlib.util.spec_from_file_location("card_scenes", "tools/assets/export-card-scenes.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as directory:
    fixture = Path(directory) / "source"
    original = module.SOURCE
    for relative in ("inventory.json", "masters/B01.png", "prompts/B01.txt", "generation/B01.json"):
        target = fixture / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original / relative, target)
    master = fixture / "masters/B01.png"
    with Image.open(master) as image:
        transparent = image.convert("RGBA")
    transparent.putalpha(0)
    transparent.save(master)
    record_path = fixture / "generation/B01.json"
    record = json.loads(record_path.read_text())
    record.update(master=str(master), prompt=str(fixture / "prompts/B01.txt"), sha256=hashlib.sha256(master.read_bytes()).hexdigest())
    record_path.write_text(json.dumps(record))
    module.SOURCE = fixture
    output = Path(directory) / "output"
    try:
        module.export(output, partial=True, selected={"B01"})
    except ValueError as error:
        print(json.dumps({"error": str(error), "outputExists": output.exists()}))
`,
    ],
    { encoding: "utf8" },
  );
  expect(run.status, run.stderr || run.stdout).toBe(0);
  expect(JSON.parse(run.stdout)).toEqual({
    error: "Scene must be opaque RGB/RGBA: B01",
    outputExists: false,
  });
});

it("requires explicit partial mode for a selected export", () => {
  const run = spawnSync(
    "python3",
    ["tools/assets/export-card-scenes.py", "--ids", "B01"],
    { encoding: "utf8" },
  );
  expect(run.status).not.toBe(0);
  expect(run.stderr).toContain("--partial");
});

it("merges scene variants last while preserving original cutouts, trick faces and battle preload paths", () => {
  expect(resolveArt("cards/b01.webp", "Shieldseed").src).toBe(
    "/assets/card-scenes-v1/cards/b01-thumb.webp",
  );
  expect(resolveArt("cards/b01.webp", "Shieldseed", "inspect").src).toBe(
    "/assets/card-scenes-v1/cards/b01-inspect.webp",
  );
  expect(artById("B01")?.thumb).toBe(
    "/assets/card-scenes-v1/cards/b01-thumb.webp",
  );
  expect(artById("B01")?.cutout).toBe(
    "/assets/fivefold-cards-v3/cards/b01-cutout.webp",
  );
  expect(resolveArt("cards/b01.webp", "Shieldseed", "cutout").src).toBe(
    "/assets/fivefold-cards-v3/cards/b01-cutout.webp",
  );
  for (const row of inventory.assets.filter(
    (a: { type: string }) => a.type === "TRICK",
  )) {
    expect(resolveArt(row.artKey, row.name).src).toBe(
      `/assets/fivefold-cards-v3/cards/${row.id.toLowerCase()}-thumb.webp`,
    );
  }
  for (const quality of ["low", "high"] as const) {
    expect(battleAssetRequests("elements_v1", quality)).toEqual([
      `/assets/fivefold-cards-v3/atlases/cutouts-${quality}.webp`,
      `/assets/event-cards-v1/atlases/cutouts-${quality}.webp`,
      ...[
        "ancient_forest",
        "volcano",
        "storm_peak",
        "frozen_lake",
        "desert",
        "healing_spring",
        "ruined_arena",
        "quiet_meadow",
      ].map((id) => `/assets/core-v1/locations/${id}-strip.webp`),
      "/assets/rivals-v2/board/scene-wide.webp",
    ]);
  }
});

it("ships all 53 opaque scene masters and keeps all 75 card faces resolvable", () => {
  const manifest = JSON.parse(
    readFileSync("apps/web/public/assets/card-scenes-v1/manifest.json", "utf8"),
  );
  expect(manifest.complete).toBe(true);
  expect(manifest.assets).toHaveLength(53);
  const required = inventory.assets
    .filter((a: { type: string }) => a.type !== "TRICK")
    .map((a: { id: string }) => a.id)
    .sort();
  expect(manifest.assets.map((a: { id: string }) => a.id).sort()).toEqual(
    required,
  );
  const inspection = spawnSync(
    "python3",
    ["tools/assets/inspect-card-scenes.py"],
    { encoding: "utf8" },
  );
  expect(inspection.status, inspection.stderr || inspection.stdout).toBe(0);
  for (const row of inventory.assets) {
    for (const variant of ["thumb", "inspect"]) {
      const url = resolveArt(row.artKey, row.name, variant).src;
      expect(statSync(`apps/web/public${url}`).size).toBeGreaterThan(0);
      expect(artById(row.id)?.[variant]).toBe(url);
    }
  }
});

it("rejects forged scene identities, altered trick variants and unsafe output destinations", () => {
  const run = spawnSync(
    "python3",
    ["tools/assets/tests/card_scene_safety.py"],
    { encoding: "utf8" },
  );
  expect(run.status, run.stderr || run.stdout).toBe(0);
}, 120_000);
