# Redesign delivery record — 2026-10-21

The six-task redesign is implemented and reviewed through `4d13ca374754a99ddd9dba7398fc8bac9b8ac442`; the final runtime/CSS fix is `0f5354d7ca7a0dff66039fce1847ef0110fb3865`. The delivery documentation commit only archives the decisions and review evidence. This is a local technical delivery record, not production release approval or a claim about an unobserved CI run.

## Delivered scope

- English presentation over stable content IDs, six original heroes, all 60 original card illustrations, coherent angular theme and local display fonts.
- Owned GSAP screen/card choreography and seven bounded battle-effect families, reduced-motion/interruption cleanup and shared damage timing.
- Readable compact/desktop hands, full rules through inspect, responsive/fallback/recovery evidence and unchanged game authority.
- [Ready-to-paste Pen prompt](../../../design/pen/OATHFRONT-PEN-PROMPT.md), [contract workflow](../../../design/pen/DESIGN-CONTRACT.md) and [pending JSON](../../../design/pen/design-contract.json). No actual `.pen` file exists; design identity and mappings remain unresolved, with `awaiting_design` and `implementationReady: false`.

## Verification and review

[Task 5](reports/task-5-report.md) records 121 frontend/content/asset tests, typecheck/lint/build, the original production result **82 passed / 4 failed / 2 skipped**, four covering passes and the targeted reflow/axe pass. [The final fix report](reports/final-fix-report.md) preserves both layout failures, five development passes and **six production passes** on build `z9liUCQ66nCjg45VaZ4mR`; its CSS hash identifies the amended artifact. These are distinct runs, not an invented all-green initial run.

The [whole-change review](reports/final-review.md) found compact hand stat overflow and two small documentation/test mismatches. The [scoped rereview](reports/final-rereview.md) confirms all three addressed with no new Critical/Important breakage. Duplicate 512px inspect/cutout exports remain an explicitly deferred, nonblocking optimization. The controller also inspected the final 1024×640 and 1440×900 production captures: stats/trick cues and End phase are visible. [All nine controller rulings and their costs](rulings.md) are retained, including the superseded original art-scope decision.

## Repository, local run and remaining acceptance

Target: [dattk2002/oath-front-tcg](https://github.com/dattk2002/oath-front-tcg), existing `main`. The authorized native push follows this record; its automatic [Verify workflow](https://github.com/dattk2002/oath-front-tcg/actions/workflows/ci.yml) is authoritative only for the exact pushed SHA. The controller checks that run separately and reports its actual result. No deployment, registry publication or production OAuth/database change is part of this delivery.

The existing interactive setup runs with:

```sh
cd /home/bia/Works/Coding/oath-front-tcg
pnpm build:api
node scripts/local-auth.mjs
```

Open `http://localhost:3000`. The already-prepared interactive database and ignored auth configuration remain in place; no database recreation is needed. User services on 3000/3001 and the unrelated service on 3101 were preserved. The user-generated `.next-interactive` imports in `apps/web/next-env.d.ts` remain intentionally unstaged and outside delivered commits. The SDD workspace is preserved.

The [release checklist](../../release-checklist.md) still records physical frame p95, balance/human playtests, physical devices/assistive technology/browser/audio checks and production acceptance. Those holds are not cleared by local tests, review or a future CI success. The actual editable Pen file and its dependencies are the remaining input for final design mapping.
