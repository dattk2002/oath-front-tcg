# Dimensional battlefield implementation

OathFront now uses a real Three.js table for all four arenas. Raised paving, bevelled card sockets, steps, columns and arena-specific props are lit geometry; the original paintings are a subdued distant backdrop. Existing unit/trick artwork remains on physical card planes. React owns all commands and semantic targets, projected through the same camera as the cards.

## Scope and milestones

1. **Renderer** — `9482a4c`: lazy Three renderer, public event reducer extraction, original card face/rarity rendering, resource lifecycle and static redraw after paused fast-forward.
2. **Materials** — `c301fd4`: four original top-down texture maps, clamped world-space UV mapping, asynchronous cleanup and preserved procedural fallback.
3. **Composition** — compact hero HUDs, bottom hand, contextual inspector, responsive camera and phone play; existing viewport-only interaction restriction removed.
4. **Verification and delivery** — exact input intents, cinematic lifecycle, fallback/retry, responsive screenshots, contract updates and production Git deployment.

The approved extension is documented in [arena-3d-contract.md](../design/arena-3d-contract.md). The supplied Pen source remains SHA-256 `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`; no Pen node or full gameplay-frame coverage is claimed.

## Interaction and motion

- Five lanes retain their identities, order and legal actions. The player is near the camera for either faction.
- GSAP remains the event clock. Attacks/signatures drive bounded camera zoom, orbit and impact shake; card hover/selection lifts the physical card. Skip, pause and reduced motion return to the exact resting projection.
- Opponent stats float above their cards; player stats sit below. The location band and revealed rules remain separately reachable.
- The inspector never resizes the table. Hero HP/energy/block, hand, phase action, powers, settings, account and battle log remain native controls.
- Landscape and portrait phones can submit the original commands. Horizontal hand scrolling and tap/keyboard selection remain native. WebGL failure keeps a playable semantic board and allows rebuilding one canvas.

## Verification

Frontend suite: **116 tests passed** in 27 files. Full workspace typecheck and ESLint passed. Renderer unit tests include both factions, all lane positions, responsive/signature bounds, reduced motion, material disposal and late image callbacks.

**15 unique browser cases passed across the final targeted runs:** four-arena layout review, both phone commands, portrait fallback/retry, real WebGL paused lifecycle, five input-parity flows and five motion flows. Next production compilation, TypeScript, all 30 pages and standalone packaging passed. Production Git deployment remains pending. Evidence is captured from Chromium with actual WebGL2, not a mocked canvas. Public-DTO visual fixtures are separate from isolated local PostgreSQL tests for real command submission. No hosted database migration or API implementation was changed.

## Defects caught during integration

- Paused fast-forward needed one settled redraw/projection without restarting motion.
- Small-screen legacy rules hid gameplay and hand artwork; scoped arena rules restore both.
- Empty command status regions intercepted Retry artwork; inactive status now has no hit surface.
- A periodic recovery poll temporarily disabled Pause and dropped keyboard focus; transient ARIA disabling preserves focus and guards submission.
- Location disclosures were trapped beneath inspection by ancestor stacking contexts; the relevant owner now rises while open.
- A legacy motion test paused after six RAF callbacks, which could occur after the animation finished. It now observes an actual changed camera pose. Battle log/stat assertions now reflect the approved disclosure and upright floating-label design, preserving event and HP checks.

## Limits

Desktop 1440×900/1280×720 and phone-sized 844×390/375×812 Chromium views are the acceptance targets. These checks do not certify physical phone GPU performance, Safari, or a universal 60 fps. Low quality caps DPR at 1 and removes shadow work; high quality caps DPR at 1.5. Missing assets/WebGL retain a usable fallback. Strong camera motion is disabled by reduced-motion preferences.

The 14 pre-existing modified auth/audio/App/layout/style/document/test inputs were hash-checked and preserved. They are excluded from this release's commits.
