"""Copy built-in originals and deterministically resize/encode runtime WebP only."""
from pathlib import Path
from PIL import Image, __version__ as pillow_version
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "assets/source/arena-materials-v1"
RUNTIME = ROOT / "apps/web/public/assets/arena-materials-v1"
result = json.loads((SOURCE / "generation/tool-results.json").read_text())
provenance = {
    "generator": "built-in image_gen.imagegen",
    "mode": "generate",
    "date": "2026-10-22",
    "postprocessing": "Pillow RGB conversion, LANCZOS resize to 1024 square, WebP quality 86 method 6; no retouching, compositing, generated textures, or edge repair",
    "pillow_version": pillow_version,
    "assets": {},
}

def inspect(path):
    with Image.open(path) as im:
        return {
            "path": str(path.relative_to(ROOT)),
            "dimensions": list(im.size),
            "mode": im.mode,
            "format": im.format,
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }

for name, asset in result["assets"].items():
    generated = Path(asset["generatedPath"])
    master = SOURCE / "masters" / f"{name}.png"
    runtime = RUNTIME / f"{name}.webp"
    if not master.exists():
        shutil.copy2(generated, master)
    with Image.open(master) as im:
        im.convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS).save(
            runtime, "WEBP", quality=86, method=6
        )
    prompt = SOURCE / "prompts" / f"{name}.txt"
    provenance["assets"][name] = {
        "original_generated_path": str(generated),
        "prompt": {
            "path": str(prompt.relative_to(ROOT)),
            "sha256": hashlib.sha256(prompt.read_bytes()).hexdigest(),
            "exact_prompt": prompt.read_text().rstrip("\n"),
        },
        "master": inspect(master),
        "runtime": inspect(runtime),
    }

(SOURCE / "generation/provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
print(json.dumps({name: a["runtime"] for name, a in provenance["assets"].items()}, indent=2))
