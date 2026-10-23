# Realtime match updates and explicit 3D recovery

## Intent and authority

The user requested WebSockets instead of five-second match polling at `https://oathfront.vercel.app`, and removal of the automatically displayed old two-dimensional battlefield. The approved battlefield remains the existing four Three.js arenas, Master Duel camera direction, OathFront identity and Runeterra-inspired cards. The supplied browser error reports WebGL disabled; enabling graphics acceleration may restore it, but the application cannot override a browser/driver restriction.

The user previously authorized implementation, small commits, push and production deployment on the existing Vercel Hobby projects. Existing unrelated auth/audio changes must be preserved and excluded from commits. No game rules, artwork, rewards or balance changes are in scope. Earlier blanket UI-only restrictions are superseded only for the explicitly requested realtime transport.

## Transport design (implementation choices)

- Commands, idempotency receipts, bot ADVANCE, snapshots and visible-event recovery must remain authoritative HTTP operations. A WebSocket carries only match revision invalidations. It must never carry checkpoints, hidden cards, seeds, action journals or raw events.
- Use native Vercel Functions WebSockets with Fluid Compute, already generally available on all plans. Retain the two-project deployment. No paid broker, new account or shared UI database/session secret is required. Hobby maximum invocation duration is 300 seconds; close streams at 240 seconds and reconnect with recovery. Free-tier quotas and platform idle timeouts remain applicable. The 240-second rotation is a maximum stream lifetime, not a guaranteed minimum connection duration; reconnect and HTTP recovery must also handle earlier closure.
- Export an actual Node HTTP server from the API hosted entrypoint, retaining the existing lazy HTTP handler and controlled configuration failure. Attach the same upgrade handler to standalone Fastify. WebSocket path is `/realtime/matches` on the public API origin. HTTP-only Next forwarding remains unchanged.
- Add authenticated, Origin/CSRF-checked, rate-limited `POST /api/v1/matches/:id/realtime-ticket` with an empty object body. It must check current session and exact match ownership. Return `RealtimeTicket {url, token, expiresAt}`. A signed ticket is subscribe-only, audience/domain separated from other tokens, bound to one session, principal and match. Handshake validity is at most 30 seconds and never exceeds session expiry. Tickets stay in memory and the first WebSocket frame; never URL queries or logs.
- The upgrade must require the exact configured UI Origin, the one protocol/path and bounded resources. First frame is `{type:"subscribe",token}`. Timeout after five seconds; reject malformed/oversized frames, unsupported messages, invalid signature/audience, expiry, revoked/merged sessions and mismatched ownership. Revalidate session/owner before sending an invalidation. Streams also close at session expiry. Unauthenticated connections must not allocate a database listener.
- Wire messages are `RealtimeMessage`: `{type:"ready"|"changed",matchId,revision}` with nonnegative safe integer revision. Browser validates messages and ignores another match or old revision. The ready message is sent only after listener subscription and current authorization are established.
- Subscription ordering must be LISTEN acknowledgement, subscriber registration, fresh authorization/revision read, ready, then queued invalidations. This prevents an update between the authorization read and registration from being lost. Direct upgrade admission is separate from the HTTP proxy's client-IP HMAC; the browser must never receive `UI_PROXY_SECRET`.
- Revocation is checked on subscription and before every invalidation. An idle revoked socket may remain open until its 240-second rotation or session-expiry deadline, but cannot receive a subsequent invalidation. Every HTTP read reauthenticates. Immediate idle revocation is not claimed and does not require extra periodic database reads.
- Transactional PostgreSQL `NOTIFY` supplies cross-instance coordination. Add a forward migration trigger on match INSERT and meaningful UPDATE of revision, status or human owner. The internal payload is `{ matchId, revision, ownerId }`. Browser messages omit `ownerId` and remain `{ type, matchId, revision }`. Delivery occurs after commit, never rollback. Owner changes must notify even without revision increment.
- A dedicated `pg.Client` listens on `oathfront_match_changed`; never use the PgBouncer transaction pool for LISTEN. Derive the direct Neon hostname from the already validated runtime URL using the exact `-pooler.` hostname suffix substitution, preserving restricted runtime role, database and TLS. Local PostgreSQL uses the same local hostname. Owner/migration credentials must not enter hosted runtime.
- Share one listener per process with active authorized sockets; close it when the last subscriber leaves. On listener error/disconnect, close dependent sockets so reconnect and HTTP recovery cannot silently miss committed changes. NOTIFY is an invalidation mechanism, not a durable event log. Store and replay remain the existing database snapshot/event journal.
- Configure the public API WebSocket origin explicitly for production/local; return only that allowed endpoint. CSP must allow the exact API WSS origin, not arbitrary connections. Docker/local public endpoint must be reachable by the user's browser; internal `db` or service hostnames must not escape into the browser.

## Browser lifecycle

- Remove the five-second recovery interval. After a verified subscription ready message, recover the latest board/events. Fetch again only when a newer revision is announced, on recovery/reconnect or explicit user retry. Existing command responses update immediately.
- If an invalidation arrives during recovery, retain the highest required revision and do a trailing recovery if the accepted response has not reached it. Duplicate messages must not cause repeated GETs. New information arriving while a response is being accepted must not be lost.
- Use bounded reconnect backoff with jitter (1–30 seconds), reset after a confirmed subscription, and no hidden HTTP polling fallback. Suspend sockets and timers when hidden/offline; reconnect and recover when visible/online. Dispose all timers/listeners/sockets and abort obsolete reads on match/session change or unmount. Observe actual session-binding generations; identical bindings are no-ops, and an old unauthorized response must not expire a renewed session. Preserve pending command envelopes without automatic replay. Do not resume bot advancement while board recovery has failed.
- Disconnect alone must not cause repeated selection resets or disable controls every five seconds. Report failed recovery honestly using the existing recovery UI and manual retry. Keep board-recovery and transport-failure notices independent of dismissible command messages, so Escape cannot hide the only recovery action. Manual retry must perform HTTP recovery even when realtime setup cannot reach ready. An unavailable realtime service must not be claimed as connected.

## 3D error handling and presentation

- The old grid must not flash during Three startup or appear automatically after failure. Preserve the semantic Board and its projected legal targets, keyboard controls and inspection behavior when rendering works.
- During loading show a small centered Preparing battlefield status over the existing arena backdrop. On failure show a compact OathFront error panel using existing fonts/tokens, with Retry 3D and Use text board actions. The latter deliberately reveals the existing accessible board; do not label it 3D.
- Distinguish graphics initialization unavailable, lost WebGL context, scene load failure and rendering failure. Graphics initialization copy should explain enabling browser graphics acceleration and restarting; do not assert the toggle is certainly off. Other errors must not misleadingly prescribe GPU settings as their only remedy.
- A renderer attempt that fails is terminal. Failure cannot be overwritten by a later ready state, including synchronous failure during startup fast-forward or pause synchronization. Cleanup is idempotent, preserves authoritative view, and leaves no disposed controller/listeners/canvas resources active. Retry creates exactly one renderer.
- Keep English product copy, visible focus, keyboard/touch actions at least 44 px, readable error content at 375 px, and reduced-motion behavior. No new visual direction or new animation engine is introduced.

## Evidence and release requirements

Verify subscription authorization, bad Origin/tickets, session revocation/owner transfer, committed versus rolled-back notifications, listener loss, reconnect catchup and coalescing during an in-flight recovery. Verify two connected API instances share invalidations and that an idle browser issues no five-second snapshot requests. Verify WebGL-disabled, context-loss, post-ready failure and successful retry in browser; inspect mobile/tablet/desktop and console errors.

Use focused checks first, then relevant type/lint/build/integration checks. Apply and verify the migration on isolated local PostgreSQL before the authorized Neon production database. Deploy API before UI and verify both exact production aliases. Do not claim a real user device now has hardware acceleration or physical-device performance was measured.

## Implemented and verified release

The scoped API, client, and graphics reviews approved the implementation after their findings were resolved. Commits are `62ebfb8` (API), `0a387dd` (browser recovery), and `c25294c` (WebGL recovery). API and UI production deployments are READY, and the actual production browser flow verified native `ready`/`changed` frames, zero snapshot GETs over 11 idle seconds, and reconnect recovery with one snapshot GET. The fresh smoke-test match was surrendered and verified terminal.

Migration 0007 is applied on both existing Neon branches. Production runtime readback confirmed trigger `matches_realtime_changed` and notify permission; an earlier false lookup used an incorrect trigger name and did not indicate migration failure. Platform idle limits and quotas remain applicable. One non-websocket `script-src`/`eval` CSP event remains uninvestigated.

The full project run recorded 924 passed and 1 failed during a concurrent session-listener fix; subsequent affected checks passed 10/10 and the final client suite passed 161/161. These are not a claim of a later green full-project rerun. See [the implementation and release evidence](../../implementation/realtime-recovery.md) for exact deployment IDs, review outcomes, browser checks, and remaining limits. The later courtyard art/interaction redesign is a separate milestone.

## Current sources

- [Vercel WebSockets](https://vercel.com/docs/functions/websockets), verified 2026-10-23.
- [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration).
- [PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html) and [LISTEN](https://www.postgresql.org/docs/current/sql-listen.html).
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).
- [Google graphics acceleration/WebGL guidance](https://support.google.com/meet/answer/9302964?co=GENIE.Platform%3DDesktop&hl=en).
