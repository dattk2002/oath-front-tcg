# Task 6 — Pen prompt and awaiting-design handoff

Status: DONE. The requested prompt and repository-side pending contract are complete. Actual Pen design inspection and implementation readiness remain pending by design because no `.pen` file was supplied.

## Implemented

- Added `docs/design/pen/OATHFRONT-PEN-PROMPT.md`: ready-to-paste English instructions for an editable game design, with the user's required guideline sections and explicit must/should rules. It covers every game screen family, component states, keyboard/pointer/touch, 375px fallback, 1024×640, 1440×900, 200% reflow, exact English copy, all six heroes/all sixty card images, preserved authority and owned GSAP/Pixi motion.
- Added `docs/design/pen/DESIGN-CONTRACT.md` and `design-contract.json`: explicit `awaiting_design`, `implementationReady: false`, null source path/hash/revision/schema/document identity and Pen node/component/variable/state bindings. Logical requirement IDs do not claim to be Pen IDs. The JSON maps real repository paths, 24 current CSS variables, 67 content identities (6 heroes + board + 60 cards), 12 screen families, responsive requirements and 6 motion cue groups. Eight repository input hashes pin the implementation baseline at `8ada783171cd3db642a0c106b1c12430102df28f`.
- Documented future receive/preserve/hash/version inspection, actual schema/reference validation, node/component/variable/asset/state/responsive/motion mapping, conflict resolution, review gate and authorized implementation. Strict JSON parsing is used only for our own contract; the handoff notes that Pen files can contain comments and actual version support must be checked later.
- Added dependency-free `check-pending-contract.py` scoped to this pending handoff. No duplicated Pen schema or new validation dependency. It cannot certify a design or advance readiness.
- Linked the prompt and contract from `docs/README.md` and the redesign evidence index. Archived Task 5's review verbatim and this report. Corrected the current implementation document: 3101 belongs to unrelated Hunting Alice, protected OathFront remains 3000/3001, and unrelated 3100 is labeled coherently.

## Sources and review

Official pages fetched and read on 2026-10-21 using the web tool:

- https://www.pen.dev — product entry point.
- https://docs.pencil.dev/for-developers/the-pen-format — JSON tree/comments, unique IDs/types, `version`, reusable/ref/override structure, supported editing surfaces, conversion preservation and live schema limitations.
- https://docs.pencil.dev/design-and-code/design-to-code — same-workspace design/code workflow through an agent, CSS token import/export and explicit review of changes; not automatic synchronization.
- https://docs.pencil.dev/core-concepts/variables — typed variables, aliases, theme axes and CSS import guidance.
- https://docs.pencil.dev/core-concepts/components — reusable origins, instances, nested components, overrides and slots.

Current format docs mention app/MCP/CLI surfaces; this report does not infer an installed callable tool. No Pen CLI/MCP operation, account creation, external project or publication occurred. The handoff links these exact primary sources.

Applied gpt-taste guidance within the approved game constraints: existing angular comic typography/art/motion, without generic AIDA/randomized marketing replacement. Applied ui-ux-pro-max as the design-guidance self-review. Command `python3 /home/bia/.codex/skills/ui-ux-pro-max/scripts/search.py 'keyboard focus modal' --domain ux` returned three relevant results: visible focus, focus-not-obscured enhanced and minimum. The contract distinguishes the product's fully unobscured focus requirement from WCAG AA's weaker minimum; modal focus, touch targets, clipping, contrast and reduced motion are explicit testable requirements. No UI was changed or visually re-certified in this task.

## Checks and actual output

`python3 docs/design/pen/check-pending-contract.py`:

```text
PASS: pending JSON; 24 tokens; 67 asset IDs/exports; 12 screen families; repository hashes/paths; 8 handoff links.
DESIGN NOT VALIDATED: no .pen source, node mappings or implementation approval.
```

`git diff --check`: exit 0, no output.

Inline read-only Python path/provenance audit scanned repository-root inline paths in both handoff Markdown documents (excluding the explicitly requested future `.pen` destination), checked for design files and compared Task 5 review bytes. Output:

```text
Pen files: []
Task 5 review copied verbatim: True
```

No missing inline path was reported. Final local-link check command:

```sh
python3 - <<'PYLINK'
from pathlib import Path
import re
from urllib.parse import unquote
paths = ['docs/README.md', 'docs/implementation/evidence/rivals-redesign/README.md', 'docs/design/pen/OATHFRONT-PEN-PROMPT.md', 'docs/design/pen/DESIGN-CONTRACT.md']
count = 0
for name in paths:
    path = Path(name)
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', path.read_text()):
        if '://' in target or target.startswith('#'):
            continue
        assert (path.parent / unquote(target.split('#', 1)[0])).exists(), (name, target)
        count += 1
print(f'PASS: {count} local Markdown links across {len(paths)} touched index/handoff documents.')
PYLINK
```

Output: `PASS: 94 local Markdown links across 4 touched index/handoff documents.`

No application code, source artwork, immutable content, tests or dependencies changed. TDD is not required for this documentation-only task. No full tests, build, dev server, database, process restart, physical-device test or new UI acceptance was run. Prior Task 5 failures/covering results and release holds remain unchanged; this report does not reuse them as evidence for a future design.

## Self-review, remaining input and commits

Self-review checked the prompt against the approved spec, actual catalog, final manifests/tokens/motion, all required guideline sections, authority boundaries and honest null readiness. All actual Pen mappings remain unresolved. The required next input is the real editable `.pen` file, preferably `docs/design/pen/oathfront-rivals.pen`, together with its referenced image/library dependencies and a verifiable revision. A screenshot alone is insufficient.

The only pre-existing dirty file is user-owned `apps/web/next-env.d.ts`; it is outside this change and must not be staged or reverted. No secrets were opened. No user services or ports were touched. Native commit authorized; push/deploy reserved for controller. This archive is captured with the handoff commit; the controller-facing SDD report records the resulting SHA after commit.
