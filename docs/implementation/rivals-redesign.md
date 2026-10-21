# Rivals presentation implementation

The current OathFront interface uses a black, warm paper and electric yellow comic-game theme. English presentation is ID-keyed; `core_v1`, `locations_v1`, `tutorial_v1`, wire fields, stored gameplay and user-entered names remain unchanged. See [approved spec](../superpowers/specs/2026-10-21-oathfront-rivals-redesign.md) and [English presentation](../PRESENTATION-EN.md).

## Original artwork and exports

Six original character PNGs and the Fivefold arena are retained in `assets/source/rivals-v2`, with exact image-generation prompts, selected source paths and SHA256 source audit. Original assets use `assets/source/LICENSE.md`; Barlow Condensed uses the retained SIL OFL. No Marvel artwork or font is imported.

Run `python3 tools/assets/export-rivals.py` from the repository root to reproducibly export the selected masters. It produces 27 bounded WebPs, the runtime manifest, full source/export provenance manifest and locally hosted Barlow Condensed 700/800/900 TTFs. No network request or dependency installation occurs. Noto Sans remains the body and Unicode fallback font.

| Variant | Size | Treatment | Per-image transfer |
|---|---|---|---|
| Hero thumb | 256×256 | Deliberate face/upper-body crop | 28,902–37,184 bytes |
| Hero HUD | 128×128 | Face/shoulder crop | 7,560–11,298 bytes |
| Hero inspect | 512×512 | Same upper-body identity | 92,044–119,628 bytes |
| Hero bust/stage | 640×960 | Complete alpha silhouette, padded | 167,646–194,896 bytes |
| Board thumb / inspect / wide | 256×144 / 800×450 / 1600×900 | Shared Fivefold environment | 12,182 / 94,374 / 280,884 bytes |

All WebPs total 2,393,322 bytes (2.28 MiB); only needed DOM variants are fetched. The runtime loader preserves the core cutout atlas and **all eight terrain strips unconditionally**, replacing only the board-wide request. `resolveArt`, `artById` and battle requests agree on the versioned board. Unknown assets still resolve through the core fallback. Source/export hashes and byte counts are checked by `tools/assets/tests/rivals.test.ts`; the existing core validator remains unchanged.

## Theme and interaction

`styles/tokens.css` supplies semantic colors and `styles/rivals.css` supplies the presentation layer after the existing functional layout styles. Headings use Barlow Condensed; body/rules use Noto Sans. Paper uses ink text and dark Dawnward/Ashen ink pairs; bright faction colors are confined to dark surfaces. Angular decoration is on noninteractive background layers; focus outlines are outside the decoration.

Home presents “FIVE LANES. ONE OATH.” with Briar/Cinder and Play now/Continue match. The roster uses six whole-tile native radio controls and a large full-silhouette paper stage. The selected marker sits below the portrait, never over the face. Four powers open complete exact rules. The roster footer remains in document flow so it cannot cover powers. Collection cards preserve independent quantity controls, cost/name/art/stat/rules anatomy and named missing-art retries. Matchup setup reuses both hero identities. Shared shell, history, auth, settings, results, recovery and battle controls inherit the same theme.

At 375px, home/roster/collection/settings reflow into a document and battle keeps the existing readable fallback. At 1024×640 the compact five-lane board keeps text inspection; decorative inspect artwork is intentionally hidden by the existing compact layout. At 1440×900 the hand shows art and stat/effect-detail summary. The deck builder retains its existing 120px scroll clearance and per-control scroll margins; keyboard focus clearance is checked in the visual probe.

## Motion integration hooks

Task 2 preserves existing motion and leaves choreography to the dedicated motion task. Stable hooks: `[data-home-stage]`, `[data-home-headline]`, `[data-home-art]`, `.home-hero-good`, `.home-hero-evil`; `[data-hero-stage="H_G_BV"]` (selected ID), `[data-hero-name]`, `[data-hero-art]`, `.hero-stage-copy`, `.hero-powers`, `.power-list`; reusable native `dialog.match-dialog`/`.builder-dialog`. Keep `.hand-card`, `.hero-target`, `.scene-art`, `[data-battle-root]`, unit/slot/terrain data selectors unchanged because Pixi/GSAP derives coordinates from them. No CSS keyframes, timer choreography, gameplay callbacks or server actions were added.

## Verification boundaries

Task 2 uses focused asset/port tests, changed-file lint, web/tools typechecks and dev-server Playwright visual/fallback probes; the final production build, comprehensive keyboard/motion/game flow and integrated regression suite belong to the final integration task. Evidence and exact commands are in the ignored SDD Task 2 report. Physical device, balance, performance and human playtest gates remain open.

Browser fixtures default to API3101 for CI compatibility. Set `OATHFRONT_E2E_API_PORT=3121` locally; shared `tests/e2e/test-origin.ts` validates loopback origins and rejects collisions with UI3200/internal3201 and user3000/3001/3100. The local user app on3101 must never be stopped. Production verification must build Next with matching API_ORIGIN before starting it; changing a runtime variable cannot update a baked external rewrite.
