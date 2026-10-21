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

All hero/board WebPs total 2,393,322 bytes (2.28 MiB); only needed DOM variants are fetched. The [sixty-card refresh](../ART-DIRECTION.md) adds a separate versioned source/export manifest and one combined atlas per battle quality for new units plus existing hero/token support. The runtime loader keeps **all eight terrain strips unconditionally** and uses the Rivals board-wide request. `resolveArt`, `artById` and battle requests agree on their overrides. Unknown assets still resolve through the core fallback. Source/export hashes and byte counts are checked by the focused asset tests; the existing core validator remains unchanged.

The completed card set has 60 distinct masters, 38 transparent units and 22 opaque tricks. Low/high battle entry transfers are 989,646 / 1,855,338 bytes; corresponding decoded RGBA allocations are 11,796,544 / 21,631,040 bytes. The two quality atlases each contain 47 frames for the new units and existing hero/token support. Card thumbs and inspect art load in the DOM as needed. The 60-card collection probe and seeded hand/board probe verify the runtime variant mapping; the collection art slot contains its whole image so unit feet and trick scenes are not clipped. The desktop unit tile gives the new full-figure cutout an 88×88 region with the name above and stats beside it; the compact board retains its smaller arrangement.

## Theme and interaction

`styles/tokens.css` supplies semantic colors and `styles/rivals.css` supplies the presentation layer after the existing functional layout styles. Headings use Barlow Condensed; body/rules use Noto Sans. Paper uses ink text and dark Dawnward/Ashen ink pairs; bright faction colors are confined to dark surfaces. Angular decoration is on noninteractive background layers; focus outlines are outside the decoration.

Home presents “FIVE LANES. ONE OATH.” with Briar/Cinder and Play now/Continue match. The roster uses six whole-tile native radio controls and a large full-silhouette paper stage. The selected marker sits below the portrait, never over the face. Four powers open complete exact rules. The roster footer remains in document flow so it cannot cover powers. Collection cards preserve independent quantity controls, cost/name/art/stat/rules anatomy and named missing-art retries. Matchup setup reuses both hero identities. Shared shell, history, auth, settings, results, recovery and battle controls inherit the same theme.

At 375px, home/roster/collection/settings reflow into a document and battle keeps the existing readable fallback. At 1024×640 the compact five-lane board keeps text inspection; decorative inspect artwork is intentionally hidden by the existing compact layout. At 1440×900 the hand shows art and stat/effect-detail summary. The deck builder retains its existing 120px scroll clearance and per-control scroll margins; keyboard focus clearance is checked in the visual probe.

## Motion and component rules

The scoped GSAP owner drives home, decoded hero art, panels, native dialog entrances and phase labels. Battle keeps its existing authoritative presentation clock, with seven bounded Pixi effect families and a reversible card feedback tween. Focus, selection and controls are usable before decorative motion finishes. A rapid route/hero change, hidden tab or reduction change cancels the previous owner; reconnect fast-forwards cosmetic backlog beyond two seconds. Native dialog dismissal and focus return are immediate. The card feedback owner resumes a stored hover/focus lift when a hidden tab returns or OS reduced motion ends. [The current QA and state rules](rivals-redesign-qa.md) give timings, keyboard/pointer/touch paths, fallback behavior and verification limits.

Stable hooks remain `[data-home-stage]`, `[data-home-headline]`, `[data-home-art]`, `[data-hero-stage]`, `[data-hero-name]`, `[data-hero-art]`, `dialog.match-dialog`, `.hand-card`, `.hero-target`, `.scene-art` and `[data-battle-root]`. Pixi/GSAP derive geometry from the battle hooks. Motion does not submit gameplay commands or alter event commits.

## Verification and release boundary

The [redesign evidence index](evidence/rivals-redesign/README.md) retains the task reports, reviews, selected browser captures and decision rulings. The integrated Task 5 report there distinguishes actual production build/browser results from earlier development probes. The [release checklist](release-checklist.md) remains on hold for physical frame p95, balance, human playtests and external-device acceptance. A browser CSS reflow check is not a physical touch or assistive-technology test.

Browser fixtures default to API3101 for CI compatibility. Set `OATHFRONT_E2E_API_PORT=3121` locally; shared `tests/e2e/test-origin.ts` validates loopback origins and rejects collisions with UI3200/internal3201 and user3000/3001/3100. The local user app on3101 must never be stopped. Production verification must build Next with matching API_ORIGIN before starting it; changing a runtime variable cannot update a baked external rewrite.
