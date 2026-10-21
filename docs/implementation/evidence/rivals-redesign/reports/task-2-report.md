# Task 2 report — original hero art and Rivals theme

## Scope and identity

Base: `485bed8` on authorized `main`. Harness commit: `e2152b9` (`test: isolate configurable browser API fixture port`). Theme commit recorded at the end after creation. No push, deploy, registry publication, dependency upgrade, branch creation or unrelated user-service changes. The root-supplied `assets/source/rivals-v2` originals/fonts and plan/spec amendments were intentionally included. Newly requested sixty-card regeneration is parent-owned follow-up and excluded.

Applied/read: project AGENTS.md, OATHFRONT.md, approved redesign spec, supplied Marvel design/reference handoff, gpt-taste (game composition overrides generic marketing/RNG), ui-ux-pro-max and its contrast/focus/touch checklist, test-driven-development/writing-good-tests for functional changes, verification-before-completion, React-best-practices. No spawned helpers/reviewers.

## Changes

- Shared validated API fixture port/origin: defaults API3101 for existing CI, local override3121, loopback127.0.0.1 only. Rejects invalid/range/colliding UI/internal/user-service ports. Playwright config, fixture server and auth identity request share it. UI port upper bound reserves its internal port.
- Deterministic `tools/assets/export-rivals.py` exports six hero identities with distinct 256² thumb, 128² HUD, 512² inspect and 640×960 complete silhouette stage; board256×144,800×450,1600×900. Real alpha and intentional upper-body/face crops preserved. The source/export manifest retains paths, hashes, dimensions, byte counts, alpha, prompt provenance and license.
- Presentation override resolves all hero keys and board consistently via resolveArt/artById/battleAssetRequests. Core atlas and all eight terrain strip preloads remain unconditional and unchanged; unknown assets retain named core fallback.
- Local Barlow Condensed700/800/900 and SIL OFL, Noto Sans retained for body/Unicode. Semantic black/paper/yellow/faction ink tokens and `rivals.css` imported after functional layout styles.
- Editorial two-line home with Briar/Cinder full silhouettes; prominent paper hero stage, six native radio portrait tiles, dark four-power rail; paper collection cards with clear cost/name/art/stat/rules and independent quantities; matchup portraits; coherent battle HUD/hand/cards/board, history/auth/settings/results/recovery surfaces.
- Preserved immutable content, stable IDs, wire fields, private-state boundary, card mechanics, match command flow, user names, native modal control and existing reduced-motion handling. All existing Pixi/GSAP geometry selectors retained.
- Updated SCREENS/UI-MOTION with explicit current-vs-historical presentation boundary and added docs/implementation/rivals-redesign.md. Parent plan/spec additions integrated as handed over.

## Measured assets

27 WebPs total **2,393,322 bytes (2.28MiB)**. Hero stages167,646–194,896 bytes; thumbs28,902–37,184; HUD7,560–11,298; inspect92,044–119,628. Board wide280,884 bytes. Three font TTFs total331,036 bytes. Source tree about18MiB; public presentation tree about2.7MiB. No 60-card art regeneration in this task.

Presentation battle preload: low1,615,516 bytes/11,796,544 decoded RGBA bytes; high4,129,148 bytes/21,631,040 decoded RGBA bytes. Both retain1 core atlas +8 terrain strips +1 board. See task-2-evidence/asset-budgets.json.

## TDD and commands actually run

1. `pnpm exec vitest run apps/web/tests/test-origin.test.ts`: RED11 failures (missing API export/validation), then GREEN11 after implementation.
2. `pnpm exec vitest run tools/assets/tests/rivals.test.ts`: RED3 failures (core URLs, old board request, missing presentation provenance manifest), then GREEN after deterministic export/override. Existing core asset validator/hidden-terrain test also passed.
3. Final focused command `pnpm exec vitest run apps/web/tests/test-origin.test.ts tools/assets/tests/rivals.test.ts tools/assets/tests/manifest.test.ts`: **3 files,17 tests passed**,4.49s.
4. `pnpm --filter @oathfront/web typecheck` and `pnpm exec tsc -p tools/assets/tsconfig.json`: exit0. Web typecheck repeated after final generated route-path restoration; no generated next-env change included.
5. `pnpm exec eslint` over changed TS/TSX/MJS files (App/layout, CardCollection, HeroInspect/Select, asset-manifest, PresetSetup, test-origin regression, Playwright config, browser server, auth-claim, asset-fallback, rivals-theme and rivals asset tests): exit0. Latest changed visual probe lint checked separately. `git diff --check`: clean.
6. `OATHFRONT_E2E_API_PORT=3121 OATHFRONT_ASSET_EVIDENCE_DIR=.superpowers/sdd/2026-10-21-oathfront-rivals-redesign/task-2-evidence/fallback pnpm exec playwright test tests/e2e/rivals-theme.spec.ts tests/e2e/asset-fallback.spec.ts`: both existing asset fallback tests passed (6.9s/9.5s); first new visual probe failed at duplicate guest creation403. Fixed only its fixture setup by clearing its isolated context cookies before seeded battle.
7. The next new-probe run exposed a mistaken test expectation: compact1024 layout intentionally hides decorative `.inspect-art`; changed assertion to the visible semantic `.inspect`. No production behavior changed for either fixture/test issue.
8. Focused `OATHFRONT_E2E_API_PORT=3121 pnpm exec playwright test tests/e2e/rivals-theme.spec.ts`: main presentation probe passed,27.2s (38.0s total), zero unexpected console/page errors. Covers375/1024×640/1440×900 home→hero→builder→settings, roster identity changes, footer focus clearance, ≥44px quantity targets,≥8px tutorial action gaps, reduced-motion seeded battle/inspect, no page overflow and fallback.
9. Final compact-specific `... playwright test tests/e2e/rivals-theme.spec.ts --grep 'compact arena'`: passed; verifies phase action at scrollY0 within640px and captures final compact view. End phase measured x808/y577,width200,height56,bottom633. The final narrow probe also waits for the real hero stage before capturing720×450 reflow (the earlier capture caught a transient loading screen).

No full build, full browser suite, engine/balance/load suite or cloud operations run in Task2, per assignment. The production asset/CSS build and complete integrated match/keyboard/motion run remain the integration task.

## UIUX findings and fixes

- Mobile home metadata crossed a diagonal into the dark art panel: decoration now starts only in its separate art panel; text remains ink on solid paper.
- Selected marker obscured Briar's face: moved marker to the tile's text/status area with explicit Selected text.
- Sticky roster footer covered power buttons: roster footer is now in normal document flow. Builder keeps its existing scroll padding/margins and automated last-card focus checks pass at all three sizes.
- Initial stage screenshot caught an opacity tween: capture waits for opacity1; actual stage is warm paper. Dark muted token inherited by the dark power rail was corrected.
- Settings block margins collapsed to4px: explicit8px grid gaps in tutorials and12px following modal actions; measured assertion passes.
- Compact battle name split mid-word and phase action extended below640: full-width unit name row, smaller still≥44px HUD portrait target, explicit compact heading line heights, art+summary hand row. Dedicated viewport test now proves End phase bottom633 at scrollY0. Nonessential full log/history controls remain below the fold as before.
- Transparent lane overlay lets the quiet shared arena appear while normal-lane text has a dark plate; legal target outlines and stats remain clear.
- Contrast recomputed from actual tokens: text/surface16.65,muted/raised8.35,ink/paper16.24,ink/action14.57,Dawnward-ink/paper6.40,Ashen-ink/paper6.70,muted-ink/paper7.52. See contrast.json. Decorative bright faction overlays never carry small paper text.
- React review: stable ID keys, no new network/data waterfall, no new mutable cross-request state, no new effect subscriptions, bounded local assets, decorative images remain alt-empty, real radio/buttons and independent retry/quantity propagation preserved. Existing selection GSAP context remains owned/cleaned up.

## Inspected visual evidence

Directory: `.superpowers/sdd/2026-10-21-oathfront-rivals-redesign/task-2-evidence/`.

Directly inspected selected-source contact sheet and all six derivative crops/full stages, original shared board; home-desktop.png/home-mobile.png; heroes-desktop.png/heroes-tablet.png/heroes-mobile.png; deck-tablet.png; settings-desktop.png/settings-mobile.png (top375×812 crop inspected at readable size); battle-desktop.png/battle-tablet.png/battle-tablet-viewport.png; battle-small-fallback.png. Reflow720×450 represents the CSS viewport at200% of1440×900; it is not a physical browser zoom/device certification. Final reflow screenshot inspection recorded after capture below. Additional home/tablet/deck/settings/fallback images were captured by the probes; root also inspected representative compositions independently.

CUA documented browser spot-check opened isolated localhost3200 home, observed intended home controls, then observed complete recovery/error UI when the existing Chrome profile's old fixture cookie was rejected after the disposable database reset. No user browser storage was altered. Successful gameplay/UI flow evidence comes from fresh-context Playwright. CUA tab and both manually started owned3121/3200 processes were closed; final port check showed only unrelated user3101 PID20026 still running. Existing local DB left healthy for the parent.

## Handoff and limitations

Stable new hooks: data-home-stage/headline/art, .home-hero-good/.home-hero-evil; data-hero-stage (ID), data-hero-name/art, .hero-stage-copy/.hero-powers/.power-list; native dialog.match-dialog/.builder-dialog. Preserve .hand-card/.hero-target/.scene-art and all battle/unit/slot/terrain data selectors.

Major GSAP choreography remains the dedicated motion task. All60 card artwork redraw/integration was newly requested during finalization and is parent-owned. History/auth/result share theme tokens; their complete state matrix and actual Google login were not freshly executed here. No physical200% browser zoom/touch-device/performance/balance/human-playtest claim. Root should build final Next with API_ORIGIN3121 and run the final integrated browser gate. Home visible CTA changed to Play now/Continue match (Play now accessible name includes Play vs bot for existing substring selectors); old exact Resume match home expectations may need integration audit.

Final narrow probe:8.2s test /17.0s total, passed. Final720×450 hero reflow image visually inspected after waiting for stage and opacity1; readable two-column stage/three-column roster, no horizontal clipping.

Theme/art/docs commit: `1c2c77d9bb140fbdf4ffb1d834554e4818cd54a0`. Final720px reflow inspection found decorative center-crop removing face tops in unusually wide roster slots; set only roster object-position to center top. Covering narrow probe passed7.7s (17.5s total); screenshot re-inspected, faces retained. Final crop commit identity recorded below. No root follow-up docs/card assets included.

Final crop commit: `02ad983da842dccb90cae402a4f29541691180b1`. Task2 range `485bed8..02ad983`. Final working tree clean;3121/3200/3201 free, unrelated3101 unchanged.
