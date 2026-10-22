# Live-content administration

Run from the repository root with Node24 and the installed workspace dependencies. This CLI is an owner operation, not a public HTTP administration route. The initial normalized bundle is `liveBundle` in `apps/api/src/editorial/admin.ts`, built from the authored event and editorial modules. It contains18posts,12weeks and84scenarios.

```bash
node --import tsx scripts/manage-live-content.mjs validate
mkdir -p artifacts
node --import tsx scripts/manage-live-content.mjs export-json --out artifacts/season-one-review.json
node --import tsx scripts/manage-live-content.mjs export-sql --out artifacts/season-one-bootstrap.sql
```

Exports refuse to overwrite an existing file. Both exports are public game content, with no connection credentials. SQL export is an immutable bootstrap: it checks every existing definition before inserting and refuses a changed existing record. It must run inside the exported transaction. Import through the CLI supports higher revisions of drafts.

## Explicit database selection

Set `OATHFRONT_CONTENT_DATABASE_URL` in an ignored environment file or the process environment. Use the direct owner connection. Never put the connection string in a command argument, document, commit or terminal output.

```bash
node --env-file=.env.content.local --import tsx scripts/manage-live-content.mjs dry-run --target local --database oathfront_interactive
node --env-file=.env.content.local --import tsx scripts/manage-live-content.mjs import --target local --database oathfront_interactive
```

The local target only accepts loopback hosts and `oathfront_interactive` or a disposable database ending `_test`. Apply forward migrations before import. `MIGRATIONS_REQUIRED` from dry-run is a read-only result; it does not migrate or seed the database. Do not reset the interactive player database.

For Neon development, inspect the actual project/branch before any write. The CLI additionally requires `--target development --branch <verified-branch-id>`, `OATHFRONT_CONTENT_ENVIRONMENT=development` and matching `OATHFRONT_NEON_BRANCH_ID`. These checks express operator intent; live Neon branch verification remains necessary. This task uses Neon MCP for the eventual development migration/import. Production is not an accepted CLI target.

## Draft and publication workflow

Export a JSON bundle, add/edit a draft post, increment its revision and compute its `sha256` with the exported `contentHash` helper over every field except `sha256`. Run `validate --file <bundle>` and `dry-run --file <bundle>` before `import --file <bundle>`. The importer uses parameters, one transaction and an administrative lock. Repeating an unchanged import creates no extra rows.

```bash
node --env-file=.env.content.local --import tsx scripts/manage-live-content.mjs publish --target local --database oathfront_interactive --kind post --id editorial-note --at 2026-10-24T00:00:00.000Z
```

Future publication becomes Scheduled. The read API filters by server time; no scheduler job needs to rewrite a post at its publish instant. Existing Scheduled/Published content is immutable through import. Corrections to already published content use a new post; gameplay changes use a new versioned season/manifest, never an edit to a running scenario.

`publish --kind event --id season01-week01 --at 2026-10-26T00:00:00.000Z` publishes a draft calendar entry only after all seven known scenarios exist. The supplied instant must match its approved start time. It does not reveal the card early. Published events are immutable even before their first attempt; database triggers additionally pin started event/scenario definitions, challenge hashes and original reward eligibility.

## Clock and recovery

The first reset is2026-10-26 at00:00UTC, equivalent to07:00Vietnam. Weeks advance Monday; days advance at that same UTC boundary. Tickets remain in the original week's history. Card copies and cosmetic unlocks remain permanent. Loss/surrender waits one hour; disconnect resumes its bound match. See [progression behavior](events-progression.md) for grace, receipts and reward limits.

If a connection/response becomes uncertain, inspect the rows/checksums before retrying. An unchanged import is idempotent, but a changed-payload import is not a retry. Do not delete reward ledgers, reassign reward bindings or rewrite a scenario to repair a presentation issue. A future version is the rollback/forward-correction mechanism for published gameplay.

## Verified during implementation

Isolated checks cover duplicate imports, draft revision/publication, future-content filtering, invalid manifest rejection, runtime publication denial, safely quoted exported SQL including hostile punctuation/dollar delimiters, immutable match bindings and credential-safe CLI errors. Dry-run against the preserved local interactive DB reported that publication tables still need migration; no local player data was changed during this milestone. Actual local and Neon development application is reserved for delivery after visual integration.
