# Weekly progression: authoritative API behavior

The runtime owns match outcomes; clients cannot submit a win, ticket amount or card unlock. `persistTransition` writes the result, ticket ledger, weekly total, collection grants and command receipt in one principal-locked PostgreSQL transaction. Stable source keys outlive receipts and match-history retention. The collection is permanent; weekly totals are isolated by event ID.

## Routes

- `GET /api/v1/news`, `GET /api/v1/news/:slug`: published/scheduled content at or before server time. Optional `category=NEWS|UPDATE|GUIDE|EVENT`.
- `GET /api/v1/events`, `GET /api/v1/events/:slug`: published schedule with future card/title/system details redacted until reveal.
- `GET /api/v1/collection`: current session's sixty free base cards (two copies each), twelve Event quantities (0–2), and earned cosmetics. Guests never gain account rewards.
- `GET /api/v1/events/:slug/progress`: server clock, tickets, card copies, completed days, PvE cap usage, daily availability/cooldown/resume and reward history.
- `POST /api/v1/events/daily-matches`: `{commandId,scenarioId,practice}`. Same Origin, CSRF, session, rate limits and durable mutation handling as other matches. Unknown fields are rejected. A repeated command returns its exact receipt before current-time eligibility checks.
- Existing match command, reload, event, replay and summary routes support `DAILY_CHALLENGE`. Daily summaries have challenge metadata and actual reward receipts; rematch remains null.

## Rules enforced

Daily wins award100 once per event/day. Three distinct days add200; five add300; seven grant a cosmetic badge. Automatic permanent copies are awarded at1200 and2400; collection quantity never exceeds2. Normal account PvE wins earn50 plus50 per matching system, capped at200 per originally bound server day. Daily rewards have a separate pool. Legacy catalog games receive no new-system bonus because their hero classes remain legacy classes.

Eligibility is captured at match creation. A guest-origin game never becomes rewarded after login, even when its owner is merged into an existing account. Claiming a practice transfers the attempt owner for continuity while retaining its original eligibility and deadline.

Defeat/surrender creates an exact one-hour retry wait, measured from the persisted terminal timestamp. A draw or infrastructure fault has no loss cooldown. Practice has its own loss cooldown and does not consume the rewarded attempt. An account can practice an already unlocked day without receiving a second daily reward.

New rewarded attempts close at the next00:00UTC/07:00Vietnam. An existing attempt may finish through its original day-end+24h deadline, including the final millisecond. Late results never credit the next week. A disconnected expired challenge is closed without a loss penalty when the player starts a new challenge. A live match still returns `ACTIVE_MATCH_EXISTS` with its ID; it is never silently replaced.

An old daily entry becomes Closed after a late defeat across the day boundary. That loss cannot block the newly unlocked day's challenge. Server reads do not invent an event after the twelve-week season ends.

## Persistence and verification

Forward migrations0004/0005 add publication, immutable scenarios, attempts, match reward bindings, progression and collection tables. `DRAW` is distinct from a fault. Publication tables are read-only to the runtime; reward/cosmetic ledgers are append-only. Scenario hashes are checked against retained server manifests on initialization, reload, replay and startup support checks.

Focused integration coverage includes0/1/2 ownership, seven-day arithmetic, both copy thresholds,50/100/150 PvE bonuses and the daily cap, duplicate/concurrent settlements, same-command two-tab creation, changed-payload rejection, claim eligibility/deadline preservation, disconnect/resume, expiration, day/week grace, closed past-day UI state and fresh API startup.

One test plays a real challenge through the HTTP command API using only public information. With plausible retained prior-day history, its terminal action awards400 tickets, crosses the first-card threshold and persists the card. Repeating the final command preserves the exact receipt; replay reproduces the stored terminal state. Broader auth/retention/migration regressions also ran. Browser integration and actual local/Neon import follow later milestones; this document is not a production deployment claim.
