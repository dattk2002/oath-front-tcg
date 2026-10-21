# Task18 evidence

Implementation range `4cc64fd..94d4b1b`; [independent task review](review.md) approved the technical scope with no Critical/Important findings and three minor follow-ups. Whole-branch review is separate. The [implementation report](implementation-report.md) records actual commands, exits, corrections and acceptance boundaries. The [release verification summary](../../release-verification.md) is the concise user-facing record.

- [Full serial gate](logs/final-gate.json), [603 tests](logs/final-test.log), [original browser run](logs/final-e2e.log): 72 pass, 6 fail, 2 intentionally skipped on the original production artifact.
- [Corrected gate](logs/corrected-gate.json), [14 covering browser cases](logs/corrected-e2e.log): all six previous failures included on `V0isFAUtbXD_Bsuxb73A6`; this is not a fresh full-green E2E run.
- [Controller hash verification](controller-hash-check.json): 1,331 source hashes and 2,541 artifact entries (including 21 resolved symlinks) matched at the recorded time. Later documentation/evidence publication is separate from that runtime identity.
- [Final Docker smoke](logs/docker-corrected-smoke.json): exact final images, three services, spoof handling, local managed-auth separation, block-response restart/resume and duplicate receipt. Earlier Docker identities remain in logs as history.
- [Final local load](logs/corrected-load.log): 20 concurrent matches, 24 PvE commands each followed by explicit surrender; 500 actions. This measures compiled local HTTP/PostgreSQL, not hosted latency or physical frame presentation.
- [Neon development readback](neon-controller-readback.json) independently matches all three local SQL hashes. [Worker constraint/grant readback](logs/neon-migrations.json) is retained; original mutation-response bytes were not separately archived. No production or user interactive database was migrated.
- [Quota source check](quota-controller-check.json) records public pricing pages checked on 2026-10-21; this does not verify a future Vercel account/project configuration.

`logs/` deliberately preserves failed attempts and corrected results, including original terminal whitespace and line endings. A directory-scoped Git attribute preserves these log bytes and excludes only these captured `.log` files from whitespace checks; authored source and documentation remain checked. Read the report before interpreting a failure or warning. Known SDK peer warnings and CLI probe failures are disclosed; no pristine-output claim is made. Tutorial screenshots/geometry are retained beside this file. The files were checked for known local credential values before publication; raw database snapshots and credentials are not included.

Performance, balance, human/device and hosted-production gates remain open as described in the [release checklist](../../release-checklist.md).
