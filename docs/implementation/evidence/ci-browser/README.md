# Production browser CI investigation

The [second GitHub Verify run](https://github.com/dattk2002/oath-front-tcg/actions/runs/39527305880) on `f06b10c` confirms the [clean-install startup correction](../ci-startup/README.md): production browser servers start successfully. Frozen installation, static checks, **618 tests across73 files** and production build passed. Browser integration completed **74 passed,4 failed,2 skipped** in6.5minutes.

[Run metadata](second-run.json) and the [original failed-step log](second-run-browser-failure.log) retain the result. Failures concern expired paused-session recovery, two deliberate disconnect/reconnect scenarios, and the GOOD match's deliberate checkpoint-expiry/rematch scenario. This result is not a passing browser gate.

The [investigation and correction](implementation-report.md) reproduced all failure mechanisms. The auth test expired its session before initial recovery completed; it now waits for Resume to become enabled before injecting command-time expiry. Deliberate offline and checkpoint-expiry tests now correlate console records with observed network failures inside explicit injection scopes, including the exact match's in-flight event-log410. Every raw error is retained; unrelated errors still fail.

Commit `d43516a` changes five test files only. The four original failing cases plus negative controls passed **5/5**, followed by **4/4** checks covering the final one-shot error scopes. Type checking and changed-file lint passed. The production artifact remained `V0isFAUtbXD_Bsuxb73A6`; no game/runtime build or full local suite was repeated. Selected RED/GREEN logs, network records and screenshots are preserved under `evidence/`; the report distinguishes original CI observations from controlled local reproductions.

[Independent review](review.md) approved spec compliance and quality without findings. [Controller verification](controller-verification.json) independently matched all five changed test hashes, both runtime file hashes and the existing build identity.

The [workflow runs](https://github.com/dattk2002/oath-front-tcg/actions/workflows/ci.yml) are authoritative for each pushed commit. [Product release holds](../../release-checklist.md) remain separate from technical CI.
