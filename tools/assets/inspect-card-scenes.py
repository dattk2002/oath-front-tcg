"""Independently inspect scene source/export bytes, opacity and provenance."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEFAULT = ROOT / "apps/web/public/assets/card-scenes-v1/source-manifest.json"


def path_for(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else ROOT / path


def verify_file(row: dict) -> Path:
    path = path_for(row["path"])
    data = path.read_bytes()
    if len(data) != row["bytes"] or hashlib.sha256(data).hexdigest() != row["sha256"]:
        raise ValueError(f"Hash/size mismatch: {path}")
    return path


def verify_image(row: dict) -> Image.Image:
    path = verify_file(row)
    with Image.open(path) as image:
        image.load()
        actual_alpha = "A" in image.getbands() and image.getchannel("A").getextrema()[0] < 255
        if image.size != (row["width"], row["height"]) or actual_alpha != row["alpha"]:
            raise ValueError(f"Image metadata mismatch: {path}")
        if actual_alpha or image.mode not in ("RGB", "RGBA"):
            raise ValueError(f"Card face must be opaque: {path}")
        copied = image.copy()
        copied.format = image.format
        return copied


def inspect(manifest_path: Path, partial: bool = False) -> list[str]:
    issues = []
    manifest = json.loads(manifest_path.read_text())
    if manifest.get("version") != "card-scenes-v1" or manifest.get("catalogVersion") != "elements_v1":
        issues.append("Wrong scene manifest version")
    inventory_path = ROOT / "assets/source/card-scenes-v1/inventory.json"
    if path_for(manifest["inventory"]["path"]).resolve() != inventory_path.resolve():
        issues.append("Canonical scene inventory path mismatch")
    inventory = json.loads(verify_file(manifest["inventory"]).read_text())["assets"]
    required = {r["id"] for r in inventory if r["type"] != "TRICK"}
    ids = [r["id"] for r in manifest["assets"]]
    if len(ids) != len(set(ids)) or not set(ids) <= required:
        issues.append("Duplicate or unknown scene IDs")
    missing = sorted(required - set(ids))
    if sorted(manifest["missingSceneIds"]) != missing or manifest["complete"] != (not missing):
        issues.append("Invalid completeness metadata")
    if not partial and (missing or len(ids) != 53):
        issues.append("Final export requires all 53 opaque scene masters")
    if len({r["source"]["sha256"] for r in manifest["assets"]}) != len(ids):
        issues.append("Duplicate scene source hashes")
    canonical = {r["id"]: r for r in inventory}
    for row in manifest["assets"]:
        id = row["id"]
        try:
            if any(row[k] != canonical[id][k] for k in ("artKey", "name", "type", "system")):
                raise ValueError(f"Canonical metadata mismatch: {id}")
            source_root = ROOT / "assets/source/card-scenes-v1"
            expected_paths = {
                "source": source_root / "masters" / f"{id}.png",
                "prompt": source_root / "prompts" / f"{id}.txt",
                "generation": source_root / "generation" / f"{id}.json",
                "referenceSource": ROOT / canonical[id]["reference"],
            }
            for key, expected in expected_paths.items():
                if path_for(row[key]["path"]).resolve() != expected.resolve():
                    raise ValueError(f"Canonical {key} path mismatch: {id}")
            image = verify_image(row["source"])
            if image.width < 768 or image.height < 1024 or abs(image.width / image.height - .75) > .02:
                raise ValueError(f"Invalid portrait source: {id}")
            prompt = verify_file(row["prompt"])
            provenance = json.loads(verify_file(row["generation"]).read_text())
            verify_file(row["referenceSource"])
            expected_provenance = {
                "id": id, "version": "card-scenes-v1",
                "master": str(expected_paths["source"].relative_to(ROOT)),
                "prompt": str(expected_paths["prompt"].relative_to(ROOT)),
                "inputReference": canonical[id]["reference"],
                "dimensions": [image.width, image.height],
            }
            if any(provenance.get(key) != value for key, value in expected_provenance.items()):
                raise ValueError(f"Canonical provenance identity/path mismatch: {id}")
            if provenance != row["provenance"] or provenance["sha256"] != row["source"]["sha256"] or provenance["promptSha256"] != row["prompt"]["sha256"] or provenance["inputReferenceSha256"] != row["referenceSource"]["sha256"]:
                raise ValueError(f"Provenance mismatch: {id}")
            if not prompt.read_text().strip() or provenance["tool"] not in ("image_gen.imagegen", "image_gen built-in") or provenance["transparent_background"] is not False:
                raise ValueError(f"Missing exact image_gen prompt: {id}")
            if set(row["exports"]) != {"thumb", "inspect"}:
                raise ValueError(f"Only scene thumb/inspect exports allowed: {id}")
            for variant, size in (("thumb", (300, 400)), ("inspect", (720, 960))):
                expected = manifest_path.resolve().parent / "cards" / f"{id.lower()}-{variant}.webp"
                if path_for(row["exports"][variant]["path"]).resolve() != expected:
                    raise ValueError(f"Runtime {variant} path mismatch: {id}")
                exported = verify_image(row["exports"][variant])
                if exported.size != size or exported.format != "WEBP":
                    raise ValueError(f"Invalid {variant} export: {id}")
        except (ValueError, OSError, KeyError) as error:
            issues.append(str(error))
    tricks = manifest["retainedTricks"]
    if sorted(r["id"] for r in tricks) != sorted(r["id"] for r in inventory if r["type"] == "TRICK") or len(tricks) != 22:
        issues.append("All 22 original tricks must be retained")
    for row in tricks:
        try:
            id = row["id"]
            if any(row[k] != canonical[id][k] for k in ("artKey", "name", "type", "system")) or canonical[id]["type"] != "TRICK":
                raise ValueError(f"Canonical retained trick metadata mismatch: {id}")
            if set(row["exports"]) != {"thumb", "inspect"}:
                raise ValueError(f"Both original trick variants required: {id}")
            for variant in ("thumb", "inspect"):
                entry = row["exports"][variant]
                expected = ROOT / "apps/web/public/assets/fivefold-cards-v3/cards" / f"{id.lower()}-{variant}.webp"
                if path_for(entry["path"]).resolve() != expected.resolve():
                    raise ValueError(f"Original trick {variant} path mismatch: {id}")
                image = verify_image(entry)
                if image.size != ((256, 256) if variant == "thumb" else (512, 512)) or image.format != "WEBP":
                    raise ValueError(f"Invalid original trick {variant}: {id}")
        except (ValueError, OSError, KeyError) as error:
            issues.append(str(error))
    runtime = json.loads((manifest_path.parent / "manifest.json").read_text())
    expected_runtime = [{"id": r["id"], "artKey": r["artKey"], **{v: f"/assets/card-scenes-v1/cards/{r['id'].lower()}-{v}.webp" for v in ("thumb", "inspect")}} for r in manifest["assets"]]
    if runtime["assets"] != expected_runtime or runtime["complete"] != manifest["complete"] or "atlases" in runtime:
        issues.append("Runtime must contain only scene thumb/inspect overrides with no battle atlases")
    return issues


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT)
    parser.add_argument("--partial", action="store_true", help="Inspect an explicitly partial local preview")
    args = parser.parse_args()
    try:
        errors = inspect(args.manifest, args.partial)
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error))
    if errors:
        raise SystemExit("\n".join(errors))
    print("Scene source/export hashes, dimensions, opacity, provenance and retained tricks valid")
