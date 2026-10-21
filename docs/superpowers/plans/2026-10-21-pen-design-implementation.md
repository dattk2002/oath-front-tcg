# OathFront Pen Design Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, completing M1–M7 in order. One fresh final code review follows implementation. The user approved this scope and sequential execution; continue without milestone approval prompts.

**Goal:** Apply the supplied Pen design closely to public pages and the existing playable game, with a truthful design–code contract.

**Architecture:** Read and verify the frozen Pen snapshot offline. Ship semantic React components, reusable CSS/tokens and optimized local assets, rather than a runtime Pen interpreter. Public campaign content and existing game/session flows share deliberate entry points; immutable game behavior stays authoritative.

**Tech Stack:** Existing Next.js App Router, React, TypeScript, CSS, GSAP, Pixi, Python for offline design validation, Playwright/Vitest for verification.

**Spec:** `docs/superpowers/specs/2026-10-21-pen-design-implementation.md`

## Global Constraints

- Frozen source SHA256: `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`; preserve `.pen` bytes and existing user changes.
- English UI, Barlow Condensed with Unicode fallback; original six heroes and 60 card identities preserved.
- No game rules/API/db changes, CMS, real editorial announcements or portrait battle expansion.
- 1440×900, 1024×640, 375px campaign/fallback, 200% reflow; 44px controls, 8px separation; reduced motion and exact modal behavior.
- `apps/web/next-env.d.ts` is user-owned and excluded from commits.
- Focused checks per milestone; final broad verification once after integration unless failures or edits justify another run.

## Review Focus

- Game API outage must not erase public campaign content; account/Play retry preserves intent.
- Visiting a profile while a match is active must not create or replace a match; resume remains available.
- Navigation/filter changes must not lose keyboard focus, claim data or retry state.
- Dense hand and tutorial at 1024×640, long names, 200% text and fonts must not regress clipping.
- Nested Pen instance overrides, repeated art and unknown slugs must not map to the wrong hero or silently manufacture readiness.

## Files and interfaces

- `docs/design/pen/pen_document.py`, `check-design-contract.py`: offline readback and v2 verification; `check-pending-contract.py` remains a compatibility entry.
- `docs/design/pen/design-contract.json`, inventory/handoff and implementation evidence: source identity, actual/derived coverage, code mappings and validation.
- `apps/web/src/features/campaign/`: `CampaignHeader`, `CampaignHome`, `CampaignPage`, `HeroProfile`, `EditorialPage`, `CampaignArtwork`, static content/model and motion. Props carry callbacks/state from the existing App rather than creating another game authority.
- `apps/web/src/styles/campaign.css` and `game-theme.css`: Pen public layout and approved inherited game skin; fonts remain local.
- `apps/web/public/assets/pen-v1/`: exact vector logo and optimized derivatives, with provenance manifest.
- Existing `App.tsx`, `router.tsx`, `layout.tsx`, auth/motion components as needed for integration; add public route pages under `app/`.
- Focused checker tests, campaign model/browser tests, and existing game regression tests.

### Task 1: M1 — verified contract and frozen source

**Files:** Create offline reader/checker and tests; update contract, inventory, handoff, docs links; preserve design/input assets.

**Interfaces:** Consumes the supplied Pen JSON and repository definitions. Produces verified raw/resolved nodes, asset dependency hashes, approved scope and source-pinned mapping data for M2–M7.

- [ ] Write behavioral validator tests: missing ref, invalid descendant override, undefined variable, escaped/missing image, source hash drift; run to observe failures.
- [ ] Implement only the used documented Pen 2.20 structures; reject unsupported reference resolution rather than guessing. Record schema limits.
- [ ] Reconcile current source path/hash, inherited token bindings, actual asset and campaign/home nodes; preserve missing gameplay mappings as approved derived work.
- [ ] Run `python3 -m unittest discover -s docs/design/pen -p 'test_*.py'` and `python3 docs/design/pen/check-design-contract.py`; expect all checks pass with remaining non-implementation design limits explicit.
- [ ] Commit the supplied design, its dependencies and verified contract/documents as one coherent milestone.

### Task 2: M2 — Pen foundations and shared components

**Files:** Add campaign assets/manifest, local Barlow body weights, `CampaignHeader.tsx`, `CampaignArtwork.tsx`, `campaign.css`; update fonts/layout/brand.

**Interfaces:** Consumes M1 nodes/tokens/assets. Produces shared brand/nav/art primitives and semantic theme used by public pages and M5.

- [ ] Extract exact vector logo paths and optimize copies of source images; record source hashes/licenses. Do not regenerate art.
- [ ] Implement desktop/mobile navigation and artwork with accessible names, focus, fallback and independent controls; derive 1024px behavior.
- [ ] Read installed Next.js route/image guidance before code. Verify types plus asset paths/visual dimensions.
- [ ] Commit shared foundations after checks; no additional unit tests for static CSS.

### Task 3: M3 — Home, heroes and game entry

**Files:** Add `CampaignHome`, `CampaignPage`, `HeroProfile`, campaign content/model; public hero routes; modify App integration and auth/menu entry.

**Interfaces:** Receives M2 primitives and existing session/catalog. Produces public hero browsing and `Play now`/`Choose deck` actions with existing guest/resume semantics.

- [ ] Add regression tests for entry destination with active match, no match, selected hero, invalid hero; public page usable on API failure.
- [ ] Implement supplied Home and list/detail compositions; original rules by stable ID and all six full-body/environment pairings.
- [ ] Preserve `/heroes` game selection; public profiles use `/explore/heroes/[heroId]`; no automatic match creation from browse links.
- [ ] Verify Home, profile→deck, guest/resume and public API failure with focused tests/browser checks. Capture desktop/mobile comparison images.
- [ ] Commit M3 and update actual component mappings.

### Task 4: M4 — Features, News and Events

**Files:** Add editorial content/model/components; `/news`, `/events`, `/game-features` routes and detail routes.

**Interfaces:** Consumes shared primitives. Produces static mock content/filter/detail navigation independent of backend.

- [ ] Test filters, valid detail resolution and unknown slugs; ensure every visible item has a detail destination.
- [ ] Implement Pen list/cover/detail structure; label mock material, preserve filters where practical, use supplied content plus clearly marked draft detail prose for undeveloped entries.
- [ ] Build features with actual hero/card/rule identities; avoid fake event registration or schedules.
- [ ] Verify keyboard/card-surface navigation, filtered empty states, deep links and responsive images; commit M4.

### Task 5: M5 — inherited game theme

**Files:** Add `game-theme.css`; narrowly adjust existing semantic classes/components if needed.

**Interfaces:** Consumes shared brand/color/type primitives; preserves game component structure, API/event/timing authority and all 60 assets.

- [ ] Apply paper/slate/lilac/acid identity and Barlow to hero selection, decks, setup, mulligan, battle, inspect/log, block, pause/results/history, settings/tutorial/auth.
- [ ] Keep final hand dimensions/readability and five-lane controls at 1024×640 and 1440×900. Missing Pen screens remain derived mappings, never fake node IDs.
- [ ] Run existing focused battle/tutorial/auth browser regressions and capture dense board snapshots. Fix objective readability failures before continuing.
- [ ] Commit M5; record intentional accessible/fallback differences from Pen.

### Task 6: M6 — motion, responsive and accessibility

**Files:** Campaign motion helpers/styles and focused browser tests; existing UI motion helpers only where needed.

**Interfaces:** Consumes complete pages/game skin. Produces scoped GSAP choreography with normal/reduced/interruptible states.

- [ ] Add restrained hero/content entrance and card interaction motion without hiding content before JS or shifting gameplay timing.
- [ ] Verify cancellation, reduced motion, keyboard focus, 375/1024/1440 widths and 200% reflow; review with ui-ux-pro-max and fix findings.
- [ ] Capture representative browser evidence; inspect console errors and missing-image recovery.
- [ ] Commit M6 after focused checks.

### Task 7: M7 — integration, independent review and delivery

**Files:** Final contract code mappings/verification, acceptance report, docs index and milestones ledger.

**Interfaces:** Consumes M1–M6 deliverables. Produces verified working UI, truthful contract, coherent commits and remote state.

- [ ] Run final checker, typecheck, lint, build, complete unit/integration suite and relevant/full browser suite on isolated fixtures. Preserve interactive DB/session/dev server.
- [ ] Dispatch one fresh code/UI review using spec, plan, source hash, actual diff and evidence; address important findings with focused regression checks.
- [ ] Update contract implementation verification without claiming complete original Pen coverage, physical-device, balance or release gates.
- [ ] Inspect staged diff/remote, commit final evidence, push to authorized repo and inspect resulting remote SHA/CI. Report actual results and limitations.
