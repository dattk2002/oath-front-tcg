"""Preserve native groundcover PNGs and encode the approved 512-square runtime map.

Uses the existing material pipeline: RGBA conversion, uniform LANCZOS resize,
WebP quality 86 / method 6 and lossless alpha. No artistic pixel modifications.
"""

from pathlib import Path
from PIL import Image, __version__ as pillow_version
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[5]
SOURCE = ROOT / "assets/source/arenas-v2/materials"
RUNTIME = ROOT / "apps/web/public/assets/arenas-v2/materials"
RESULTS = json.loads((SOURCE / "generation/groundcover-tool-results.json").read_text())
ASSET = RESULTS["assets"]["moonroot-groundcover"]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def preserve(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        assert sha256(source) == sha256(destination), f"Existing source differs: {destination}"
    else:
        shutil.copy2(source, destination)


def inspect(path):
    with Image.open(path) as im:
        alpha = im.getchannel("A")
        visible = alpha.point(lambda value: 255 if value >= 97 else 0).getbbox()
        return {
            "path": str(path.relative_to(ROOT)),
            "dimensions": list(im.size),
            "mode": im.mode,
            "format": im.format,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "alphaExtrema": list(alpha.getextrema()),
            "alphaBounds": list(alpha.getbbox()),
            "alphaTest038Bounds": list(visible),
            "alphaTest038MarginFractions": [
                visible[0] / im.width,
                visible[1] / im.height,
                (im.width - visible[2]) / im.width,
                (im.height - visible[3]) / im.height,
            ],
            "transparentPixels": alpha.histogram()[0],
        }


generated = Path(ASSET["generatedPath"])
initial = Path(ASSET["previous"]["generatedPath"])
master = SOURCE / "masters/moonroot-groundcover.png"
initial_master = SOURCE / "masters/moonroot-groundcover-initial.png"
runtime = RUNTIME / "moonroot-groundcover.webp"
preserve(generated, master)
preserve(initial, initial_master)
RUNTIME.mkdir(parents=True, exist_ok=True)
with Image.open(master) as original:
    assert original.mode == "RGBA" and original.getchannel("A").getextrema() == (0, 255)
    resized = original.convert("RGBA").resize((512, 512), Image.Resampling.LANCZOS)
    resized.save(runtime, "WEBP", quality=86, method=6, alpha_quality=100, exact=True)
    with Image.open(runtime) as encoded:
        assert encoded.format == "WEBP" and encoded.size == (512, 512)
        assert encoded.mode == "RGBA"
        assert encoded.getchannel("A").tobytes() == resized.getchannel("A").tobytes()

prompt = SOURCE / ASSET["promptPath"]
initial_prompt = SOURCE / ASSET["previous"]["promptPath"]
provenance = {
    "generator": RESULTS["generator"],
    "date": RESULTS["date"],
    "reference": "docs/design/concepts/moonroot-battlefield-v3-concept.png visually inspected for foliage palette only; not supplied to generation or used as a runtime texture",
    "postprocessing": "Pillow RGBA conversion, uniform LANCZOS resize from native 1254 square to 512 square, WebP quality 86 / method 6 / alpha_quality 100 / exact true. No cropping, recoloring, compositing, retouching, alpha repair, generated pixels or relief maps.",
    "pillowVersion": pillow_version,
    "originalGeneratedPath": str(generated),
    "sourceOriginalSha256Matches": sha256(generated) == sha256(master),
    "runtimeAlphaPreservedLosslesslyAfterResize": True,
    "recommendedAlphaTest": 0.38,
    "prompt": {
        "path": str(prompt.relative_to(ROOT)),
        "sha256": sha256(prompt),
        "exactPrompt": prompt.read_text().rstrip("\n"),
    },
    "generationInput": {
        "originalGeneratedPath": str(initial),
        "sourceOriginalSha256Matches": sha256(initial) == sha256(initial_master),
        "master": inspect(initial_master),
        "prompt": {
            "path": str(initial_prompt.relative_to(ROOT)),
            "sha256": sha256(initial_prompt),
            "exactPrompt": initial_prompt.read_text().rstrip("\n"),
        },
        "revisionReason": ASSET["previous"]["reason"],
    },
    "master": inspect(master),
    "runtime": inspect(runtime),
    "runtimeRgbaBytesWithMipmaps": sum(4 * (512 >> n) ** 2 for n in range(10)),
}
assert min(provenance["runtime"]["alphaTest038MarginFractions"]) >= 0.1
assert provenance["runtime"]["bytes"] < 250_000
assert provenance["runtimeRgbaBytesWithMipmaps"] == 1_398_100
(SOURCE / "generation/groundcover-provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
print(json.dumps({
    "master": provenance["master"],
    "runtime": provenance["runtime"],
    "runtimeRgbaBytesWithMipmaps": provenance["runtimeRgbaBytesWithMipmaps"],
    "runtimeAlphaPreservedLosslesslyAfterResize": provenance["runtimeAlphaPreservedLosslesslyAfterResize"],
}, indent=2))
