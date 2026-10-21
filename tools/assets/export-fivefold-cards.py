"""Deterministic Fivefold card exports from verified image_gen masters.

Run from the repository root. The default run requires every canonical card;
--ids is reserved for focused export verification while art is in production.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/source/fivefold-cards-v3"
PUBLIC = ROOT / "apps/web/public/assets/fivefold-cards-v3"
CORE = ROOT / "apps/web/public/assets/core-v1/manifest.json"
HEROES = ROOT / "assets/source/rivals-v2/heroes"
CORE_PUBLIC = ROOT / "apps/web/public/assets/core-v1"
HERO_FILES = {
    "H_G_BV": "briar", "H_G_BP": "aster", "H_G_VP": "lumen",
    "H_E_FX": "cinder", "H_E_FS": "vesper", "H_E_XS": "morrow",
}


def portable_path(path: Path) -> str:
    return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)


def file_metadata(path: Path, image: Image.Image | None = None) -> dict:
    data = path.read_bytes()
    result = {
        "path": portable_path(path),
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
    }
    if image is not None:
        result.update(width=image.width, height=image.height,
                      alpha=image.mode == "RGBA" and image.getchannel("A").getextrema()[0] < 255)
    return result


def composition(image: Image.Image, size: int, transparent: bool) -> Image.Image:
    if not transparent:
        return ImageOps.fit(image.convert("RGB"), (size, size), Image.Resampling.LANCZOS)
    alpha_bounds = image.getchannel("A").getbbox()
    if not alpha_bounds:
        raise ValueError("Empty transparent figure")
    figure = image.crop(alpha_bounds)
    inset = max(4, round(size * .055))
    fitted = ImageOps.contain(figure, (size - 2 * inset, size - 2 * inset), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, size - inset - fitted.height))
    return canvas


def save_webp(image: Image.Image, path: Path, quality: int = 86) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=quality, method=6, exact=True)
    with Image.open(path) as verified:
        return file_metadata(path, verified)


def validate_master(source: Path, record: dict, is_unit: bool) -> Image.Image:
    path = source / "masters" / f"{record['id']}.png"
    if record.get("path") != f"masters/{record['id']}.png":
        raise ValueError(f"Unexpected source path for {record['id']}")
    if not (source / "prompts" / f"{record['id']}.txt").is_file():
        raise ValueError(f"Missing exact prompt for {record['id']}")
    with Image.open(path) as opened:
        image = opened.copy()
    actual = file_metadata(path, image)
    for key in ("sha256", "bytes", "width", "height", "mode"):
        value = image.mode if key == "mode" else actual[key]
        if record.get(key) != value:
            raise ValueError(f"Source {key} mismatch for {record['id']}")
    if image.width != image.height or image.width < 1024:
        raise ValueError(f"Source is not a full square master for {record['id']}")
    extrema = image.getchannel("A").getextrema() if image.mode == "RGBA" else None
    if record.get("alphaExtrema") != (list(extrema) if extrema else None):
        raise ValueError(f"Source alpha metadata mismatch for {record['id']}")
    if is_unit:
        if image.mode != "RGBA" or extrema[0] != 0 or extrema[1] < 240:
            raise ValueError(f"Unit lacks actual transparent alpha: {record['id']}")
        if image.getchannel("A").getbbox() is None:
            raise ValueError(f"Empty unit figure: {record['id']}")
    elif image.mode not in ("RGB", "RGBA") or (image.mode == "RGBA" and image.getchannel("A").getextrema()[0] < 255):
        raise ValueError(f"Trick must be an opaque square composition: {record['id']}")
    return image


def build_atlases(units: list[tuple[str, Image.Image]], core: dict, output: Path) -> tuple[list[dict], list[dict]]:
    support: list[tuple[str, Image.Image]] = []
    for id, name in HERO_FILES.items():
        with Image.open(HEROES / f"{name}.png") as source:
            support.append((id, source.convert("RGBA")))
    for asset in core["assets"]:
        if asset["kind"] == "token":
            with Image.open(CORE_PUBLIC / "cutouts" / f"{asset['id'].lower()}.webp") as source:
                support.append((asset["id"], source.convert("RGBA")))
    # One complete page per quality: no duplicate full core unit atlas transfer.
    figures = support + units
    source_rows, runtime_rows = [], []
    for quality, pixels in (("low", 128), ("high", 256)):
        cell, columns = pixels + 4, 7
        rows = math.ceil(len(figures) / columns)
        page = Image.new("RGBA", (columns * cell, rows * cell))
        frames = {}
        for index, (id, figure) in enumerate(figures):
            x = index % columns * cell + 2
            y = index // columns * cell + 2
            page.alpha_composite(composition(figure, pixels, True), (x, y))
            frames[id] = {"x": x, "y": y, "width": pixels, "height": pixels}
        path = output / "atlases" / f"cutouts-{quality}.webp"
        metadata = save_webp(page, path, 90)
        source_rows.append({**metadata, "quality": quality, "frames": frames})
        runtime_rows.append({"url": f"/assets/fivefold-cards-v3/atlases/cutouts-{quality}.webp",
                             "quality": quality, "width": page.width, "height": page.height,
                             "bytes": metadata["bytes"], "frames": frames})
    return source_rows, runtime_rows


def make_review_sheets(rows: list[dict], output: Path) -> None:
    review = output / "review"
    review.mkdir(parents=True, exist_ok=True)
    for kind, name in (("unit", "units"), ("trick", "tricks")):
        group = [row for row in rows if row["kind"] == kind]
        for page_number in range(math.ceil(len(group) / 15)):
            sheet = Image.new("RGB", (1200, 900), "#101218")
            draw = ImageDraw.Draw(sheet)
            for index, row in enumerate(group[page_number * 15:(page_number + 1) * 15]):
                left = index % 5 * 240
                top = index // 5 * 300
                backing = "#24313A" if row["id"].startswith(("GC", "B", "V", "P")) else "#30242B"
                draw.rectangle((left + 4, top + 24, left + 236, top + 296), fill=backing)
                draw.text((left + 10, top + 7), row["id"], fill="#F0EFE8")
                with Image.open(row["exports"]["thumb"]["path"]) as image:
                    tile = image.convert("RGBA")
                tile.thumbnail((224, 224))
                sheet.paste(tile, (left + (240 - tile.width) // 2, top + 30), tile if kind == "unit" else None)
                if kind == "unit":
                    tiny = tile.copy()
                    tiny.thumbnail((72, 72))
                    sheet.paste(tiny, (left + 154, top + 215), tiny)
            sheet.save(review / f"{name}-{page_number + 1}.jpg", "JPEG", quality=92)


def export_cards(source: Path, output: Path, selected: set[str] | None = None) -> dict:
    core = json.loads(CORE.read_text())
    cards = [asset for asset in core["assets"] if asset["kind"] == "card"]
    expected = {asset["id"] for asset in cards}
    if len(cards) != 60 or len(expected) != 60:
        raise ValueError("Canonical card catalog is not sixty distinct IDs")
    if selected is not None and not selected <= expected:
        raise ValueError(f"Unknown card IDs: {sorted(selected - expected)}")
    if selected is not None:
        cards = [asset for asset in cards if asset["id"] in selected]
    source_rows, runtime_rows, units = [], [], []
    source_hashes = set()
    for card in cards:
        id = card["id"]
        record = json.loads((source / f"{id}-generation.json").read_text())
        if record.get("id") != id or record.get("tool") != "image_gen built-in":
            raise ValueError(f"Invalid generation record: {id}")
        is_unit = bool(card.get("cutout"))
        master = validate_master(source, record, is_unit)
        if record["sha256"] in source_hashes:
            raise ValueError(f"Reused card master: {id}")
        source_hashes.add(record["sha256"])
        relative_name = f"cards/{id.lower()}"
        exports = {}
        for variant, size in (("thumb", 256), ("inspect", 512)):
            path = output / f"{relative_name}-{variant}.webp"
            exports[variant] = save_webp(composition(master, size, is_unit), path)
        row = {"id": id, "kind": "card", "artKey": card["artKey"],
               "thumb": f"/assets/fivefold-cards-v3/{relative_name}-thumb.webp",
               "inspect": f"/assets/fivefold-cards-v3/{relative_name}-inspect.webp"}
        if is_unit:
            units.append((id, master))
            path = output / f"{relative_name}-cutout.webp"
            exports["cutout"] = save_webp(composition(master, 512, True), path)
            row["cutout"] = f"/assets/fivefold-cards-v3/{relative_name}-cutout.webp"
        source_rows.append({"id": id, "kind": "unit" if is_unit else "trick",
                            "artKey": card["artKey"], "source": file_metadata(source / "masters" / f"{id}.png", master),
                            "promptPath": portable_path(source / "prompts" / f"{id}.txt"),
                            "generationRecord": portable_path(source / f"{id}-generation.json"),
                            "provenance": "Original OathFront image_gen illustration; exact prompt and selected PNG retained.",
                            "license": "assets/source/LICENSE.md", "exports": exports})
        runtime_rows.append(row)
    if selected is None and (len(source_rows) != 60 or len(units) != 38):
        raise ValueError("Incomplete sixty-card / thirty-eight-unit export")
    source_atlases, runtime_atlases = build_atlases(units, core, output)
    make_review_sheets(source_rows, output)
    output.mkdir(parents=True, exist_ok=True)
    source_manifest = {"version": "fivefold-cards-v3", "catalogVersion": "core_v1",
                       "assets": source_rows, "atlases": source_atlases}
    runtime_manifest = {"version": "fivefold-cards-v3", "catalogVersion": "core_v1",
                        "assets": runtime_rows, "atlases": runtime_atlases}
    (output / "source-manifest.json").write_text(json.dumps(source_manifest, indent=2) + "\n")
    (output / "manifest.json").write_text(json.dumps(runtime_manifest, separators=(",", ":")) + "\n")
    if selected is None and source == SOURCE and output == PUBLIC:
        (source / "manifest.json").write_text(json.dumps(source_manifest, indent=2) + "\n")
    budget = {}
    strips = [asset["strip"] for asset in core["assets"] if asset["kind"] == "terrain"]
    board = ROOT / "apps/web/public/assets/rivals-v2/board/scene-wide.webp"
    for atlas in source_atlases:
        quality = atlas["quality"]
        strip_paths = [ROOT / "apps/web/public" / path.lstrip("/") for path in strips]
        with Image.open(board) as board_image:
            decoded = board_image.width * board_image.height * 4
        for path in strip_paths:
            with Image.open(path) as image:
                decoded += image.width * image.height * 4
        decoded += atlas["width"] * atlas["height"] * 4
        budget[quality] = {"preloadBytes": atlas["bytes"] + board.stat().st_size + sum(path.stat().st_size for path in strip_paths),
                           "decodedRGBABytes": decoded, "atlasPages": 1,
                           "terrainStrips": 8, "inspectImagesPreloaded": False}
        if budget[quality]["preloadBytes"] >= 12_000_000:
            raise ValueError(f"{quality} battle preload exceeds 12 MB")
    (output / "budgets.json").write_text(json.dumps(budget, indent=2) + "\n")
    return {"cards": len(source_rows), "units": len(units), "budgets": budget}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", help="Comma-separated subset for export verification")
    parser.add_argument("--output", type=Path, default=PUBLIC)
    args = parser.parse_args()
    selection = set(args.ids.split(",")) if args.ids else None
    print(json.dumps(export_cards(SOURCE, args.output.resolve(), selection), indent=2))
