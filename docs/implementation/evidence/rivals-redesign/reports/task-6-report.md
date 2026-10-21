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


## Scoped review fix — per-component mapping and omission checks

The review correctly identified that a single nullable screen-level `penComponentId` did not map each repository component to reusable design origins/instances. Replaced it with explicit `componentMappings` keyed by real `repoPath` + `repoComponent`. All 36 screen/component relations contain repeatable `originBindings`, each with a logical variant, null `penOriginId`, and repeatable instances with logical usage, null `penInstanceId` and null `penOverrides`. QuantityControls and ResultDetail receive separate entries in their shared files. The documentation defines the future override record shape, origin/reference resolution and repeated/shared origins, without inventing any Pen identity. `awaiting_design` and all readiness limits remain unchanged.

The dependency-free checker now pins exact required screen-family and viewport sets independently of the JSON, plus the expected component/path pairs per family. It checks mapping coverage, actual exported component declarations, unique logical variants/usages and explicit unresolved origin/instance/override fields. Deleting both a repository path and its mapping cannot bypass coverage. The first narrow read-only mutation probe reproduced the review finding before the fix:

```text
RED: missing_surface was incorrectly accepted by the original checker
RED: missing_viewport_everywhere was incorrectly accepted by the original checker
```

The complete post-fix probe below was saved to `/tmp/oathfront-pen-fix-probe.py` and executed with `python3 /tmp/oathfront-pen-fix-probe.py`. It patches only reads of the contract in memory; no fixture or repository file is overwritten. It uses Python's standard library, without adding a test framework or dependencies.

```python
import copy
import io
import json
import runpy
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

contract = Path('docs/design/pen/design-contract.json').resolve()
original_read = Path.read_text
baseline = json.loads(contract.read_text())

def battle(data):
    return next(item for item in data['surfaceMappings'] if item['logicalId'] == 'battle')

def remove_viewport(data):
    data['responsive'] = [item for item in data['responsive'] if item['logicalId'] != 'compact']
    for surface in data['surfaceMappings']:
        surface['responsiveVariants'].remove('compact')

def remove_component_and_path(data):
    surface = battle(data)
    removed = surface['componentMappings'].pop()
    surface['repoPaths'].remove(removed['repoPath'])

def repeated_bindings(data):
    mapping = battle(data)['componentMappings'][0]
    origin = copy.deepcopy(mapping['originBindings'][0])
    origin['logicalVariant'] = 'compact'
    instance = copy.deepcopy(origin['instances'][0])
    instance['logicalUsage'] = 'selected'
    origin['instances'].append(instance)
    mapping['originBindings'].append(origin)

cases = [
    ('missing_surface', lambda d: d['surfaceMappings'].pop(), 'required screen family IDs differ'),
    ('missing_viewport_everywhere', remove_viewport, 'required responsive IDs differ'),
    ('missing_component', lambda d: battle(d)['componentMappings'].pop(), 'component coverage differs'),
    ('missing_component_and_path', remove_component_and_path, 'component coverage differs'),
    ('missing_origin_id', lambda d: battle(d)['componentMappings'][0]['originBindings'][0].pop('penOriginId'), 'origin ID must be explicitly unresolved'),
    ('missing_instance_overrides', lambda d: battle(d)['componentMappings'][0]['originBindings'][0]['instances'][0].pop('penOverrides'), 'instance ID and overrides must be explicitly unresolved'),
    ('invented_pen_id', lambda d: battle(d)['componentMappings'][0]['originBindings'][0].update(penOriginId='invented'), 'penOriginId must remain unresolved'),
    ('repeated_unresolved_origins_instances', repeated_bindings, None),
]
for label, mutate, expected in cases:
    data = copy.deepcopy(baseline)
    mutate(data)
    def read(path, *args, **kwargs):
        return json.dumps(data) if path.resolve() == contract else original_read(path, *args, **kwargs)
    error = None
    with patch.object(Path, 'read_text', read), redirect_stdout(io.StringIO()):
        try:
            runpy.run_path('docs/design/pen/check-pending-contract.py', run_name='__main__')
        except SystemExit as exc:
            error = str(exc)
    assert (expected is None and error is None) or (expected is not None and error is not None and expected in error), (label, error)
    print(f'PASS: {label}: {error or "accepted repeatable pending mappings"}')
print('PASS: 7 invalid in-memory contracts rejected; repeated pending origins/instances accepted; repository files untouched.')

```

Actual output:

```text
PASS: missing_surface: FAIL: required screen family IDs differ
PASS: missing_viewport_everywhere: FAIL: required responsive IDs differ
PASS: missing_component: FAIL: component coverage differs: battle
PASS: missing_component_and_path: FAIL: component coverage differs: battle
PASS: missing_origin_id: FAIL: origin ID must be explicitly unresolved
PASS: missing_instance_overrides: FAIL: instance ID and overrides must be explicitly unresolved
PASS: invented_pen_id: FAIL: penOriginId must remain unresolved
PASS: repeated_unresolved_origins_instances: accepted repeatable pending mappings
PASS: 7 invalid in-memory contracts rejected; repeated pending origins/instances accepted; repository files untouched.
```

`python3 docs/design/pen/check-pending-contract.py` output:

```text
PASS: pending JSON; 24 tokens; 67 asset IDs/exports; 12 screen families; 36 component relations; repository hashes/paths; 8 handoff links.
DESIGN NOT VALIDATED: no .pen source, node mappings or implementation approval.
```

`git diff --check` passed with no output. Self-review compared the documented relation to its JSON shape, verified real component names and the fixed coverage sets, and confirmed that repeated mappings remain supported without populated Pen fields. Files changed for this fix: `DESIGN-CONTRACT.md`, `design-contract.json`, `check-pending-contract.py` and this durable report. No app suite/build/server was run; user-owned `apps/web/next-env.d.ts` remains unstaged and unchanged by this task. No push/deployment occurred. The fix commit identity is appended to the controller-facing SDD report after commit.
