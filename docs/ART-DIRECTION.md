# Fivefold card illustration direction

OathFront uses sixty original card illustrations keyed to the immutable `core_v1` card IDs. The six existing Fivefold heroes anchor the rendering and material vocabulary, while every card has its own subject and composition. The [Marvel Rivals Team-Up roster](https://www.marvelrivals.com/heroes/teamup.html) is the primary reference for mature heroic proportions, clear silhouettes, faceted materials and controlled edge light on the thirty-eight units. The [ArtStation observations](reference/artstation-card-art.md) inform thumbnail checking and single-event ability composition. Third-party reference artwork is not included in the game or generation inputs.

Dawnward units use ivory, jade, cyan and warm gold. Bastion reads as broad protection, Verdant as living wood and seed growth, and Prism as hard-light diagonals and glass planes. Ashen Court uses charcoal, crimson, amber and violet. Furnace reads as iron and heat, Hex as geometric ink seals, and Veil as crescent forms and smoke. The full roster includes humans, constructs and creatures; faces, poses, weapons and anatomy remain distinct from the six heroes and from other cards.

The thirty-eight unit masters are full-figure transparent PNGs. The twenty-two trick masters are opaque square action scenes with one focal event. No art carries names, rules, statistics, card borders or interface labels. All semantic information remains rendered by the UI. The exporter contains unit alpha silhouettes within square card/board frames and keeps trick scenes full bleed. Collection, hand, inspect and battle use the same stable ID to resolve the matching art.

Collection art fits inside its reserved card slot so full figures and scenes stay visible. At desktop battle size, each occupied unit tile reserves an 88×88 art region beside the stat plate, with the complete name above. The compact 1024×640 board keeps its tighter existing arrangement and visible End phase control.

## Production and handoff

Exact prompts, selected masters and per-ID generation records live in `assets/source/fivefold-cards-v3`. Run `python3 tools/assets/export-fivefold-cards.py` from the repository root after all sixty masters are present. The exporter checks the source hash, dimensions, alpha and prompt for each ID; rejects duplicate masters; produces 256×256 card thumbs, 512×512 inspect art, 512×512 unit cutouts, low/high combined unit atlases and readable review sheets; and writes source and runtime manifests. Output paths are under `apps/web/public/assets/fivefold-cards-v3`. The eight existing terrain strips, power art, and three existing token illustrations stay supported without regeneration.

The card manifest is the handoff for the Pen layout and the web UI. `assets[*].id` and `artKey` map to canonical content; `thumb`, `inspect` and unit-only `cutout` are the usable DOM variants. `atlases` hold one complete page for each battle quality with thirty-eight units, six existing hero identities and three token frames. Pen card treatments should preserve the art slot, cost/name/stats/rules hierarchy and original faction cues. Use actual exported card art and inspect variants when judging framing; do not substitute the reference artwork or bake labels into images.

The source manifest records hashes, sizes, prompts and provenance. The runtime manifest and `budgets.json` record request and decode costs. Review sheets group units and tricks by ID and show a small unit preview at board scale. Each source and derivative should be checked individually when a sheet suggests a clipped silhouette, lost focal point, accidental text or a visual duplicate.

The completed source set contains 60 distinct 1254×1254 PNG masters: 38 with real transparent alpha and 22 opaque trick scenes. Bounded WebP thumb files range from 18,774 to 35,912 bytes; 512px inspect and cutout files range from 52,078 to 107,842 bytes. The combined low atlas is 924×924 and 456,874 bytes; the high atlas is 1820×1820 and 1,322,566 bytes. Each has 47 populated frames.

| Battle quality | Network entry bytes: atlas + board + eight terrain strips | Decoded RGBA allocation for the same images |
|---|---:|---:|
| Low | 989,646 bytes | 11,796,544 bytes |
| High | 1,855,338 bytes | 21,631,040 bytes |

The network entry figures stay below the 12 MB budget. They exclude card inspect files, which are requested by the relevant DOM surface when needed. The decoded figures describe uncompressed RGBA pixel allocation, not transfer size. `python3 tools/assets/inspect-fivefold.py` independently checks source/export hashes, actual alpha, dimensions and atlas frames; the CI workflow installs the pinned Pillow requirement before tests.
