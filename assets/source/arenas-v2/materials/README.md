# Moonroot material sources

Generated with built-in `image_gen.imagegen` on 2026-10-23. The approved Moonroot v3 concept was viewed for art direction, but was not supplied to generation and is not used as a texture. The three material maps are original images. The fern received one built-in edit to improve its transparent margin.

`masters/` preserves the original PNG bytes, including the initial fern used as the edit input. Native generator output is 1254×1254 despite the requested 1024×1024. Exact initial and final prompts are in `prompts/`. `generation/tool-results.json` records the returned source locations, and `generation/provenance.json` records SHA256, dimensions, bytes, alpha information and the exact prompts.

Runtime maps are in `apps/web/public/assets/arenas-v2/materials/`:

| File | Intended role | Dimensions | Bytes |
| --- | --- | --- | ---: |
| `moonroot-stone.webp` | `stone-pale`, quiet neutral/cool limestone | 1024×1024 RGB | 258,690 |
| `aged-bark.webp` | `bark`, longitudinal grain along vertical UV | 1024×1024 RGB | 228,532 |
| `fern-frond.webp` | `foliage`, one upright full-image UV island | 1024×1024 RGBA | 147,700 |

Combined transfer size: 634,922 bytes. Conservatively decoded as RGBA with the complete mip chain: 16,777,212 bytes, approximately 16 MiB.

## Reproduction and verification

Run `python assets/source/arenas-v2/materials/generation/prepare_runtime.py` from the repository. This follows the existing arena-materials-v1 Pillow optimization approach: uniform LANCZOS resize, WebP quality 86 / method 6, lossless alpha encoding, and no artistic pixel editing. Source hashes must remain identical to built-in originals. The script checks dimensions, format, alpha equality after resizing and both budgets. It does not write the arena manifest.

Each selected source and runtime image was visually inspected. Stone is pale neutral/cool with restrained mineral variation, fine fissures and muted moss staining; no scene geometry, card slots, text, UI or cast shadows. Bark has flowing vertical gray-brown/olive grain and no scene silhouette. Both maps are suitable for seamless-like repetition, but mathematically seamless edges have not been established. Do not reuse either albedo as a bump or height map.

Fern is a single centered vertical frond with the stem at the bottom, no background and no cast shadow. Its generator supplied true alpha 0–255; the runtime WebP preserves the resized alpha losslessly. Use the planned `alphaTest: 0.38`: visible alpha-test bounds are `[252, 116, 793, 920]` in the 1024-square runtime image, leaving clear margins. Very faint generated low-alpha fringe pixels extend outside those visible bounds and are intentionally retained in the source; the runtime alpha test discards them. No mask was painted or repaired after generation.

Final material appearance, UV scale, seams and foliage silhouette in the lit 3D environment remain part of the renderer/model visual gate.
