"""Preserve built-in source PNGs and optimize approved material maps for runtime.

Uses the arena-materials-v1 Pillow conversion approach. Only colorspace, uniform
resizing and WebP encoding are permitted here; no artwork, masks or relief maps
are invented by this script.
"""

from pathlib import Path
from PIL import Image, __version__ as pillow_version
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[5]
SOURCE = ROOT / "assets/source/arenas-v2/materials"
RUNTIME = ROOT / "apps/web/public/assets/arenas-v2/materials"
RESULTS = json.loads((SOURCE / "generation/tool-results.json").read_text())


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def preserve(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        if sha256(source) != sha256(destination):
            raise RuntimeError(f"Existing source differs: {destination}")
    else:
        shutil.copy2(source, destination)


def inspect(path):
    with Image.open(path) as im:
        result = {
            "path": str(path.relative_to(ROOT)),
            "dimensions": list(im.size),
            "mode": im.mode,
            "format": im.format,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }
        if "A" in im.getbands():
            alpha = im.getchannel("A")
            result["alphaExtrema"] = list(alpha.getextrema())
            result["alphaBounds"] = list(alpha.getbbox())
            result["alphaTest038Bounds"] = list(
                alpha.point(lambda value: 255 if value >= 97 else 0).getbbox()
            )
            result["transparentPixels"] = alpha.histogram()[0]
        return result


RUNTIME.mkdir(parents=True, exist_ok=True)
provenance = {
    "generator": RESULTS["generator"],
    "date": RESULTS["date"],
    "reference": "docs/design/concepts/moonroot-battlefield-v3-concept.png visually inspected for art direction only; not an image generation input or runtime texture",
    "postprocessing": "Pillow RGB/RGBA conversion, uniform LANCZOS resize from native 1254 square to 1024 square, WebP quality 86 / method 6 / alpha_quality 100 / exact true. No cropping, recoloring, compositing, retouching, alpha repair, generated pixels or bump/height maps.",
    "pillowVersion": pillow_version,
    "runtimeSize": [1024, 1024],
    "assets": {},
}

for name, asset in RESULTS["assets"].items():
    generated = Path(asset["generatedPath"])
    master = SOURCE / "masters" / f"{name}.png"
    runtime = RUNTIME / f"{name}.webp"
    preserve(generated, master)
    with Image.open(master) as original:
        mode = "RGBA" if "A" in original.getbands() else "RGB"
        resized = original.convert(mode).resize((1024, 1024), Image.Resampling.LANCZOS)
        resized.save(
            runtime, "WEBP", quality=86, method=6, alpha_quality=100, exact=True
        )
        with Image.open(runtime) as encoded:
            assert encoded.format == "WEBP" and encoded.size == (1024, 1024)
            if mode == "RGBA":
                assert encoded.getchannel("A").tobytes() == resized.getchannel("A").tobytes()
    prompt = SOURCE / asset["promptPath"]
    record = {
        "mode": asset["mode"],
        "originalGeneratedPath": str(generated),
        "sourceOriginalSha256Matches": sha256(generated) == sha256(master),
        "prompt": {
            "path": str(prompt.relative_to(ROOT)),
            "sha256": sha256(prompt),
            "exactPrompt": prompt.read_text().rstrip("\n"),
        },
        "master": inspect(master),
        "runtime": inspect(runtime),
    }
    if "previous" in asset:
        previous = asset["previous"]
        prior_master = SOURCE / "masters" / f"{name}-initial.png"
        preserve(Path(previous["generatedPath"]), prior_master)
        prior_prompt = SOURCE / previous["promptPath"]
        record["generationInput"] = {
            "originalGeneratedPath": previous["generatedPath"],
            "master": inspect(prior_master),
            "prompt": {
                "path": str(prior_prompt.relative_to(ROOT)),
                "sha256": sha256(prior_prompt),
                "exactPrompt": prior_prompt.read_text().rstrip("\n"),
            },
            "revisionReason": previous["reason"],
        }
        record["runtimeAlphaPreservedLosslesslyAfterResize"] = True
    provenance["assets"][name] = record

provenance["runtimeCombinedBytes"] = sum(
    asset["runtime"]["bytes"] for asset in provenance["assets"].values()
)
provenance["runtimeRgbaBytesWithMipmaps"] = 3 * sum(4 * (1024 >> n) ** 2 for n in range(11))
assert provenance["runtimeCombinedBytes"] <= 1_000_000
assert provenance["runtimeRgbaBytesWithMipmaps"] <= 20 * 1024 * 1024
(SOURCE / "generation/provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
print(json.dumps({
    "assets": {name: record["runtime"] for name, record in provenance["assets"].items()},
    "combinedBytes": provenance["runtimeCombinedBytes"],
    "rgbaBytesWithMipmaps": provenance["runtimeRgbaBytesWithMipmaps"],
}, indent=2))
