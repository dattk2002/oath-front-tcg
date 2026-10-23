# Realtime match updates and graphics recovery

The realtime and explicit graphics-recovery release is deployed and verified. Its implementation commits are `62ebfb8` (API), `0a387dd` (browser recovery), and `c25294c` (WebGL recovery). API, client, and graphics reviews approved the scoped changes after their findings were resolved. The later courtyard redesign is a separate milestone.

## Behavior

Match commands and idempotency receipts remain authoritative HTTP operations. Native WebSockets announce only a match ID and revision; authenticated snapshot and event reads apply newer state. The previous five-second recovery interval is removed. A subscribed, idle browser makes no periodic snapshot request. Reconnect, renewed sessions, and visible-tab restoration resubscribe and catch up. Explicit Reconnect remains usable when socket establishment fails.

Revision notifications received during a recovery retain the highest required revision and cause a trailing read when necessary. Duplicate or older notifications do not fetch again. Transport disconnection alone does not disable play or clear selection. An actual recovery failure pauses play and bot advancement until recovery succeeds. Recovery notices and the Reconnect action remain available when Escape clears an ordinary command message.

The API issues an HMAC ticket with a maximum lifetime of 30 seconds, bound to the session, principal, and match, through an Origin- and CSRF-protected POST. The browser sends it in the first WebSocket frame, never in a URL or persistent storage. Direct upgrades require the exact UI Origin. Subscription and each outbound invalidation recheck session and match ownership. An idle, revoked socket may remain open until rotation or session expiry, but it receives no further invalidation after authorization fails. Every snapshot read reauthenticates.

One restricted-role, direct PostgreSQL connection per active API instance listens for transactionally committed match changes. Trigger `matches_realtime_changed` covers revision, status, and owner changes, including transfers without revision increments. Its internal `oathfront_match_changed` notification contains only `matchId`, `revision`, and `ownerId`. Browser messages contain only `type`, `matchId`, and `revision`; they never expose `ownerId`. Rollbacks emit nothing. A lost listener closes its streams so the next subscription recovers durable state. Notifications are not a durable event log.

Streams rotate after 240 seconds, before Vercel Hobby's 300-second maximum invocation duration. The first-frame timeout is 5 seconds. Limits are 2 KiB per payload, 128 connections per instance, 32 unauthenticated connections, 4 connections per session, and 64 KiB of send backlog. Hidden or offline tabs close transport. Vercel idle timeouts and connection/invocation quotas also apply: 240 seconds is a maximum stream lifetime, not a guaranteed minimum connection duration. Reconnect and HTTP recovery handle earlier closure. No paid service or account upgrade was introduced.

## Runtime setup

- API: `PUBLIC_REALTIME_URL=wss://oathfront-api.vercel.app/realtime/matches`.
- API `vercel.json` explicitly enables Fluid Compute. Its exported Node HTTP server accepts upgrades and retains the ordinary HTTP handler.
- Normal SQL retains pooled `DATABASE_URL`. The LISTEN client derives the direct endpoint with the same restricted role and TLS configuration. No owner URL is deployed.
- Hosted frontend CSP permits only its configured `API_UPSTREAM_ORIGIN` converted to WSS.
- Docker uses `PUBLIC_REALTIME_URL=ws://localhost:<UI_PORT>/realtime/matches`. The UI ingress forwards only that exact path to the private API. It strips cookies and proxy credentials and closes active or late upgrades during shutdown.
- Native local development uses loopback API WebSockets. Local production builds receive `APP_ORIGIN` so CSP permits the explicit browser-facing WS origin.

## Graphics recovery

The renderer no longer silently displays the old grid after WebGL failure. It shows reason-specific English recovery text, **Retry 3D**, and an explicit **Use text board** choice. The semantic board remains available for projection, targeting, and accessibility. Context loss, startup draw failure, later render failure, and module-load failure are distinct. Failed attempts cannot become ready later, cleanup is idempotent, and keyboard focus has an empty-board fallback.

Enabling browser graphics acceleration may fix the user's reported disabled-WebGL context. Application changes cannot enable a blocked GPU or repair a driver.

## Verification

- API checks: 54 focused tests, 2 real hosted lifecycle tests, and 7 runtime/unit tests passed. Coverage included authentication, Origin/CSRF, ownership/revocation, transaction commit/rollback, two API instances, subscription-gap updates, listener loss, and host shutdown/reset regressions.
- Final client web/content checks: 161 tests passed, including coalescing, hidden/offline lifecycle, missing socket service, durable recovery notices, session rebinding, and stale unauthorized responses.
- Standalone graphics browser checks: 11 passed, including context loss, both synchronous startup failure paths, retries, geometry at widths of 375, 768, and 1440 px, and empty-board focus.
- Full project run: **924 passed and 1 failed** while the newly added session-listener regression was being fixed concurrently. The final API-client/ingress rerun passed all 10 tests, and the final client suite passed. There was no later green full-project rerun; the original failure remains part of the evidence.
- Local integrated browser: verified `ready`/`changed` frames, zero snapshot GETs during an 11-second idle window, remote PAUSE propagation, and recovery of an offline change, with no page errors. Full MatchScreen graphics-error checks passed at widths of 375, 768, and 1440 px after correcting the test's expected heading string. That initial browser failure was a test assertion mismatch, not an application defect. See [local realtime observations](evidence/realtime-recovery/local-realtime.json).
- Root typecheck, lint, API build, and hosted-profile Next production build passed. Independent API, client, and graphics reviews approved integration after their findings were fixed.
- Physical-device FPS, Safari, and long-horizon load-cap testing were not performed. No claim is made that the user's device now has graphics acceleration enabled.

## Database and production release

Migration `0007` has SHA-256 `3f07a8949ff5a6f8cf3668de3fd6b164b557e7bbd4a392af03c32216be43b4fe`. It was applied atomically through Neon MCP to the existing development and production branches after isolated PostgreSQL verification. The transaction checked the exact database/owner and all six previous migration hashes. Both branches now contain seven migrations; the migration was not reapplied. No match, reward, or content row was edited by this migration.

Development readback verified the trigger and restricted runtime notify permission. Production runtime readback also returned `true` for trigger `matches_realtime_changed` and `true` for notify permission. An earlier production query returned `false` because it looked up the wrong trigger name; this was a lookup mistake, not a migration failure.

| Component | Commit                                | Deployment                         | Verified production state                                                                      |
| --------- | ------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| API       | `62ebfb8`                             | `dpl_BW9bHYAUGrP2f3p24JNL4XfcYn3i` | READY; `https://oathfront-api.vercel.app/health/ready` healthy; native WebSocket flow verified |
| UI        | `c25294c`, including client `0a387dd` | `dpl_5fwooLbGMkBY46aKVyiZ3LK2tHKS` | READY and `https://oathfront.vercel.app` alias verified through MCP                            |

The production browser smoke ran from 04:14:52 to 04:15:42 UTC on 2026-10-23 in a fresh, isolated Chromium context. It created one guest match through the UI proxy, received native `ready` and `changed` frames, observed **zero snapshot GETs during 11 idle seconds**, and rendered a remote PAUSE. After an offline change, a new ready frame and **one snapshot GET** restored the paused state. Exact production `connect-src` allowed the API WSS origin. There were no console or page errors; the Three scene reported `ready`.

The test match was surrendered once and verified `COMPLETED`, reason `SURRENDER`, revision 6. Existing user matches were untouched. See the [production smoke report](evidence/realtime-recovery/realtime-smoke.md) and [redacted observations](evidence/realtime-recovery/realtime-smoke.json).

One non-websocket CSP event was observed: `script-src` blocked `eval`. It did not prevent the verified flow or produce a console/page error. Its source remains uninvestigated; this release does not claim zero CSP events overall.

The approved Moonroot v3 visual redesign and drag-first interaction are tracked separately in [the courtyard design](../superpowers/specs/2026-10-23-courtyard-design.md). This realtime release does not claim that later concept has already shipped.
