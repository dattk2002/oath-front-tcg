# Local migration and restore drill

Task18 exercises actual PostgreSQL17 logical backup/restore, not an object/checkpoint copy. `apps/api/tests/restore-drill.test.ts` creates only new random `oathfront_restore_<uuid>_test` databases on the explicitly authorized loopback test server. It runs serially with other DB fixtures.

1. Install all migrations into an empty database. Independently install only reviewed0001 into a prior-version database, then apply0002/0003. Compare all three ledger hashes and guard/tutorial constraints.
2. Through the real game service, play a persisted tutorial to a live `blockResponse` continuation. Record checkpoint hash/revision.
3. Run `docker exec <test-container> pg_dump -U <test-owner> -Fc --no-owner --no-acl <verification-database>`.
4. Keep the private dump **only in process memory**, pipe it through `docker exec -i <test-container> pg_restore -U <test-owner> -d <fresh-restore-database> --no-owner --no-acl --exit-on-error` and restore restricted grants.
5. Open a fresh application/pool against the restored database, compare checkpoint/hash/revision, accept `KEEP_BLOCK_POWER`, retry its exact command and compare the durable receipt, then replay the initialization/journal to the final hash.
6. Close/drop only the drill-created databases. Preserve the existing verification and interactive databases and all user stacks.

The recorded recovery clock covers pg_restore, grants, application readiness and successful resumed command/replay. The source is quiescent at backup; observed lost committed revisions are0. This does not measure Neon point-in-time recovery, disaster detection, cloud provisioning, user reconnection, hardware failure, or a backup SLA. A real hosted recovery drill remains required before relying on a production recovery objective.

Reproduce after test DB setup: `pnpm --filter @oathfront/api exec vitest run tests/restore-drill.test.ts`. `OATHFRONT_TEST_DB_CONTAINER` selects the explicit test container; CI uses `oathfront-ci-db-1`. Exact sanitized database names, snapshot byte count, recovery milliseconds and source/artifact identities are retained in the Task18 verification evidence; no backup bytes or credentials are published.

Observed final local run2026-10-21:73,469-byte snapshot,449.04ms recovery,revision22→23,0lost committed revisions. See [release verification](release-verification.md) for artifact boundaries and the full gate disposition.
