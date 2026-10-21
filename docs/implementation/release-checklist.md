# Release checklist — HOLD

This is a technical release-candidate preparation record, **not approval to deploy or a claim of production readiness**. Task18 and whole-branch reviews approved the technical scope; the final parser fix passed scoped re-review. CI passing does not close the following acceptance items.

The 2026-10-21 [English/Rivals redesign](rivals-redesign.md) has its own [integrated browser and review evidence](evidence/rivals-redesign/README.md): first production suite 82 passed / 4 failed / 2 skipped, then all four affected cases passed on the covering artifact. This presentation verification does not replace the open release gates below. Task 6 prompt/pending contract and final whole-change/scoped reviews are complete; the final hand-readability fix passed six focused production cases. The [delivery record](evidence/rivals-redesign/delivery.md) separates reviewed source, local evidence, actual pending Pen design and remote CI. A GitHub result must be checked against its exact pushed commit.

| Gate | Current disposition |
| --- | --- |
| PERF-P95-01 | **FAILED / OPEN**. Task16 Intel Mesa/GNOME Wayland3×60s p95=21.4/21.7/22.5ms against20ms. Median16.7ms, p99≤33.3ms and0 long tasks pass separately. New release artifacts are not that benchmark artifact. |
| BALANCE-CORE-01 | **OPEN**. Immutable900 baseline: GOOD720(80%), EVIL158(17.56%), DRAW22(2.44%); matchup GOOD62–95%, hero rates outside40–60. |
| BALANCE-UTILITY-01 / BALANCE-PHASE-01 | **OPEN**. Diagnostic unused utility cards/early EVIL mana limitations require separately versioned bot evaluation; no silent core_v1/bot_v1 change. |
| Human5×2 playtests | **awaiting_external_input**; no fabricated people or acceptance. |
| Physical touch/Safari/assistive-tech/audio acceptance | **awaiting_external_input**; automated browser checks are distinct. |
| Basic real Google login | User-confirmed in Task13; production callback/origins, real-provider merge/logout/device round-trip remain separate. |
| Hosted deployment | Not requested/performed. No Vercel project/login/production deploy, registry publish or new Neon branch. Real edge trust, OAuth, quotas and cloud lifetime tests pending. |
| Neon development migrations | Verified0001/0002/0003 ledger and restricted runtime grants; explicit development target only. |
| Interactive DB migration | Pending explicit operator maintenance; never reset or migrate automatically. |
| Operations implementation | Task18 and whole-branch technical review approved; load parser fixed and re-reviewed. SDK peer and Vercel entrypoint warnings remain disclosed. |

Before an authorized release:

- [ ] Resolve acceptance holds or obtain explicit scoped product disposition; do not lower thresholds or call the game balanced.
- [x] Complete Task18, whole-branch and final scoped reviews; [retain evidence and source/artifact hashes](evidence/final-review/README.md).
- [ ] Verify two Vercel Hobby project scopes, actual account quotas/noncommercial eligibility, Node24, Singapore region and Neon current free-plan capacity. No promise of unlimited free service.
- [ ] Keep DB/session secrets only in API, managed-auth cookie secret only in Next, and owner/migration credentials outside hosted runtime. Configure the distinct forwarding secret on both projects.
- [ ] Verify exact HTTPS frontend origin/provider callbacks, no wildcard CSRF origin, API direct proof rejection, real trusted-IP forwarding and repeat-command receipt recovery.
- [ ] Run pinned-version gate against the actual target before rollout; retain active tutorial/core/bot registry bindings; review expand/contract rollback compatibility.
- [ ] Verify maintenance scheduling and a hosted backup/restore drill before setting recovery objectives.
- [ ] Review security-header limitations: no unsafe-eval, but current CSP permits inline script/style; self-host HTTPS/HSTS requires operator configuration.
- [ ] Inspect final native diff and exact target remote before separately authorized push; no worker push/PR/deploy is performed.

Known dependency exception: pinned `@neondatabase/auth@0.6.0-beta` brings documented unused Better Auth UI plugin peer-version mismatches and a logger TypeScript5 peer range while this workspace uses TypeScript6. Task13 approved this narrow compatibility limitation; functional auth tests and basic real login are distinct evidence. Task18 retains exact install/peer-check stdout and does not broadly upgrade dependencies. `@vercel/functions@3.10.1` is the one justified additional runtime dependency for pool/lifetime integration (Node>=20, published2026-10-13; newer3.10.2 avoided during release-age review).

Measured evidence: [Task18 verification](release-verification.md), [performance](performance.md), [balance](balance/core-v1/README.md), [restore drill](restore-drill.md), [runbook](release-runbook.md), [historical controller decisions](controller-decisions.md). The900/400 matrices and hardware benchmark are not rerun as routine CI gates.
