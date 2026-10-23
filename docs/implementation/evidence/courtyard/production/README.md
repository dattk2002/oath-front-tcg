# Production courtyard smoke

Overall result: failed. Cleanup: verified-terminal. Public fixture: passed.

One fresh isolated production guest match used real HTTP through the UI proxy. Mulligan succeeded, but a state read failed before any drag was attempted. The live drag remains unverified. No DB helper was used. See courtyard-smoke.json for redacted evidence.

The Moonroot screenshots are explicitly a mocked public DTO presentation fixture running production product JavaScript with real public GLB/material URLs; they do not represent a production database flow.

No credentials, cookies, recovery secrets, storage state, HAR, raw logs or private match payloads were persisted.
