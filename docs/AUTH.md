# Google identity and application sessions

Google login uses the pinned official `@neondatabase/auth@0.6.0-beta` Next proxy and browser wrapper. This is an explicit exception to stable-only dependencies: npm offers no stable release. `jose@6.2.12` verifies Ed25519 signatures, exact Auth origin issuer/audience, subject, issued/expiry times, and a maximum 15-minute lifetime. The managed JWT never enters browser persistent storage. The SDK's unused UI dependencies currently report Better Auth plugin peer-version warnings and a TypeScript 5 peer range in its logger; real provider acceptance is required before release.

Next development request URL and browser-console forwarding are disabled to avoid logging callback verifiers. The official client consumes `neon_auth_session_verifier` through `getSession()` and removes it before requesting the identity JWT. The pinned SDK shares a session-shaped cache between `getSession` and `token`, so token retrieval uses its supported `X-Force-Fetch` header to bypass that cache and fetch a fresh JWT. Without that bypass, callback restoration succeeds but the following token call yields cached session data. Subsequent login callback URLs retain only the game route and allowed hero/preset query fields.

The local Next handler is `/api/auth/[...path]`. Only `/api/v1/*` forwards to Fastify. Guest gameplay does not call the provider. Fastify consumes verified managed JWTs at claim/exchange, then issues its own HttpOnly, Secure, same-origin cookie with CSRF. Account sessions expire at the earlier of 15 minutes or the JWT expiry. Logout revokes the app session immediately and separately requests provider sign-out. A still-valid provider JWT can authenticate a fresh login; logout does not retroactively invalidate that JWT.

## Interactive development check

The existing development Neon project/branch is `round-darkness-78734677` / `br-odd-pine-a1pw77e9`. Read-only configuration inspection found shared Google and localhost enabled. No remote project or OAuth mutation is needed. Shared Google is for development/testing; production needs a custom Google OAuth application and trusted production domains.

Run from the repository root, after preparing its separate interactive database:

```sh
pnpm build:api
node scripts/prepare-auth-db.mjs
node scripts/local-auth.mjs
```

Open `http://localhost:3000`. The launcher selects `OATHFRONT_INTERACTIVE=1`, giving this dev instance its own `.next-interactive` lock/cache while the default test dev instance keeps `.next/dev`. Next already separates dev and production artifacts; this extra directory isolates simultaneous dev listeners. The script uses ignored `.env.neon.local` for the managed Auth URL/JWKS, `.env.auth-app.local` for the separate loopback `oathfront_interactive` app DB, and creates a new ignored 0600 `.env.auth.local` cookie signing secret only if absent. It refuses non-loopback app databases. The launcher does not migrate or rotate credentials. The explicit prepare script creates `oathfront_interactive` only if absent, applies existing migrations and grants to the already-existing restricted runtime role, preserves existing data, and writes a new ignored 0600 env file only if absent. It never creates or changes roles/passwords or contacts Neon. Automated test resetters use the separate `oathfront_verification_test` database, so interactive acceptance can continue while development tests run.

The user selects an authorized Google test identity themselves. First create a guest draft/match, select **Đăng nhập Google**, complete Google, and verify the same draft/match remains. Reload; then sign out and verify the old app cookie no longer reads data. The Google provider callback remains the actual managed Auth base URL plus `/callback/google`; the app callback URL is the localhost page that initiated login.

Record only success/failure, timestamps, app route, account kind, retained resource IDs (if appropriate), and checks of issuer/audience/expiry. Never capture tokens, cookie values, OAuth authorization codes, email addresses, or credentials in screenshots/logs. Automated signed-fixture tests exercise Next → Fastify → DB and the verification boundary; they are not evidence of a real Google callback.

## Merge and recovery invariants

Auth serializes a verified subject with transaction-scoped `pg_advisory_xact_lock`, then locks all principals in UUID order before matches. Mutation services revalidate their HTTP session under the principal lock. Guest conversion retains its ID; merging transfers decks, match history/results and noncolliding command receipts. Conflicting receipt IDs reject with `IDEMPOTENCY_CONFLICT` and roll back all ownership/session changes. No receipt is overwritten and no new claim ID silently repairs a collision.

Two active matches require an explicit choice with a new command ID. The discarded match appends the private `AUTO / ADMIN_ABANDON` operation, consistent checkpoint/hash/events/result, with no user command receipt. It produces lifecycle `ABANDONED`, public outcome `NONE`, reason `ACCOUNT_MERGE`, and never a loss. `abandonMatch(..., "EXPIRED")` and the same closed replay operation are available for retention maintenance; caller must use principal-first locks and `persistTransition(..., null)` inside its transaction.

The revoked source cookie, matching source CSRF, verified subject, exact command/body and original five-minute deadline can recover only a completed claim. An additive recovery covers response-body loss after Set-Cookie was received: the exact `auth_claims.last_issued_session_id` must equal a live, unrevoked, unexpired account session, with its current CSRF, matching target owner and verified subject. Arbitrary account sessions cannot use this path. Neither recovery reruns ownership changes or extends the deadline. Bootstrap secrets never authorize a claimed guest. After the recovery window, verified identity exchange returns to the existing account; isolated guest drafts are not automatically adopted without completed-claim proof.

Browser API clients retain their identity and explicitly rebind CSRF after renewal. A rejected 401 does not clear pending command/save/create IDs or bodies, and renewal never retries a mutation automatically. Pause/result modals expose renewal and Google login actions inside the modal. `PrivateStorageContext` supplies principal-scoped storage for decks, match commands, creates and rematches; only successful claim proof transfers the guest namespace. A different account never reads another principal's pending mutations. Tutorial completion columns are coalesced during merges; tutorial gameplay remains outside skirmish history.

Implementation references: [Neon Next API-only quickstart](https://neon.com/docs/auth/quick-start/nextjs-api-only), [JWT verification](https://neon.com/docs/auth/guides/plugins/jwt), [OAuth setup](https://neon.com/docs/auth/guides/setup-oauth), and [trusted domains](https://neon.com/docs/auth/guides/configure-domains). Installed SDK declarations and Next 16.4.2 local route-handler/logging documentation were checked against these APIs.
