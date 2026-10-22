"""Export opaque card scenes without touching battlefield cutouts or atlases.

The default requires all 53 scene masters. --partial is an explicit local preview
mode; --ids is allowed only with --partial. Run from any working directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/source/card-scenes-v1"
PUBLIC = ROOT / "apps/web/public/assets/card-scenes-v1"
VERSION = "card-scenes-v1"
SIZES = {"thumb": (300, 400), "inspect": (720, 960)}
EXPORT_SETTINGS = {"format": "WEBP", "quality": 88, "method": 6, "crop": "center-3:4", "version": 1}


def portable(path: Path) -> str:
    return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)


def metadata(path: Path, image: Image.Image | None = None) -> dict:
    data = path.read_bytes()
    row = {"path": portable(path), "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    if image is not None:
        row.update(width=image.width, height=image.height,
                   alpha="A" in image.getbands() and image.getchannel("A").getextrema()[0] < 255)
    return row


def write_if_changed(path: Path, data: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text() != data:
        path.write_text(data)


def validate_output(output: Path) -> None:
    """Reject destinations that could replace source or original runtime assets."""
    for protected in ((ROOT / "assets/source").resolve(), SOURCE.resolve()):
        if output.is_relative_to(protected) or protected.is_relative_to(output):
            raise ValueError(f"Protected source destination: {output}")
    runtime = (ROOT / "apps/web/public/assets").resolve()
    scenes = runtime / VERSION
    if (output.is_relative_to(runtime) or runtime.is_relative_to(output)) and not output.is_relative_to(scenes):
        raise ValueError(f"Protected original runtime destination: {output}")
    for relative in ("manifest.json", "source-manifest.json", "cards"):
        if not (output / relative).resolve().is_relative_to(output):
            raise ValueError(f"Protected output symlink destination: {output / relative}")
    for name in ("manifest.json", "source-manifest.json"):
        path = output / name
        if not path.exists():
            continue
        try:
            manifest = json.loads(path.read_text())
            compatible = manifest.get("version") == VERSION and manifest.get("catalogVersion") == "elements_v1" and isinstance(manifest.get("assets"), list)
        except (ValueError, OSError, AttributeError):
            compatible = False
        if not compatible:
            raise ValueError(f"Incompatible existing manifest: {path}")


def inventory_rows() -> list[dict]:
    inventory = json.loads((SOURCE / "inventory.json").read_text())
    rows = inventory["assets"]
    if inventory.get("version") != VERSION or len(rows) != 75:
        raise ValueError("Expected the versioned 75-card-face inventory")
    for field in ("id", "artKey"):
        if len({r[field] for r in rows}) != 75:
            raise ValueError(f"Duplicate inventory {field}")
    if {kind: sum(r["type"] == kind for r in rows) for kind in ("UNIT", "TOKEN", "TRICK")} != {"UNIT": 50, "TOKEN": 3, "TRICK": 22}:
        raise ValueError("Expected 50 units, 3 tokens and 22 retained tricks")
    systems = {None, "GROVE", "TERRA", "TIDE", "TEMPEST", "SOLAR", "FORGE", "ARCANE", "UMBRAL"}
    for row in rows:
        if not row.get("name") or row["system"] not in systems or row["artKey"] != f"cards/{row['id'].lower()}.webp":
            raise ValueError(f"Invalid canonical inventory metadata: {row['id']}")
        if not (ROOT / row["reference"]).is_file():
            raise ValueError(f"Missing reference: {row['id']}")
    return rows


def validated_scene(row: dict) -> tuple[dict, Image.Image]:
    id = row["id"]
    master_path = SOURCE / "masters" / f"{id}.png"
    prompt_path = SOURCE / "prompts" / f"{id}.txt"
    record_path = SOURCE / "generation" / f"{id}.json"
    record = json.loads(record_path.read_text())
    with Image.open(master_path) as opened:
        master = opened.copy()
    source = metadata(master_path, master)
    prompt, generation, reference = metadata(prompt_path), metadata(record_path), metadata(ROOT / row["reference"])
    if record.get("id") != id or record.get("version") != VERSION or record.get("tool") not in ("image_gen.imagegen", "image_gen built-in"):
        raise ValueError(f"Invalid image_gen provenance: {id}")
    for key, expected in (("master", portable(master_path)), ("prompt", portable(prompt_path)),
                          ("inputReference", row["reference"]), ("sha256", source["sha256"]),
                          ("promptSha256", prompt["sha256"]), ("inputReferenceSha256", reference["sha256"]),
                          ("dimensions", [master.width, master.height]), ("transparent_background", False)):
        if record.get(key) != expected:
            raise ValueError(f"Generation {key} mismatch: {id}")
    if master.mode not in ("RGB", "RGBA") or source["alpha"]:
        raise ValueError(f"Scene must be opaque RGB/RGBA: {id}")
    if master.width < 768 or master.height < 1024 or abs(master.width / master.height - .75) > .02:
        raise ValueError(f"Scene must be a full portrait master near 3:4: {id}")
    return {**row, "source": source, "prompt": prompt, "generation": generation,
            "referenceSource": reference, "provenance": record, "exports": {}}, master


def retained_tricks(rows: list[dict]) -> list[dict]:
    originals = json.loads((ROOT / "apps/web/public/assets/fivefold-cards-v3/manifest.json").read_text())["assets"]
    result = []
    for row in rows:
        if row["type"] != "TRICK":
            continue
        original = next(a for a in originals if a["id"] == row["id"])
        exports = {}
        for variant in SIZES:
            path = ROOT / "apps/web/public" / original[variant].lstrip("/")
            with Image.open(path) as image:
                exports[variant] = metadata(path, image)
            if exports[variant]["alpha"]:
                raise ValueError(f"Retained trick must be opaque: {row['id']}")
        result.append({**row, "exports": exports})
    return result


def export(output: Path, partial: bool = False, selected: set[str] | None = None) -> dict:
    if selected is not None and not partial:
        raise ValueError("--ids requires --partial; the default export requires all 53 scenes")
    output = output.resolve()
    validate_output(output)
    inventory = inventory_rows()
    required = [r for r in inventory if r["type"] != "TRICK"]
    if selected is not None and not selected <= {r["id"] for r in required}:
        raise ValueError("Unknown scene IDs (tricks retain their original artwork)")
    ready, missing = [], []
    # Validate all available sources before changing any output.
    for row in required:
        id = row["id"]
        paths = [SOURCE / "masters" / f"{id}.png", SOURCE / "prompts" / f"{id}.txt", SOURCE / "generation" / f"{id}.json"]
        if (selected is not None and id not in selected) or not all(p.is_file() for p in paths):
            missing.append(id)
        else:
            ready.append(validated_scene(row))
    if missing and not partial:
        raise ValueError(f"Missing scene masters/prompts/provenance ({len(missing)}): {', '.join(missing)}")
    if len({r[0]["source"]["sha256"] for r in ready}) != len(ready):
        raise ValueError("Duplicate scene master hash")
    tricks = retained_tricks(inventory)
    prior_path = output / "source-manifest.json"
    prior = json.loads(prior_path.read_text()) if prior_path.is_file() else {}
    previous = {r["id"]: r for r in prior.get("assets", [])} if prior.get("exportSettings") == EXPORT_SETTINGS else {}
    runtime_rows, source_rows = [], []
    reused = 0
    for row, master in ready:
        id = row["id"]
        runtime = {"id": id, "artKey": row["artKey"]}
        old = previous.get(id, {})
        cache_valid = all(old.get(key) == row[key] for key in ("source", "prompt", "generation"))
        for variant, size in SIZES.items():
            relative = f"cards/{id.lower()}-{variant}.webp"
            path = output / relative
            cached = old.get("exports", {}).get(variant)
            if cache_valid and cached and path.is_file() and metadata(path)["sha256"] == cached["sha256"]:
                with Image.open(path) as image:
                    valid = image.size == size and not ("A" in image.getbands() and image.getchannel("A").getextrema()[0] < 255)
                if valid:
                    row["exports"][variant] = metadata(path, image)
                    reused += 1
            if variant not in row["exports"]:
                image = ImageOps.fit(master.convert("RGB"), size, Image.Resampling.LANCZOS)
                path.parent.mkdir(parents=True, exist_ok=True)
                image.save(path, "WEBP", quality=EXPORT_SETTINGS["quality"], method=EXPORT_SETTINGS["method"], exact=True)
                with Image.open(path) as verified:
                    row["exports"][variant] = metadata(path, verified)
            runtime[variant] = f"/assets/{VERSION}/{relative}"
        source_rows.append(row)
        runtime_rows.append(runtime)
    complete = not missing
    common = {"version": VERSION, "catalogVersion": "elements_v1", "complete": complete, "expectedScenes": 53, "missingSceneIds": missing}
    source_manifest = {**common, "inventory": metadata(SOURCE / "inventory.json"), "exportSettings": EXPORT_SETTINGS,
                       "assets": source_rows, "retainedTricks": tricks}
    runtime_manifest = {**common, "assets": runtime_rows}
    write_if_changed(output / "source-manifest.json", json.dumps(source_manifest, indent=2) + "\n")
    write_if_changed(output / "manifest.json", json.dumps(runtime_manifest, indent=2) + "\n")
    return {"scenes": len(source_rows), "retainedTricks": len(tricks), "complete": complete, "reusedVariants": reused, "missingSceneIds": missing}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--partial", action="store_true", help="Explicit local preview; allow incomplete scene production")
    parser.add_argument("--ids", help="Comma-separated preview scene IDs; requires --partial")
    parser.add_argument("--output", type=Path, default=PUBLIC)
    args = parser.parse_args()
    try:
        print(json.dumps(export(args.output.resolve(), args.partial, set(args.ids.split(",")) if args.ids else None), indent=2))
    except (ValueError, KeyError, OSError) as error:
        raise SystemExit(str(error))
