# Task 13 implementation report

Status: independent implementation and focused technical acceptance completed; **real Google → application claim acceptance remains `awaiting_external_input`**. User reported successful Google sign-in but still saw the guest CTA before the callback-cache fix. No post-fix user confirmation has been received. A real provider callback is not claimed as passed.

Base: `dcca7bbd34a72b757736825b269c55a50e0cb52b`. Native commits on main, no push/deployment:

- `f1208f9` — pin official managed Neon wrapper and mature jose verifier.
- `3711bf3` — atomic guest claim, account sessions, recovery, replayable administrative closure, backend regressions.
- `44b9171` — Google UI/proxy, principal-scoped pending state, history, local setup and browser regressions.

Controller-owned milestone/index/evidence documents were excluded from commits. This report is a workspace handoff, not a milestone update.

## Delivered behavior

- Official `@neondatabase/auth/next` browser client and local `/api/auth/[...path]` route. `/api/v1/*` alone forwards to Fastify. Guest gameplay remains provider-independent.
- Strict jose verification of EdDSA/Ed25519, configured Auth **origin** issuer/audience, required subject/iat/exp, token lifetime ≤15 minutes, rejection of anonymous/forged/expired/wrong-issuer/wrong-audience identities. No identity token is stored in draft/session storage or logged. App cookies remain opaque HttpOnly/Secure with Origin/CSRF checks. Account lifetime is bounded by both 15 minutes and verified JWT expiry.
- Claim precedes exchange for an unclaimed guest. Conversion retains the principal ID. Merge transfers decks, matches, results, and noncolliding command receipts. Two active matches require explicit selection. The other match receives a replayable `AUTO ADMIN_ABANDON` transition, ABANDONED lifecycle, public outcome NONE/ACCOUNT_MERGE, consistent checkpoint/hash/events/result, no loss and no user-command receipt.
- All auth identity mutations serialize the verified subject using transaction-scoped advisory locks before UUID-sorted principal locks; principal locks precede match locks. Mutation services revalidate session revocation/expiry under the principal lock, closing claim/logout races.
- Receipt collision returns 409 IDEMPOTENCY_CONFLICT with complete rollback. No overwrite/deletion/hash collapse or automatic claim-ID repair. UI explicitly says nothing moved and guest access remains.
- Completed-claim replay supports original revoked-source cookie proof and the narrowly approved already-issued live account cookie proof. Both require exact original request, verified same subject, correct CSRF/Origin and original five-minute deadline; account proof additionally binds `last_issued_session_id` and target. Neither path repeats ownership changes or extends the deadline. Bootstrap recovery cannot revive a claimed guest.
- Stable browser API client rebinds CSRF without replacing pending command/save/create/rematch bodies or IDs. 401 preserves selection and expected revision; renewal never auto-submits the mutation. Another principal cannot inherit or auto-submit prior local intents. Pause and result dialogs expose auth recovery inside the native modal.
- Principal-scoped draft storage preserves the explicitly claimed guest's local data; failures retain an in-memory namespace with a no-reload warning. The T12 uncertain save/create catches now preserve the storage durability warning.
- Owned history renders 20 results per page with continuation, empty/loading/error states and item-wide links. Tutorials stay outside skirmish history. Existing game design, rules, timing and rendering were preserved.

## SDK callback defect found during final acceptance

The original production browser run passed five cases and failed two. One was a test timing/assertion issue. The second initially appeared to be callback-fixture sequencing, but investigation showed a real pinned-SDK cache defect:

`adapter-core-BDFV2Hgb.mjs` maps both `/get-session` and `/token` to its `getSession` hooks. Successful verifier restoration populates a session-shaped cache. A subsequent `token()` can return that cached session object without a token network request, leaving `data.token` absent. This explained the focused trace: get-session 200, no token request, generic login-recovery state. This was not merely a timing failure.

`managedToken()` now restores/removes `neon_auth_session_verifier` through the official `getSession()` hook, then calls `token()` with the installed adapter's supported `X-Force-Fetch` header. The adapter consumes the header and bypasses its cache. The focused production regression proves get-session consumption, URL cleanup, a subsequent real SDK token request, and successful Next → API → DB claim. The runtime change required a new production build. It also updates the user's current dev source through HMR without stopping their server.

Failure UI retains the pending intent and offers recovery. The user's cropped screenshot only showed the guest CTA; it cannot establish whether the error region was visible. The controller asked the user to reload/recover without logout, cookie clearing or storage clearing.

## Dependency and platform evidence

- npm registry metadata, retained in `task-13-evidence/dependency-metadata.json`, reports sole `latest` SDK `0.6.0-beta`, published 2026-10-12, and no stable SDK version. This is the explicitly approved narrow beta exception.
- `jose` is pinned to mature stable 6.2.12 (2026-09-05), not fresh 6.2.13 (2026-10-20). No new release-age exemption remains. A targeted transitive `jose@^6.1.0` override keeps the SDK on the same mature version. All preexisting lockfile package keys remain; the SDK adds 200 package keys. Unused core-js install script is disabled.
- SDK unused UI dependencies produce Better Auth plugin peer-version warnings and a TypeScript 5 logger peer range. No broad dependency changes were made to suppress them. The beta wrapper/compatibility and real-provider gates remain documented in `docs/AUTH.md`.
- Controller's explicit read-only Neon MCP inspection confirmed the authorized development project `round-darkness-78734677`, branch `br-odd-pine-a1pw77e9`, shared Google and localhost enabled, empty trusted-domain list. No remote mutation, alternate project, wildcard domain, secret rotation or production access was performed.
- Official references checked: Neon Next API-only quickstart, JWT plugin guide, OAuth setup and trusted-domain documentation; installed SDK exports/types/source and Next 16.4.2 local docs/types. Links are in `docs/AUTH.md`.

## Verification sequence and limits

This records the failures and fixes rather than presenting all checks as one clean run.

1. Backend auth tests began RED with four missing-route failures; conversion/recovery/merge implementation made them pass. A test helper assumption about match response nesting and the public outcome enum was corrected against the existing contracts.
2. Added collision rollback, concurrent command/merge, strict signed JWT, receipt transfer and history pagination/isolation coverage. Added renewal/lost-response/account-switch tests. Source-cookie and already-issued-account-cookie recovery regressions included wrong subject/session/choice/deadline denial.
3. Browser 401 pending-intent regression began RED because the existing controller cleared the pending action. The new behavior passed with exact body/ID/revision and selection retained.
4. Initial browser auth test began RED because no Google control existed. Subsequent dev runs reached claim/renewal/merge/modal flows. Failures included an incorrect create-link label and ambiguous status/alert locators; those were corrected against actual accessible UI. Storage-failure save/create recovery subsequently passed in production.
5. The verifier regression first failed due to an incomplete token-route mock; after correcting that mock, it legitimately remained RED because no verifier consumption occurred. Calling the official getSession hook added the required verifier restoration/cleanup.
6. Focused Vitest gate: **16 files / 61 distinct tests covered passing** across a 60/61 run plus the five-test auth-session file rerun. The lone initial failure was the test response fixture's invalid card instance ID under strict public-response validation; corrected that fixture and reran only its file. No full workspace/1,000-seed sweep was run.
7. Root TypeScript, web typecheck, changed-file ESLint, contracts generation check, browser private-engine/bundle boundary checks passed. Final scoped ESLint and `git diff --check` also passed after the callback fix.
8. API production build passed before the local setup smoke; backend runtime source did not change afterward. Local setup smoke on the separate interactive database returned home 200, real managed get-session 200/null and proxied public catalog 200. Secret files checked 0600. This anonymous smoke is not Google acceptance.
9. Initial production web build passed with **build-time** `API_ORIGIN=http://127.0.0.1:3101`. Initial full auth browser run: **5 passed / 2 failed**. Passing cases: guest independence/history, proxy separation, two-active merge/draft/history/responsive layouts, expired-session native-modal recovery, throwing-storage uncertain save/create exact retry.
10. Two focused follow-ups exposed a transient save-toast assertion (save had succeeded 201, then route remount replaced the message) and, after fixture sequencing was corrected, the real SDK cache defect described above. Save test now waits for actual renewal and POST 201, verifies the saved resource URL/name, then waits for guest bootstrap before navigation after logout.
11. After adding X-Force-Fetch, another web production build passed with the same build-time API origin. Focused callback case **passed**. The save case first failed only because the new test asserted `savedDeck.deck.id` instead of the contract's `savedDeck.id`; corrected the test and reran that single case: **passed**. Thus all seven browser acceptance cases have passing evidence, **five on the initial artifact and two on the rebuilt callback-fix artifact**; this is not described as a fresh seven-case all-green run. No unchanged suite was repeated.
12. Final native commits contain the verified runtime state. No push, deploy, publication, personal-account login or external messages were performed.

Focused Vitest command:

```sh
pnpm exec vitest run apps/api/tests/auth-claim.test.ts apps/api/tests/session-renewal.test.ts apps/api/tests/neon-jwt.test.ts apps/api/tests/guest.test.ts apps/api/tests/authorization.test.ts apps/api/tests/match-summary.test.ts apps/api/tests/results.test.ts apps/api/tests/persistence.test.ts packages/game-engine/tests/administrative-close.test.ts packages/game-engine/tests/replay.test.ts apps/web/tests/auth-session.test.ts apps/web/tests/api-client.test.ts apps/web/tests/intent-controller.test.ts apps/web/tests/browser-bundle.test.ts apps/web/tests/result.test.ts apps/web/tests/pending-create.test.ts
```

Final production commands (one browser/API fixture at a time):

```sh
API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build
OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/auth-claim.spec.ts -g 'signed fixture identity|managed callback'
OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/auth-claim.spec.ts -g 'signed fixture identity'
```

## Visual, console and artifact evidence

Evidence directory: `.superpowers/sdd/2026-10-20-oathfront-implementation/task-13-evidence/` (ignored local artifacts).

- `merge-desktop.png`, `merge-tablet.png`, `merge-mobile.png`, `history-mobile.png`: 1440, 768 and 375 viewport coverage; mobile no-horizontal-overflow assertion. Inspected visual spacing, choice labels, typography and focus/modal behavior; controller also inspected desktop/mobile. Objective CSS specificity and inherited text alignment findings were fixed before the initial final build.
- Per-case `*-console.json` records errors and unexpected-error filtering. Expected fixture statuses are 401, merge-choice 409, intentional failed social-start 400 and deliberately aborted storage-case network calls. Final passing cases report no unexpected errors; no raw provider URL/token/cookie/auth trace was copied into the report.
- `final-source-manifest.json`: preserved initial production build source hashes, timestamp 2026-10-20T18:46:09Z. It predates the interactive distDir addition and SDK cache bypass and did not enumerate E2E test files.
- `settled-source-manifest.json`: 265 source/test/config hashes including E2E, plus explicit delta from the initial manifest. Runtime/config delta: conditional interactive distDir and managedToken bypass. Nonruntime delta: launcher and auth docs; current tests included in the settled manifest.
- `settled-artifact-manifest.json`: 2,227 artifact hashes for API dist, web standalone/static and build manifests, build ID and verified rewrite destination `http://127.0.0.1:3101/api/v1/*`. Captured after the rebuilt artifact and focused checks. The settled report is not itself part of the app artifact.
- Test traces remain ignored transient test-run output; do not publish them as real OAuth evidence or extract sensitive payloads. Fixtures use ephemeral local signing keys and mock managed endpoints; the actual application JWT verifier and real PostgreSQL transaction flow run underneath.

## Interactive readiness and ownership

`node scripts/prepare-auth-db.mjs` inspected the existing local runtime role, created only the absent `oathfront_interactive` database, applied reviewed existing migrations/runtime grants and wrote ignored0600 `.env.auth-app.local`. It does not reprovision roles or rotate secrets. Test resetters remain on `oathfront_verification_test`.

Startup instructions are in `docs/AUTH.md`: `pnpm build:api`, `node scripts/prepare-auth-db.mjs`, `node scripts/local-auth.mjs`; use **http://localhost:3000**. The launcher reads the explicit dedicated DB file and managed-development configuration, refuses nonloopback app DB, and sets `OATHFRONT_INTERACTIVE=1`. New launcher instances use `.next-interactive`; default test dev uses `.next/dev`. Next already separates production and dev output; the extra directory is for simultaneous dev locks.

The user started their existing 3000/3001 listeners before that flag was added. Safe inspection found OATHFRONT_INTERACTIVE absent and `.next/dev/lock` present. Their listeners, database and browser were preserved; no competing listener was started. T14 should use a separate E2E dev directory or production artifact while the user instance remains active. Builds regenerated next-env as usual; its current tracked contents equal baseline, no manual replacement or generated-file commit was made. tsconfig was not changed by the isolation update.

Next development request and browser-forwarded console logging are disabled (`logging:false`); managed proxy uses `logLevel:"silent"`. Callback URL construction allowlists only safe game path/hero/preset fields. No raw verifier/authcode persistence or logs are intended.

Latest external acceptance evidence: user reported Google sign-in succeeded but application still displayed guest CTA before the cache fix. Controller's read-only aggregate on the dedicated DB then found 0 accounts, 1 unclaimed guest, 0 completed claims, with no personal identifiers read/output. This is **not** post-fix failure evidence. User was invited to reload/recover after the focused fix passed; response is pending.

## Handoffs

T14:

- `SessionResponse.principal.tutorialCompletedAt` and `evilTutorialCompletedAt` are already returned and coalesced during account merge; `activeMatchId` remains the active match seam. Keep tutorial gameplay outside skirmish history.
- Use `usePrivateStorage()` inside the App-owned `PrivateStorageContext` for persisted per-principal tutorial choices/intents. Keys are automatically prefixed `oathfront.owner.<principalId>.`; do not bypass the context with raw shared sessionStorage for private pending mutations.
- Preserve stable API client and `bindSession` semantics; do not clear pending envelopes or retry automatically on 401. Native modal recovery uses `SessionRecovery`/shared `RecoveryControls`.
- Keep user interactive DB and active default dev lock isolated from automated resetters/listeners. Full M4 integration gate belongs to Task14.

T18:

- Reuse `abandonMatch(state,"EXPIRED")`, closed replay operation `AUTO ADMIN_ABANDON`, and `persistTransition(...,null)` under principal-first locks and the existing transaction. Null receipt is guarded to accept only this server-only journal operation. Validate state/hash/events/result together; never change only the match status. ACCOUNT_MERGE currently uses this path and has replay regression coverage.

Remaining release limitations: actual post-fix Google→app claim callback confirmation, production custom Google OAuth/trusted production origins, existing broader device/accessibility/load/retention gates. No other known Task13 implementation blocker remains; controller review is still required.

## Controller post-report real Google acceptance update

Observed 2026-10-20T19:01:36.410896+00:00. User explicitly confirmed “Đã hiện đúng tài khoản” after the callback-cache fix and reload/recovery. A read-only aggregate on the dedicated oathfront_interactive DB verified one ACCOUNT principal, one completed auth_claim, one live account session and session lifetime≤15 minutes. No email, identity subject, cookie, JWT or personal identifier was read/output. Basic real Google→callback→persisted app claim is now confirmed; this supersedes only the earlier pending basic-callback status. Real-provider logout/relogin, existing-account merge and retained-resource round-trip were not separately performed by the user; their automated coverage is distinct. Evidence: task-13-evidence/real-google-acceptance.json.

## Review fix round 1 — 2026-10-21

Base `44b9171`; fix commit **`2caa8e1` — `fix(auth): recover without storage and retain provider cleanup retry`**. Addressed Important 1 and Minor 1/2 from `task-13-review.md`. Minor 3 remains the approved SDK peer-warning debt, explicitly carried to T18 in `docs/AUTH.md`; no provider, dependency or lockfile changes were made.

### Changes

- In-place `AuthPanel.complete()` treats auth-intent persistence as best effort. The same intent ref retains command ID, source/CSRF proof and choice across storage failures, failed exchange and explicit recovery. A separate sticky alert explains that data is only held in the open page and must not be reloaded/navigated away. Generic failure and successful renewal messages no longer erase that alert. App session adoption also catches access to unavailable sessionStorage itself, so a committed cookie/session is not rejected because retrieving the browser storage object throws.
- Redirect login remains a separate path: if the intent cannot be durably saved, the app refuses to start Google navigation and explains that memory cannot survive it. It offers in-place recovery rather than pretending the pending state will survive a redirect. Auth success still never auto-resends the pending gameplay/save/create mutation.
- Only `HistoryScreen` receives a fresh key on adopted app-session CSRF changes. This invalidates the guest page/cursor after claim, including same-ID conversion, and refreshes after renewal. The surrounding main/editor tree is not keyed on that session change; pending editors remain mounted.
- Added a small client-side provider cleanup store containing only `idle/running/pending` status, a generation counter and listeners. Its server snapshot is the constant `idle`. Explicit app logout revokes the app session once, starts provider cleanup and calls onLogout once. If provider cleanup fails, **Thử đăng xuất Google lại** remains available across client page navigation and only calls the managed provider sign-out function. It never calls application logout/onLogout again and cannot revoke a newly bootstrapped guest app session.
- A newly successful authentication retires stale provider cleanup. Generation checks prevent an older asynchronous failure from reviving that obsolete retry state. Subscriptions never perform cleanup automatically. Retry state is deliberately in memory and does not survive a full document reload; no credentials or new persistent storage abstraction were added.

### Focused RED → GREEN evidence

1. Added exactly three covering browser regressions before runtime edits and ran them against the retained `44b9171` production artifact on localhost3100/API3101. **0 passed / 3 failed**, each at the intended finding: storage failure produced zero exchange requests; account history remained absent after successful in-place claim; provider-only retry control was missing. Existing interactive localhost3000/3001 and `oathfront_interactive` were not used.
2. Implemented the fixes and self-reviewed with the receiving-code-review/TDD workflow, existing gpt-taste product constraints, ui-ux-pro-max error recovery/accessible feedback guidance and React rules. No layout redesign, motion or dependency work was added. The provider cleanup state is external only to survive the known App/page remount; it is not server request state.
3. Two focused provider-cleanup unit cases passed: failed state survives subscribers and new login retirement performs no implicit sign-out; a late obsolete failure cannot restore cleanup after retirement, and simultaneous cleanup calls do not duplicate the provider request.
4. Root TypeScript, web TypeScript, scoped ESLint and diff whitespace checks passed. Scoped files: App, AuthPanel, provider-signout, provider-signout tests and the auth browser specification.
5. Ran **one fresh production web build this round**, with build-time `API_ORIGIN=http://127.0.0.1:3101`: passed compilation, TypeScript and route/artifact generation. API runtime was unchanged and was not rebuilt. No 61-test suite or original seven-case browser sweep was repeated.
6. Ran the same three browser regressions against the new artifact: **3 passed / 0 failed in 8.6 seconds**. No subsequent runtime/source edits were needed. The storage test aborts the first exchange, verifies identical auth request body on recovery, blocks attempted Google navigation with a truthful limitation, retains the warning after success, observes only the original rejected save until the user clicks explicitly, and then verifies the save's identical ID/body and 201 response. The history case observes the empty guest list before releasing the identity response, then verifies the existing account's match appears without navigation. The provider case fails initial provider logout, bootstraps/navigates as a new guest, explicitly retries only provider cleanup and verifies the guest SessionResponse is unchanged and application logout count remains one.
7. Inspected warning screenshots at 1440×900, 768×1024 and 375×812 plus the provider retry at 375×812. Text wraps, controls are readable, and no horizontal overflow was found. Each focused case recorded no unexpected browser errors; intentional 401, aborted exchange and mocked provider 400 remain explicitly filtered and retained in its console JSON.

Commands:

```sh
OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/auth-claim.spec.ts -g 'review:'
pnpm exec vitest run apps/web/tests/provider-signout.test.ts
pnpm --filter @oathfront/web typecheck
pnpm exec tsc --noEmit
pnpm exec eslint apps/web/src/app/App.tsx apps/web/src/features/auth/AuthPanel.tsx apps/web/src/features/auth/provider-signout.ts apps/web/tests/provider-signout.test.ts tests/e2e/auth-claim.spec.ts
API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build
OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/auth-claim.spec.ts -g 'review:'
```

The listed command grouping is for reproducibility; actual ordering was RED browser → edits → two unit cases → scoped lint/web typecheck → one web build → GREEN browser, with root typecheck/final scoped lint/diff-check overlapping only the browser run (no competing DB fixture).

### Exact source/artifact delta and ownership

Retained prior manifests and original verification chronology. New ignored evidence in `task-13-evidence/`:

- `review-fix-source-manifest.json`: 267 hashes; exact six-file delta from `settled-source-manifest.json` is App.tsx, AuthPanel.tsx, new provider-signout.ts, new provider-signout.test.ts, docs/AUTH.md and tests/e2e/auth-claim.spec.ts.
- `review-fix-artifact-manifest.json`: 2,227 artifact hashes; exact added/removed/changed path/hash delta covers 74 paths versus the previous artifact manifest. Build-time API rewrite is verified as loopback3101. All API dist hashes are unchanged.
- `review-fix-verification.json`: original three expected failures, same-command three-pass result, unit/static/build counts and isolation record.
- `review-storage-renewal-{desktop,tablet,mobile}.png`, `review-provider-retry-mobile.png`, and the three `review-*-console.json` files: focused visual/console evidence only; no real auth payloads or credentials.

The controller-owned `docs/README.md`, `docs/implementation/milestones.md`, `docs/implementation/auth-sessions.md`, and `docs/implementation/evidence/task13/` were excluded from this commit. Report changes are appended only in this prescribed ignored file. No listeners were started on3000/3001, no dev lock was acquired, no interactive DB action was performed, and the user's successful Google account session was not logged out or cleared. Basic real Google acceptance recorded in the controller appendix remains valid; these regressions do not claim additional real-provider logout/relogin acceptance.

Status: review findings Important1, Minor1 and Minor2 addressed with passing focused evidence; ready for controller re-review. Known remaining debt is the approved SDK beta/peer compatibility and the previously documented broader release gates. No push or deployment performed.
