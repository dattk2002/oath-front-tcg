# Task 13 review

## Spec compliance

**❌ Issues found.** The implementation covers the requested Google proxy/JWT boundary, guest conversion and merge, bounded recovery, logout, history, principal-scoped drafts and explicit pending-action retry. One resilience gap remains: in-place account renewal cannot run when local storage rejects writes (`apps/web/src/features/auth/AuthPanel.tsx:107`).

**Real Google acceptance update:** The controller supplied new evidence during review, superseding the report's earlier pending status. `task-13-evidence/real-google-acceptance.json` records the user's “Đã hiện đúng tài khoản” confirmation and the controller's read-only aggregate: one account, one completed claim, one live account session, bounded to 15 minutes. This supports basic real Google → callback recovery → persisted app claim acceptance. It does not establish real-provider logout/relogin, two-active-match merge, or retained draft/match behavior; those are covered by fixtures, not separately by the user.

**⚠️ Cannot verify from this diff:** Production custom OAuth credentials/trusted production origins, production deployment, and broader device/accessibility/load/retention release gates remain outside Task 13. No production-readiness claim is made. The controller's reported 265 source and 2,227 artifact hash matches were accepted as controller evidence, not rerun by this reviewer.

## Strengths

- `apps/api/src/auth/claim.ts:36`, `apps/api/src/auth/exchange.ts:25`, and `apps/api/src/matches/repository.ts:44`: verified subjects serialize before sorted principal locks; the concrete repository command path then acquires the match lock. `apps/api/src/matches/service.ts:192`, `apps/api/src/decks/service.ts:49`, and `apps/api/src/auth/logout.ts:13` revalidate sessions under the principal lock.
- `apps/api/src/auth/claim.ts:78` binds already-issued-cookie recovery to the exact live issued session, matching subject/target, command/hash and original recovery deadline. `apps/api/src/auth/claim.ts:128` preflights receipt collisions before ownership changes. The tests exercise rollback, revoked-source proof, unrelated account sessions, changed choice/subject, deadline, concurrent command/claim, and transferred receipt replay.
- `apps/api/src/auth/neon-jwt.ts:43` requires signed identity claims and bounds token lifetime; `apps/api/src/auth/neon-jwt.ts:81` bounds app expiry. `apps/web/src/features/auth/neon-client.ts:15` documents and scopes the SDK cache bypass rather than replacing the managed provider protocol.
- `apps/api/src/auth/claim.ts:168`, `packages/game-engine/src/replay.ts:123`, and `packages/game-engine/src/terminal.ts:79` make administrative abandonment a closed server-only replay operation with consistent terminal state and no loss outcome. The existing database journal column already permits a null command ID.
- `apps/web/src/app/App.tsx:64` keeps the API client stable; `apps/web/src/features/match/intent-controller.ts:96` preserves the exact pending envelope after 401. Principal-scoped storage and explicit claim migration isolate unrelated owners.
- `apps/web/src/features/auth/MergeConflictDialog.tsx:29` uses a labeled native modal with focus restoration and semantic choice buttons. `apps/web/src/features/history/HistoryScreen.tsx:79` makes each history row a genuine primary link. The retained desktop/tablet/mobile screenshots show readable text, visible heading focus, clear choices and no visible clipping.

## Issues

### Critical

None found.

### Important

1. **In-place renewal is blocked by unavailable or full browser storage.** `apps/web/src/features/auth/AuthPanel.tsx:107` writes `oathfront.auth-intent` inside the outer authentication try block before `managedToken()` or `api.exchange()`. If `setItem` throws, execution jumps straight to the generic login-recovery message. Every automatic or explicit renewal repeats that failing write, although the intent already exists in `intent.current`, the managed identity may be valid, and gameplay/save/create requests remain available in memory. This prevents the required renewal-plus-explicit-retry flow precisely when the application tells the user to keep the page open.

   Make persistence best effort for the in-place `complete()` path, retain the exact intent in memory, and show an explicit no-reload warning while allowing token retrieval/exchange. Handle redirect login separately: losing durable state across a real Google navigation requires an honest limitation, not a claim that memory survives navigation. Add only a focused throwing-storage renewal regression that verifies exchange succeeds and the pending mutation remains unchanged and unsent until explicit retry. Existing throwing-storage E2E coverage tests save/create transport failures, not this intersection. Static control flow establishes the defect; no additional test run was needed.

### Minor

1. **History does not refresh after a successful guest merge on the history page.** `apps/web/src/features/history/HistoryScreen.tsx:32` fetches only when the stable API object or retry counter changes, while `apps/web/src/app/App.tsx:86` deliberately avoids remounting on an explicit claim. The already-loaded guest history therefore remains on screen after ownership moves to the account. Existing-account history appears only after navigation/reload; a guest-owned continuation cursor can also be rejected under the new owner. Pass a session/ownership refresh signal to the history reader or invalidate its page after successful claim, without remounting unrelated pending editors.

2. **Provider sign-out failure has no matching retry control.** `apps/web/src/features/auth/AuthPanel.tsx:230` clears the app identity before calling managed sign-out at line 231. On a provider error the message asks the user to retry Google logout, but the account-only logout button is no longer rendered; the remaining controls log in or recover a session. Keep an explicit provider-sign-out retry action until cleanup succeeds. This does not invalidate the successful app-session revocation.

3. **Known dependency peer warnings remain.** `apps/web/package.json:7` introduces the approved beta wrapper; `docs/AUTH.md:3` records its Better Auth plugin and logger TypeScript peer-range warnings. These are disclosed compatibility debt, not evidence of clean install output. Keep the limitation tracked under the narrow SDK exception; do not broaden dependency upgrades merely to silence it.

## Focused checks and evidence

- Reviewed the supplied `review-dcca7bb..44b9171.diff` in bounded sections. Generated lock changes were assessed structurally by importer, package/snapshot headers and net header delta; repeated moved blocks and integrity lines were not treated as handwritten application logic. No Git recrawl, suite run, build, server action or database action was performed.
- **Origin/authorization propagation risk:** inspected the otherwise omitted `buildApp` hook/authorization context (`apps/api/src/app.ts:64`) and concrete match/deck routes. Mutation Origin checks cover the new auth routes, and route handlers pass authenticated principals into the mutation services.
- **Claim/command lock-order risk:** inspected the omitted complete repository transaction wrappers (`apps/api/src/matches/repository.ts:116`), establishing principal-before-match acquisition for the concrete command and replay paths.
- **Claimed-bootstrap resurrection risk:** checked unchanged `apps/api/src/auth/guest.ts:26`; bootstrap recovery locks/reloads the principal and rejects non-guest, merged, expired or claimed principals.
- **Receipt/journal schema compatibility risk:** checked `packages/db/migrations/0001_core.sql:12`, `:87`, and `:239`; source claim uniqueness is enforced and administrative journal `command_id` is nullable.
- **Pending-envelope durability risk:** the changed intent-controller catch hunk was cut off from its persistence helper, so the omitted function context was inspected (`apps/web/src/features/match/intent-controller.ts:49`). It preserves the pending envelope in the store and persists it through the caller's principal-scoped storage.
- **Native-modal keyboard risk:** checked unchanged `apps/web/src/features/match/keyboard.ts:36`; `openDialog` uses native modality, initial focus, a Tab loop, and focus restoration. Applied `ui-ux-pro-max` guidance for visible modal focus, accessible controls, responsive layout and interaction feedback. No new motion was introduced by these auth/history components.
- Visually inspected `merge-desktop.png` (1440), `merge-tablet.png` (768), `merge-mobile.png` (375), and `history-mobile.png`. Read all retained `*-console.json` plus `auth-console.json`: no recorded unexpected errors; intentional 401/409/400 and aborted-network fixture errors are explicitly separated.
- Consumed the report's exact test history: 61 distinct Vitest tests covered across the initial run and focused fixture correction; seven browser cases have passing evidence, five on the initial artifact and two on the callback-fix artifact. This is not a fresh seven-case green run. No test/build success is asserted from a new reviewer execution.
- Read retained real-provider acceptance evidence only; did not inspect personal identifiers, tokens, user cookies, active listeners or the interactive database.

## Assessment

**Task quality: Needs fixes.** The backend security and transaction boundaries are carefully implemented and the browser changes preserve the intended identity and pending-action semantics in the covered normal flows. Fix the uncaught storage dependency in in-place renewal before accepting Task 13; the remaining findings are targeted usability/compatibility follow-ups.
