# OathFront Rivals Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the user's Marvel Rivals visual direction to the working OathFront PvE game, with original coherent heroes, English UI and prominent accessible GSAP motion.

**Architecture:** Keep the authoritative engine, immutable content versions and API contracts. Add ID-keyed English presentation copy and versioned art, replace the web design tokens/layouts, and extend the existing GSAP/Pixi presentation layer. No new game rules or database migration.

**Tech Stack:** Existing Next16/React19/TypeScript, CSS tokens, GSAP3.15/Pixi8, Playwright/Vitest, existing asset pipeline. Local open-license condensed font; built-in image generation for original character illustrations.

**Spec:** `docs/superpowers/specs/2026-10-21-oathfront-rivals-redesign.md`

## Global Constraints

- OathFront remains the brand; all visible UI, metadata, accessible names, errors, tutorials and catalog presentation must be English. User-entered account/deck names must remain unmodified.
- Hero IDs map to Briar, Aster, Lumen, Cinder, Vesper, Morrow as specified. GOOD displays Dawnward; EVIL displays Ashen Court.
- Immutable core_v1/locations_v1/tutorial_v1, IDs, numbers, engine/bot rules, stored checkpoints, receipt semantics and wire schemas must remain unchanged. English presentation resolves by stable IDs.
- GSAP must own choreography; OS/game reduced-motion, cleanup, reconnect fast-forward and authoritative damage timing must remain effective.
- Targets must be≥44×44px with≥8px gaps; text contrast4.5:1, large text3:1;375px fallback,1024×640 and1440×900 layouts and200% reflow must remain usable.
- Source art must be original and versioned; no Marvel character/logo/site assets. Every final generated asset must be saved in the repo with prompt/provenance.
- Preserve user3000/3001/oathfront_interactive, unrelated3100/3101 and existing3300Docker. Tests only use isolated verification DB and3200/3121/internal3201. Any final preview uses a distinct task-owned Docker project/port3400 after checking availability.
- Work in the existing authorized main checkout, preserve user changes, native small commits; controller alone pushes after integration. No production deploy, registry publish, dependency upgrades, cloud DB changes or destructive cleanup.
- Run focused checks during implementation; one final production build/browser gate. Do not repeat full engine/balance/physical suites for presentation-only changes. Report existing release holds truthfully.

## Review Focus

- A saved old match or deck must display English without rewriting identifiers, saved names or checkpoint/content hashes: Task1 compatibility test.
- Rapid hero changes, interrupted navigation, reduced-motion toggles and hidden tab must not leave controls invisible or leak timelines: Task4 lifecycle checks.
- Long user names, ten-card hands, fallback imagery and200% zoom must not clip text/focus/retry controls: Tasks2/5 visual/keyboard checks.
- A command response during a signature/death animation must retain the original revision/damage/fast-forward guarantees: Task4 existing controller regression coverage.
- Missing/late imagery and intentionally failed requests must retain actual error reporting, named fallbacks and explicit recovery: Tasks2/5 covering browser scenarios.

---

### Task 1: English presentation and world identity

**Files:** Create `apps/web/src/content/english-content.ts`, `apps/web/src/content/english-content.test.ts`, `docs/PRESENTATION-EN.md`; modify visible copy and lookup usage under `apps/web/src/app`, `apps/web/src/features`, relevant `tests/e2e` selectors, `AGENTS.md`, `docs/OATHFRONT.md`, and current-document introductory links. Preserve mechanics content and source-parity tables.

**Interfaces:** Export `englishContent`, a read-only stable-ID map of `{ name: string; title?: string; text?: string }`, and `contentName(id: string): string`, `contentText(id: string): string`, `heroTitle(id: string): string`. Export named faction/class/keyword labels from the existing label module. Unknown IDs must use safe English generic fallbacks; known IDs must have complete coverage. Presentation helpers must not alter wire responses or persisted objects. Later tasks consume the same names/helpers.

- [ ] Inventory current display fields, tutorial/auth/error paths and English copy coverage before editing. Read actual definitions for every translated rule.
- [ ] Add focused failing tests: all6hero/60card/18power/3token/8location IDs covered; selected ordered/move/permanent/turn-limited rule translations preserve exact semantics; using helpers leaves original catalog and stored custom names unchanged.
- [ ] Implement complete English copy and usage throughout current UI, metadata/lang=en, search and accessibility labels; localize tutorials by stable step/scenario IDs, error codes by existing error mapping. Update tests' user-visible selectors without weakening behavioral assertions.
- [ ] Write English name/rules tables and old-ID mapping in PRESENTATION-EN; update current project instructions/docs to supersede Vietnamese presentation while explicitly retaining immutable source/history records.
- [ ] Run focused content/frontend checks plus typecheck/lint on changed source. No final build/full browser suite here; later tasks change the visual surface. Review exact diff and commit only this task.

### Task 2: Original hero art and complete Rivals theme

**Files:** Create versioned hero assets under `assets/source/rivals-v2` and `apps/web/public/assets/rivals-v2`, presentation asset manifest, open-license condensed font and license, `apps/web/src/styles/rivals.css` if useful; modify tokens/fonts/shell/deck/match/assets styles and relevant home/shell/hero/deck/history/setup/settings/auth components; extend `rendering/asset-manifest.ts` only for the presentation override. Update `docs/UI-MOTION.md`, `docs/SCREENS.md`, `docs/implementation/rivals-redesign.md`.

**Interfaces:** Keep `resolveArt(artKey,fallbackLabel,variant)` and existing core manifest/atlas contracts. Versioned hero overrides cover existing hero art keys and `thumb`, `hud`, `inspect`, `bust` variants. Root controller may produce six original design assets with built-in imagegen while Task1 runs; worker consumes their manifest/provenance, never invents asset paths or silently omits a hero. Existing unit art/terrain remains supported.

Parent additionally produced `assets/source/rivals-v2/fivefold-board.png` and `board-generation.json`. Add the coherent `board/scene.webp` presentation override, including `artById` and `battleAssetRequests` consumers, while keeping all eight Location strips and their unconditional pool loading intact.

- [ ] Make the browser-fixture API port configurable (default3101 for existing CI, local override3121), with a validated loopback test origin shared by config/server/auth fixture. The user now has an unrelated Next app on3101; never stop it. Check ports before probes and use existing isolated verification DB only.
- [ ] Inspect source art and supplied reference screenshot/design. Apply gpt-taste within game constraints, use the spec's tokens rather than random marketing layout. New art must show all six specified distinct silhouettes and complete required crop-safe regions.
- [ ] Integrate generated originals and bounded web derivatives through the existing asset pipeline, retaining provenance/hash/license metadata; verify every hero resolves and fallback works. Preserve unrelated core atlas assets and hidden-terrain preload invariants.
- [ ] Implement the full theme: angular black/paper/yellow shell, editorial home, prominent hero stage/roster, readable card/skill anatomy, themed deck/setup/battle HUD/dialogs/history/settings/auth. Preserve semantic controls and flow; never reduce hit areas to gain space.
- [ ] Review via ui-ux-pro-max: contrast, focus, responsive density, long-content overflow, touch and fallback states. Fix objective findings before verification.
- [ ] Run focused asset/resolve checks, type/lint and browser visual probes on isolated dev UI when available; capture375,1024×640,1440×900 and fallback. Do not repeat broad engine/load tests. Commit coherent art/theme changes and report exact assets touched.

### Task 3: Complete sixty-card illustration refresh

User explicitly selected **redraw all 60 card artworks to match the new heroes**, with ArtStation as an additional reference. This supersedes the original retained-card-art scope. Six completed hero illustrations remain the style anchors. All 60 stable card IDs must receive original new art; power/token/terrain illustrations outside those 60 retain current support.

**Files:** Create source masters/prompts/provenance under `assets/source/fivefold-cards-v3`, bounded exports/manifest/low-high unit atlases under `apps/web/public/assets/fivefold-cards-v3`, focused export command/tests under `tools/assets`, and current art-direction documentation. Extend the presentation asset resolver and rendering asset loader to consume all card overrides and new unit frames while preserving existing token/hero fallback and all eight terrain preload invariants.

**Interfaces:** `resolveArt`, `artById`, `battleAssetRequests`, `AssetBundle.atlases` and stable definition IDs remain compatible. Core manifest, canonical content versions, source-parity rules and API payloads do not change. Parent produces 60 built-in imagegen originals and exact per-ID requests; implementer consumes source metadata and handles deterministic web export/integration. Never infer completion from placeholder images or reuse one master for unrelated cards.

- [ ] Read the amended spec and ArtStation reference notes, inspect the generated masters. All 38 units have actual transparent backgrounds and intact readable silhouettes; all 22 tricks are square compositions with a clear single effect and no baked text/UI. Generate missing/corrective assets with built-in imagegen, not SVG stand-ins. Original heroes are material/rendering references only, not duplicated characters.
- [ ] Export intentional bounded card thumb/inspect variants and unit atlas frames. Replace unit presentation textures with new art through a complete manifest and preserve unchanged token frames as needed. New runtime preload must be independent of secret/selected lanes, decks and opponent data, with measured entry/decode budgets.
- [ ] Add meaningful coverage for 60-ID completeness, source hashes/alpha/outputs, consistent resolver+atlas loading, unchanged pool of all eight terrain strips and missing-image recovery. Do not rewrite original core assets or loosen historical source-parity validators.
- [ ] Inspect all 60 assets using readable review sheets plus individual files for suspicious crops; record IDs and any targeted corrections. Verify actual card collection/hand/board images in focused dev browser probes at supported sizes. Keep rules and controls legible.
- [ ] Update art direction, image provenance, current implementation docs and Pen handoff inputs; commit coherent source/export/integration changes. No full engine or full production browser suite here; Task 5 handles final integration once.

### Task 4: GSAP choreography and comic combat effects

**Files:** Modify `apps/web/src/features/match/motion/event-timeline.ts`, existing presentation/rendering files, relevant UI components; create focused owned UI-motion helpers under `apps/web/src/features/motion` only if shared; add/update relevant existing motion tests and `tests/e2e/rivals-motion.spec.ts`; update motion documentation.

**Interfaces:** Preserve `createEventTimeline`, `eventDuration`, BattleScene `present`, authoritative/presentation cursors, controller transport isolation and existing asset interfaces. Hero art and English labels come from Tasks1/2. New DOM motion must expose scoped cleanup, with no state-engine action in tween callbacks.

- [ ] Establish focused regression coverage for cleanup/reduced motion/interruption; use existing controller tests for shared damage timing/reconnect rather than duplicating game-engine tests.
- [ ] Add home/roster/page and dialog reveals using GSAP contexts, short stagger and cancellable hero transitions; fine-pointer parallax only when motion is allowed, suspend when hidden.
- [ ] Upgrade draw/deploy/move/attack/damage/death, block/phase and signature presentation with distinct readable seven-family comic accents. Preserve evil-first80ms offset, shared impact and existing duration budgets; signature≤900ms.
- [ ] Verify normal/reduced mode, rapid selection/unmount, pause/hidden tab, fast-forward, and unchanged command/revision behavior in focused tests. Review motion accessibility/performance with ui-ux-pro-max. No physical benchmark claim without an actual measurement.
- [ ] Commit the motion change with scoped test evidence and any remaining concrete limitations.

### Task 5: Integrated verification, documents and delivery

**Files:** Update current documentation index, redesign report/QA checklist, current spec pointers and milestone record. Adjust tests only for proven regressions. No unrelated backend changes.

**Interfaces:** Consume final English presentation, art manifest and motion behavior from Tasks1–4; preserve original release checklist holds. Native commits/push remain authorized; controller handles review and push.

- [ ] Run final English static-copy audit allowing historical transport fields/comments/user text; verify current docs name mappings and links. Run typecheck, lint and relevant frontend/content tests once on integrated source.
- [ ] Build production once with API_ORIGIN=http://127.0.0.1:3121 and run final production browser suite sequentially against isolated verification DB. Preserve actual failures and use only covering reruns for fixes.
- [ ] Inspect actual browser UI at375,1024×640,1440×900 and200% reflow; play hero/deck/mulligan/deploy/pass/pause/reload flow, normal/reduced motion, fallback and console. Record what was visually verified rather than inferring from unit tests.
- [ ] If a live preview is delivered, build/start a separate `oathfront-redesign` Docker stack at free loopback3400 with separate volume and run a focused guest-play smoke; do not replace3300 or migrate user DB. Record exact startup instructions.
- [ ] Complete current documentation with tokens, all component state/keyboard/pointer/touch rules, motion timings, asset provenance, screenshots, testable QA checks and known limits. Original user Markdown must remain intact as reference.
- [ ] Commit task changes, report checks and actual skipped gates; controller performs whole-change review after Task6, applies at most the defined scoped final fix wave, then pushes small commits once and verifies actual automatic CI. No production deployment.

### Task 6: Pen.dev prompt and design-to-code handoff

Added by the user after execution began; perform after the current redesign is complete. This does not replace Tasks1–5.

**Files:** Create `docs/design/pen/OATHFRONT-PEN-PROMPT.md`, `docs/design/pen/DESIGN-CONTRACT.md`, `docs/design/pen/design-contract.json` and a narrowly useful schema/check command if the actual format warrants it; link from current docs index.

**Interfaces:** Prompt consumes final implemented tokens, original hero assets, English catalog, screen/state inventory and motion spec. Contract maps actual Pen file/node identifiers to repository components, semantic token names, assets, responsive variants, interaction states and GSAP cues. It must identify the source file/hash/revision and distinguish design intent from runtime gameplay authority.

- [ ] Verify current official Pen.dev documentation for .pen format, variables/components and design↔code handoff. Do not invent unsupported MCP/CLI operations or layer IDs.
- [ ] Write a ready-to-paste English design prompt covering every gameplay screen, responsive size, state, asset reuse and concrete deliverables; tell Pen to design editable components and named variables, not flatten the UI to images.
- [ ] Write the Pen↔Codex workflow and a contract structure tied to actual final repo paths/tokens. Until the user supplies or creates a real design file, mark it `awaiting_design` with unresolved source/node IDs, never as approved or implementation-ready.
- [ ] When a real Pen design file becomes available, read it, verify source identity and resolve node/token/component/asset mappings, record conflicts against immutable game rules, and validate before applying that design. If no file exists yet, finish the prompt and honest pending contract handoff without inventing a design or blocking completed redesign delivery.
- [ ] Check links/JSON/schema as applicable, commit handoff docs and report the exact file needed to finalize the contract. No external Pen account/project creation or design publication implied by writing this prompt.
