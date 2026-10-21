"""Independent pixel/hash check for Fivefold masters and bounded exports."""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


def check_file(record: dict, issues: list[str]) -> Image.Image | None:
    path = Path(record["path"])
    try:
        data = path.read_bytes()
        if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
            issues.append(f"Hash/size mismatch: {path}")
        with Image.open(path) as opened:
            image = opened.copy()
        if image.size != (record["width"], record["height"]):
            issues.append(f"Dimensions mismatch: {path}")
        actual_alpha = image.mode == "RGBA" and image.getchannel("A").getextrema()[0] < 255
        if actual_alpha != record["alpha"]:
            issues.append(f"Alpha metadata mismatch: {path}")
        return image
    except (OSError, KeyError) as error:
        issues.append(f"Unreadable image: {path}: {error}")
        return None


def inspect(manifest_path: Path) -> list[str]:
    manifest = json.loads(manifest_path.read_text())
    issues = []
    for asset in manifest["assets"]:
        id, is_unit = asset["id"], asset["kind"] == "unit"
        source = check_file(asset["source"], issues)
        if source is not None:
            if source.size[0] != source.size[1] or source.size[0] < 1024:
                issues.append(f"Invalid master bounds: {id}")
            if (source.mode == "RGBA" and source.getchannel("A").getextrema()[0] < 255) != is_unit:
                issues.append(f"Wrong unit/trick transparency: {id}")
            if is_unit and (source.mode != "RGBA" or source.getchannel("A").getextrema()[1] < 240):
                issues.append(f"Empty or faint unit figure: {id}")
        if not Path(asset["promptPath"]).is_file() or not Path(asset["generationRecord"]).is_file():
            issues.append(f"Missing prompt/provenance: {id}")
        for variant, entry in asset["exports"].items():
            image = check_file(entry, issues)
            if image is None:
                continue
            expected = 256 if variant == "thumb" else 512
            if image.size != (expected, expected) or entry["bytes"] >= 450_000:
                issues.append(f"Unbounded {variant} export: {id}")
            if (image.mode == "RGBA" and image.getchannel("A").getextrema()[0] < 255) != is_unit:
                issues.append(f"Wrong {variant} alpha: {id}")
    for atlas in manifest["atlases"]:
        image = check_file(atlas, issues)
        if image is None:
            continue
        if image.width > 2048 or image.height > 2048 or image.mode != "RGBA":
            issues.append(f"Invalid atlas image: {atlas['path']}")
        for id, frame in atlas["frames"].items():
            bounds = (frame["x"], frame["y"], frame["x"] + frame["width"], frame["y"] + frame["height"])
            if min(bounds) < 0 or bounds[2] > image.width or bounds[3] > image.height:
                issues.append(f"Out-of-bounds atlas frame: {id}")
            elif image.crop(bounds).getchannel("A").getbbox() is None:
                issues.append(f"Empty atlas frame: {id}")
    return issues


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("assets/source/fivefold-cards-v3/manifest.json"))
    args = parser.parse_args()
    errors = inspect(args.manifest)
    if errors:
        raise SystemExit("\n".join(errors))
    print("Fivefold source/export hashes, alpha, dimensions and atlas frames valid")
