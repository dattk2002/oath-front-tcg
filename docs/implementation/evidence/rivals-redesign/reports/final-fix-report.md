# Final review fix wave — compact hand readability

## Outcome and scope

Started from `60d3a8d356e355970bc8946be6d303e3ddbbb092` on the authorized existing `main` checkout. Source fix commit: `0f5354d7ca7a0dff66039fce1847ef0110fb3865` (`fix(web): keep dense hand summaries readable`). A separate documentation/evidence commit reconciles the Pen baseline to this real source commit; it does not predict its own future SHA.

Addressed final review Important 1 and Minor 1–2 in one coherent fix wave:

- Compact ten-card hands no longer allocate most summary width to decorative artwork. The 88px cards use a 16px cost column, wider title column, and a full-width 42px summary row. Decorative hand art is hidden only in the existing compact breakpoint. Existing 44px minimum targets, 8px card gaps, ten cards/ten units, End phase and selection paths remain intact.
- The mixed-hand regression also exposed the same fixed-row problem on desktop: the two-line trick cue needed 32px in a 20px slot. The 144px desktop card keeps artwork and reallocates 12px from thumbnail height (60→48) to summary height (20→32). No new breakpoint, runtime behavior, art export, dependency or game rule was introduced.
- Pen prompt and current QA now describe actual per-dialog Escape behavior: Pause submits RESUME when allowed, first cancels a surrender/skip confirmation, and cannot resume while disabled; Result prevents Escape dismissal and offers explicit exit actions. Runtime dialog code is unchanged.
- Unknown-route coverage now rejects the actual `data-home-headline` markup for “FIVE LANES. ONE OATH.”, which is split by a `<br>` in the home DOM. Existing status, JSON content-type and local-auth assertions remain intact.

Minor 3 remains explicitly deferred by the controller's ledger ruling: unit inspect/cutout export URL consolidation is a nonblocking future optimization. No asset regeneration or URL churn occurred. The progress ledger and original review/task archives were not edited.

## Root cause, regression and actual runs

The original compact grid put `1 ATK / 2 HP` beside 28px art in a roughly 19px column. Parent rectangles fit, but the summary/text extended outside the card and viewport. `responsive.spec.ts` now measures each actual summary element plus every text-range line after local fonts are ready, checks those against its card and viewport, and retains the existing target/gap/overflow/End phase assertions. The ten-card fixture includes Bronze Shieldsmith (long name) and Lantern Ray (trick). Pointer and keyboard selection verify complete names and exact rules in the real inspect panel. This catches fixed-row overflow rather than merely checking the outer button.

Commands ran serially against the existing isolated fixture DB; no DB resetters ran concurrently. Logs are under `docs/implementation/evidence/rivals-redesign/final-fix/`. The archived build log normalizes terminal carriage returns/trailing whitespace; its raw original remains in the ignored SDD workspace.

1. RED against the existing Task 5 production artifact, before CSS changes:

   `OATHFRONT_E2E_API_PORT=3121 OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_EVIDENCE_ROOT=docs/implementation/evidence/rivals-redesign/final-fix/red pnpm exec playwright test tests/e2e/responsive.spec.ts --grep 'ten cards and ten units fit 1024x640'`

   **1 failed**, the intended assertion: `1 ATK / 2 HP`, expected summary bottom ≤634, received 648 (viewport height 640). See `red.log` and `red/task16/hand-text-1024-640.json`.

2. After the compact CSS fix, development-server run:

   `OATHFRONT_E2E_API_PORT=3121 OATHFRONT_EVIDENCE_ROOT=docs/implementation/evidence/rivals-redesign/final-fix/dev pnpm exec playwright test tests/e2e/responsive.spec.ts --grep 'ten cards and ten units fit (1024x640|1440x900)'`

   **1 passed / 1 failed**. Compact passed. Desktop exposed the real trick-cue overflow: expected bottom ≤818, received 820. See `green-dev.log` and `red/hand-text-desktop-trick.json`. This was a development run, not a rebuilt-production claim; no injected CSS was used.

3. After reallocating desktop art/summary rows, development covering run:

   `OATHFRONT_E2E_API_PORT=3121 OATHFRONT_EVIDENCE_ROOT=docs/implementation/evidence/rivals-redesign/final-fix/dev-covering pnpm exec playwright test tests/e2e/responsive.spec.ts --grep 'ten cards and ten units fit'`

   **5 passed (26.1s)** at 1440×900, 1366×768, 1280×720, 1024×768, 1024×640. See `green-dev-covering.log`. Development captures were inspected, then retained in the ignored SDD workspace instead of duplicating them in the durable archive.

4. Changed-code checks all exited 0:

   - `pnpm exec eslint tests/e2e/responsive.spec.ts tests/e2e/match-foundation.spec.ts`
   - `pnpm exec tsc --noEmit`
   - `pnpm exec prettier --check apps/web/src/styles/rivals.css tests/e2e/responsive.spec.ts` → `All matched files use Prettier code style!`
   - `git diff --check`

   There is no configured Stylelint command. The production build also compiled and typechecked the application. The earlier 121 frontend/content/asset tests, full typecheck/lint and full browser gate were not repeated.

5. One covering production rebuild, justified by the changed CSS:

   `API_ORIGIN=http://127.0.0.1:3121 pnpm build`

   **Passed**, including contracts check, shared/API compilation, optimized Next compilation, TypeScript and standalone preparation. See `build.log`.

6. Bounded production verification against that new artifact:

   `OATHFRONT_E2E_API_PORT=3121 OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_EVIDENCE_ROOT=docs/implementation/evidence/rivals-redesign/final-fix pnpm exec playwright test tests/e2e/responsive.spec.ts tests/e2e/match-foundation.spec.ts --grep 'ten cards and ten units fit|exact versioned proxy'`

   **6 passed (11.8s)**: all five mixed-hand layouts plus unknown-route/proxy/local-auth checks. Console/page-error collectors were empty in all five layout cases. See `production.log`; actual production screenshots and geometry are in `task16/`.

7. Pending contract reconciliation check:

   `python3 docs/design/pen/check-pending-contract.py`

   `PASS: pending JSON; 24 tokens; 67 asset IDs/exports; 12 screen families; 36 component relations; repository hashes/paths; 8 handoff links.`

   `DESIGN NOT VALIDATED: no .pen source, node mappings or implementation approval.`

## Production identity and actual UI review

- Next build ID: `z9liUCQ66nCjg45VaZ4mR`.
- Standalone `apps/web/.next/standalone/apps/web/server.js` SHA256: `46c8c2317bfbfc59b5e2f73f5b166e5ac2d05c88b9dbfd8a8e74a9022f818c49`. This generic server shim hash is unchanged from Task 5; it is not used alone to identify the changed CSS.
- New compiled CSS: `apps/web/.next/static/css/88c6144c2aaf13c2.css`, SHA256 `bea7512373f2780a73871fe4c8d8c423049fc5aefcd8076c0b3322a50882c581`.
- Baked `/api/v1/:path*` rewrite verified as `http://127.0.0.1:3121/api/v1/:path*`.
- Committed `rivals.css` SHA256: `2a8af36cb80c2050213c4368fe05593e67a242d4872f9b40abe5d9d4cd75196f`.
- Committed QA SHA256: `431b61610894a0d5155155b9a5c85ec4c8aa2accd0925460565f0e54e7b28aa5`.

Opened the actual new production `task16/battle-1024-640.png` and `task16/battle-1440-900.png`, after inspecting the development captures. At 1024×640, cards remain 71.1875×88px, card bottom 634, latest summary/text bottom 625; every unit ATK/HP and the complete three-line trick cue fit. At 1440×900, cards remain 112.796875×144px, card bottom 818, latest summary/text bottom 808; art remains visible and the two-line trick cue fits. End phase remains fully visible and all five lanes remain readable. Long titles may clamp in the hand but the tested pointer/keyboard inspect path exposes their full heading and rules.

Applied gpt-taste within the approved existing game design, and reviewed the result with ui-ux-pro-max's essential-text, clipping, keyboard, focus, target/gap, contrast and responsive guidance. Existing semantic buttons, focus feedback, ink/paper colors, GSAP ownership and motion preferences are unchanged. No generic page redesign was applied. Fresh checks cover the changed board widths/heights, not physical touch, assistive technology, Safari/Edge, new 375px/200% coverage, or hardware performance.

## Pen baseline, protected state and remaining gates

Compared every pinned repository input against the actual committed source bytes. Only `rivals.css` and `rivals-redesign-qa.md` required new hashes. The baseline now points to `0f5354d7ca7a0dff66039fce1847ef0110fb3865`; all other hashes remain unchanged. Contract status stays `awaiting_design`, `implementationReady` stays false, and all actual Pen identity/node/instance/override fields and conflict-review/validation states remain unresolved. The checker verifies a pending repository contract, never a nonexistent design.

Before any development type generation/build, captured actual user-owned `apps/web/next-env.d.ts` with `.next-interactive/dev/types` imports. After each task-generated variation, compared the file against the exact expected `.next-e2e/dev/types` or `.next/types` substitution before restoring the snapshot. Final `cmp` passed byte-for-byte. That user diff stays unstaged and is excluded from both commits.

Read-only URL assertions confirmed both fixture DB URLs target loopback 55432 `/oathfront_verification_test`; no credentials were printed or changed. Playwright owned API 3121/UI 3200/internal 3201 and stopped its children. Final port inspection confirmed those ports free and original protected PIDs still listening: user UI 3000 PID 440642, API 3001 PID 440600, unrelated 3101 PID 20026. No persistent-browser cookies or interactive DB were accessed/reset; no user app was stopped, no `.env` changed, no branches/worktrees, push, deployment or registry action occurred.

The original integrated **82 passed / 4 failed / 2 skipped** and later **4/4 plus 1/1** covering history remain unchanged. Physical frame p95 remains failed/open at prior 21.4/21.7/22.5ms versus 20ms; the earlier 900-match balance baseline still shows 80% GOOD/Dawnward. Balance follow-ups, five human testers × two games, physical devices/touch/AT/Safari/Edge/audio, production OAuth/hosted acceptance and actual Pen design remain open. No engine, balance, load or hardware suite was repeated. The controller owns the scoped rereview, final whole-review archive, final push/CI and delivery metadata.
