# Realtime and 3D recovery implementation plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Checkboxes record verified implementation work, not merely intended work.

**Goal:** Replace periodic match fetching with authenticated WebSocket invalidations and make WebGL failure explicit.

**Architecture:** Existing HTTP commands and snapshots remain authoritative. Native API WebSockets subscribe to committed PostgreSQL invalidations through a dedicated direct listener. The browser coalesces recovery by revision. Three.js retains semantic controls and has an explicit recoverable error state.

**Tech stack:** Next.js 16.4.2, Fastify 5.12.7, Node 24, pg 8.23.1, ws, Vercel Functions 3.10.1, Three 0.186.1, and GSAP 3.15.

**Spec:** [Realtime recovery design](../specs/2026-10-23-realtime-recovery-design.md).

**Status:** All four implementation milestones are verified. API, client, and graphics reviews approved the changes after findings were resolved. Implementation commits `62ebfb8`, `0a387dd`, and `c25294c` are on `origin/main`. Final documentation commit and push remain controller-owned.

## Global constraints

- Preserve all fourteen pre-existing tracked changes and unrelated untracked audio assets, documentation, and tests.
- Native realtime; no five-second polling, paid service, or plan upgrade.
- 30-second ticket, 5-second handshake, 240-second stream, and 300-second hosted limit; exact UI Origin.
- No private match state on sockets. Use a dedicated, restricted-role direct PostgreSQL listener, never PgBouncer LISTEN.
- Keep existing game rules, HTTP receipts, and projected semantic Board intact.
- Keep English copy, the existing brand, keyboard access, 44 px actions, and 375 px support.
- Root owns lockfile edits, deployment, commits, and push. Implementers do not spawn agents.

## Review focus

- Notifications received while a snapshot is in flight must cause trailing recovery when needed (milestone 2).
- Ownership transfer without a revision change and revoked sessions must terminate authorization (milestone 1).
- LISTEN loss/reconnect and two API instances must recover without dropped state (milestones 1 and 4).
- Synchronous renderer failure during startup must not become ready afterwards (milestone 3).
- Hidden/offline tabs, repeated retry, session changes, and teardown must leave no live obsolete timers, sockets, or renderers (milestones 2 and 3).

## Milestone 1: Authenticated API realtime — verified

**Commit:** `62ebfb8`. Independent API review approved integration after raw-upgrade error and shutdown-order findings were fixed.

**Files:** `apps/api/src/realtime/*`, migration `packages/db/migrations/0007_match_realtime.sql`, DB migration registration/tests, shared schema and generated contracts; API app/hosted/server entrypoints, packaging/config, local ingress, and scoped tests.

**Interfaces:** `POST /api/v1/matches/:id/realtime-ticket` returns schema-validated `RealtimeTicket { url, token, expiresAt }`. The first frame is `{ type: "subscribe", token }`; server messages are `RealtimeMessage { type: "ready" | "changed", matchId, revision }`. `attachMatchRealtime(server, dependencies)` handles hosted and standalone upgrades. Internal PostgreSQL notifications carry `{ matchId, revision, ownerId }`; `ownerId` is not a browser field.

- [x] Add failing tests for endpoint authentication, Origin/CSRF, ownership, invalid/expired/revoked tickets, oversized frames, and absence of private socket payloads.
- [x] Test real PostgreSQL commit/rollback delivery and owner transfer without revision increments; verify listener failure closes subscribers.
- [x] Implement the trigger, dedicated listener, scoped tickets, bounded sockets, 300-second Node server export, and standalone integration.
- [x] Run focused API/DB checks, cold-start packaging, typecheck, and review; resolve findings before integration.

## Milestone 2: Event-driven browser recovery — verified

**Commit:** `0a387dd`. Independent client review approved the durable recovery notice and session-generation fixes. Final web/content suite: 161 tests passed.

**Files:** `realtime.ts`, `api-client.ts`, `use-match.ts`, exact-origin CSP, recovery controls and their minimal prop path, focused client tests, and integrated browser tests.

**Interfaces:** `api.realtimeTicket(matchId)` consumes milestone 1's API. Initial loading remains HTTP; a confirmed ready subscription starts authoritative catch-up through one coalescing runner. The store remains monotonic. Session-generation notifications dispose old synchronization work without replaying pending commands.

- [x] Add failing tests for ready/catch-up, duplicate/old invalidations, notifications during a fetch, reconnect, and hidden/offline cleanup. Prove there is no periodic five-second snapshot fetch.
- [x] Implement bounded reconnect, strict message validation, highest-revision trailing recovery, and exact-origin CSP; remove the recovery interval.
- [x] Preserve manual HTTP recovery when realtime setup fails. Keep recovery notices available after command-message dismissal, and suppress old-session unauthorized side effects.
- [x] Run focused web tests and typecheck; review lifecycle, security, and receipt behavior.

## Milestone 3: Explicit graphics recovery — verified

**Commit:** `c25294c`. Independent graphics review, including `ui-ux-pro-max`, approved the final implementation after empty-board focus and backdrop findings were fixed.

**Files:** `BattleScene.tsx`, `rendering/three/scene.ts`, typed scene-failure handling, scoped `arena-3d.css`, and arena browser regressions. Protected Settings/App/styles changes remained outside these commits.

- [x] Add regressions for unavailable WebGL, late startup failure, context loss, and retry leaving one canvas/controller.
- [x] Implement typed failure reasons, terminal per-attempt guards, idempotent cleanup, and explicit loading/error/text-board choices. Preserve Three measurements and semantic controls.
- [x] Verify the error panel at 375 px, tablet, and desktop sizes and verify functional retry. Complete the mandatory UI review and fix objective findings.

Focused graphics browser checks passed 11/11. Full MatchScreen checks also passed at 375, 768, and 1440 px after correcting a test heading string; that assertion mismatch was not an application defect.

## Milestone 4: Integration and release — verified

**Files:** implementation/runbook, compact redacted evidence, contract extension, environment examples, and local Docker/browser-server wiring. Protected architecture/auth/motion documents were untouched.

- [x] Verify two-instance socket/database integration and the real browser flow, including idle request counts, remote changes, and reconnect recovery.
- [x] Run relevant frontend/backend tests, root typecheck/lint, and production builds; inspect the scoped diff and protected-file hashes.
- [x] Verify Neon/Vercel targets, apply migration 0007 once to both existing Neon branches, configure the public origin and Fluid duration, and deploy API before UI.
- [x] Verify production aliases, native sockets, recovery, and a ready 3D scene. Record honest evidence and publish the scoped implementation commits to authorized main.
- [ ] Controller: commit and push the finalized documentation and compact evidence.

Production UI deployment `dpl_5fwooLbGMkBY46aKVyiZ3LK2tHKS` is READY at `https://oathfront.vercel.app` with `c25294c`. API deployment `dpl_BW9bHYAUGrP2f3p24JNL4XfcYn3i` uses `62ebfb8`; its production readiness endpoint is healthy. Production runtime readback confirms `matches_realtime_changed` and notify permission. An initial false trigger lookup used the wrong name and was not a migration failure.

The production smoke verified zero snapshot GETs over 11 idle seconds and one snapshot GET to recover an offline change. Its fresh guest match was surrendered and verified terminal. Vercel idle limits/quotas still apply, and one non-websocket `script-src`/`eval` CSP event remains uninvestigated.

The full project run recorded 924 passes and 1 failure during the concurrent session-listener fix. The subsequent affected API-client/ingress run passed 10/10, and the final client suite passed 161/161. Do not report the original full run as green. Details and retained limitations are in [the implementation report](../../implementation/realtime-recovery.md).
