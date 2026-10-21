# Task18 verification — 2026-10-21

Technical implementation is ready for independent review. **Release remains on HOLD** under the [release checklist](release-checklist.md); no deployment, registry publication or production migration occurred.

| Check | Observed result |
| --- | --- |
| Frozen install, contracts, root/tool typecheck, lint | Exit0; known SDK peer exceptions retained below |
| Full unit/integration gate | 72 files,603 tests passed; includes real PostgreSQL migration/restore and HTTP proxy/lifetime tests |
| First production build | Exit0; build `5-dAU_0iQdk3hZKB98v-v`, API3101 baked |
| Full production browser run | 72 passed,6 failed,2 skipped; original failure evidence retained |
| Corrected production build | Exit0; build `V0isFAUtbXD_Bsuxb73A6`, API3101 baked |
| Covering production browser run | 14/14 passed, including all6 failed cases, responsive sizes, WCAG scan and200% reflow |
| Local20-match HTTP load | 500 actions; warm p95312.07ms,275auto batches p95308.60ms/max346.73ms; cold284.00ms |
| Empty/prior0001 migration | Both end with identical3-entry ledgers and constraints |
| Actual pg_dump/pg_restore | 73,469-byte snapshot;449.04ms measured local recovery; BLOCK_RESPONSE revision22 resumed23, exact retry/replay,0lost committed revisions |
| Vercel CLI65 local Node handler | Health200, guest201, create201, same receipt on retry201, missing proof403; no login/link/deploy |
| Neon development | Reviewed0002/0003 applied once after ledger recheck; all3hashes/grants read back; production untouched |

The full browser run was **not repeated or relabeled all-green**. Four failures were stale expectations: opening the current reserve/log disclosures, the current playable-card accessible name, and managed-auth's exact503/AUTH_UNAVAILABLE response. Two tutorial branches exposed a real CSS defect: the selected-card inspector covered the tutorial action. The correction reserves a160px scrollable inspector and8px gap below the tutorial within the existing sidebar. Board, hand, imagery and motion remain unchanged.

The new regression first failed with both panels at x1124/y56. It then verified non-overlapping bounds, a fully hittable “Đã hiểu” action and keyboard scrolling to inspection and tutorial secondary controls at1440×900 and1024×640. Both complete tutorial branches now pass. [Desktop](evidence/task18/tutorial-inspect-1440.png), [low tablet](evidence/task18/tutorial-inspect-1024.png), and [empty browser-error record](evidence/task18/tutorial-inspect-console.json) belong to the corrected artifact. Inspection and long tutorial content scroll within their allocated panes.

The two intentional full-run skips were the Firefox-only no-Navigation-API fallback and the explicitly enabled physical-GPU performance workload. No900/400simulation rerun or hardware p95 benchmark was performed. Task16's measured build `ZipcVWCZHw8l3sc-rmia3` remains distinct; its21.4/21.7/22.5ms frame p95 failure is still open.

Artifact manifest SHA256 values (full per-file manifests retained in the local Task18 report evidence):

- Initial source: `6730603e2d3c2dab58bed3f4016c36fabd63013fcc5bfb3c035866423050bb12`.
- Initial runtime: `6b9c884f2f5b00029415c2cdb67afbd0d583fd498d4db9d560672b78a1a16ae8`.
- Corrected source: `938d1e3492ab59096489c74fd19a3d0672993580ceb7564d9138e8b7b156f49c`.
- Corrected runtime: `63421cabe0f9f6de38e38e6a254216be5c9b813591e3addc3a6190ea78167fcf`.

Known SDK peer check exits1: better-call1.4.0/2.0.2 vs1.4.2 for Better Auth plugins; better-auth1.7.6 vs^1.7.11; TypeScript6.0.3 vs logger's^5.0.0. Frozen install itself exits0. No broad upgrades were made to silence this approved compatibility exception.

Local recovery uses a quiescent PostgreSQL17 logical snapshot; it establishes no Neon PITR or production recovery SLA. Synthetic local platform headers establish proxy mechanics, not real Vercel edge trust. Hosted quotas/origins/OAuth/lifetime, physical devices/assistive technology/audio and human playtests remain unverified as detailed in the checklist. The interactive database and protected running services were preserved.

Docker rebuilt UI after the CSS correction; the final three-container restart drill again passed guest/spoof/auth routing, BLOCK_RESPONSE22→23 and exact duplicate receipt. Final image identities:

- UI: `sha256:24fd2649662e775ce9a76eaa0519f9c251582efd28a6af05989c767237776888`.
- API: `sha256:9c3aa51fad7de2a71b80b248a2bb2ff3a5444fee82dde57489e43cf86812381e`.
- PostgreSQL: `sha256:9ce98c993f976d07824f8071a410d31f65280c7210818513c90da83ff4ce8d62`.

The preceding UI image `32f2902de8c428e95a69f82e2ec4e3034bef5f74ceb7711f5995754ea4d8fb2a` predates the CSS fix. The controller independently verified all1331 source hashes and2541 artifact entries against the corrected local build before these documentation-only additions; runtime files have not changed since that verification.
