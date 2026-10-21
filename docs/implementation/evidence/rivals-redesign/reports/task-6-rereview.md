- **Per-component Pen origin, instance, and override mapping** — ADDRESSED. `docs/design/pen/design-contract.json:840` gives battle a separate `componentMappings` relation for each repository component, including Board (`:877`), HeroPanel (`:894`), Hand (`:911`), and PhaseControl (`:928`). Each relation has repeatable origin and instance bindings with explicit null Pen IDs and overrides; `docs/design/pen/DESIGN-CONTRACT.md:47` defines their future resolution. The pending status and readiness gate remain honest at `design-contract.json:3`.
- **Pin required screen-family and viewport sets in the checker** — ADDRESSED. `docs/design/pen/check-pending-contract.py:12` pins component pairs by family and `:74` pins viewport IDs; `:136-147` checks these independently of the JSON, including each family's repository paths. The fix report records rejection of removed screen, viewport, and component cases.

### New Breakage in the Fix Diff

None at Critical or Important severity.

### Out-of-Scope Observations

None.

### Checks

- Inspected the supplied `55506be..60d3a8d` fix diff and the changed mapping/checker sections; no Git commands or suite/build run.
- Confirmed the implementer's report includes actual pending-checker output (`12 screen families; 36 component relations; DESIGN NOT VALIDATED`) and seven rejected in-memory invalid contracts plus acceptance of repeated pending bindings. These claims agree with the diff's coverage and null-binding checks at `check-pending-contract.py:136-160`.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage. Actual Pen IDs remain unresolved until an editable `.pen` source is supplied.
