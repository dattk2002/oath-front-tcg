# OathFront Pen ↔ Codex handoff

**Status: `awaiting_design`.** The [English prompt](OATHFRONT-PEN-PROMPT.md) is ready to paste into Pen. The [JSON contract](design-contract.json) records repository requirements, not an approved or executable design mapping. No actual `.pen` file has been supplied. Source path, SHA256, revision, schema version, document identity, node IDs, component IDs, variable names and theme bindings are explicitly `null`.

The missing input is the **real editable OathFront `.pen` file**, preferably `docs/design/pen/oathfront-rivals.pen`, and any referenced local images or design libraries. That path is a requested destination only; it is not the contract's actual source path. Screenshots are useful review evidence but cannot resolve editable components, variables or source identity.

## Context and goals

The contract connects the existing English five-lane game to a future editable design without transferring gameplay authority to a drawing. Logical IDs such as `hero_roster` or `battle_events` are repository requirements, never invented Pen IDs. The prompt retains the user's required guidance structure and explicit **must**/**should** rules. The [approved spec](../../superpowers/specs/2026-10-21-oathfront-rivals-redesign.md), [current state/QA rules](../../implementation/rivals-redesign-qa.md), [English catalog guide](../../PRESENTATION-EN.md), and [art direction](../../ART-DIRECTION.md) supply the baseline.

The current repository inputs are pinned by SHA256 and baseline commit in JSON. Those hashes describe existing CSS/catalog/manifests/motion, not a Pen file. The final hand-readability fix is reconciled against source commit `0f5354d7ca7a0dff66039fce1847ef0110fb3865`: compact summaries now span the card, desktop trick cues have two lines, and QA describes each dialog’s existing Escape behavior. Only the changed CSS/QA inputs received new hashes; actual Pen identity, mappings and validation remain unresolved. If those inputs change, the handoff must be reconciled; blindly updating the hashes is not validation.

## Verified Pen capabilities and limits

Official documentation was checked on **2026-10-21**:

- [Pen.dev](https://www.pen.dev) is the product entry point; the documentation is currently hosted at `docs.pencil.dev`.
- [The .pen format](https://docs.pencil.dev/for-developers/the-pen-format) describes a JSON tree, permits comments, requires unique object IDs/types and uses a document `version` to identify the schema. It describes reusable origins, reference instances and overrides. It recommends supported app/MCP/CLI editing rather than guessing serialized IDs. The live format can change; preserve original bytes before any app conversion.
- [Variables](https://docs.pencil.dev/core-concepts/variables) supports typed values, aliases and themes. CSS values can be brought into the design through an agent and reviewed. This contract therefore leaves actual variable/theme bindings unresolved until inspection.
- [Components](https://docs.pencil.dev/core-concepts/components) supports reusable origins, instances, nesting and per-instance overrides. The design must retain these relationships rather than flattening the interface.
- [Design ↔ Code](https://docs.pencil.dev/design-and-code/design-to-code) describes keeping the design and code in the same workspace and asking an agent to recreate or update components/tokens, followed by review. This is not a promise of automatic continuous synchronization.

These sources document capabilities, not a live connection to this repository. This task has not installed a Pen tool, opened a Pen account/project, created a design, published anything or run any Pen CLI/MCP operation. No command or integration endpoint is invented here. When the file arrives, use a supported available inspection/editing surface and the schema matching its actual version; strict JSON-only parsing is not sufficient for every commented `.pen` file.

## Authority and conflict rules

| Owner | May govern | Must preserve |
| --- | --- | --- |
| Pen design | Layout, hierarchy, semantic token proposals, art framing, component/state variants, responsive intent and GSAP cue annotations | Editable text/components/variables, exact English catalog copy, all original asset identities and accessible controls |
| Runtime/content/server | Phase and turn order, numbers/costs/stats, legal actions/targets, bots, hidden information, content IDs/hashes, checkpoints, receipts and revisions | Immutable `core_v1`, `locations_v1`, `tutorial_v1`, transport schemas and explicit command recovery |
| Presentation controller | Rendering authoritative events, presentation cursor, shared damage beat, interruption/reconnect/visibility/reduced-motion handling | EVIL/GOOD anticipation offset, capped events, no gameplay command in animation callbacks |

A design that changes a cost, target, phase, power rule, retry meaning or hidden-information boundary must be recorded as a conflict. Codex must preserve runtime authority and resolve the design conflict before implementation. Existing user-owned names and historical source/parity records must remain unchanged. A visual label is not permission to rewrite historical `nameVi` or other wire fields.

## Design tokens and foundations

`tokenMappings` names every existing custom property from `apps/web/src/styles/tokens.css`, with its actual current value and unresolved Pen variable/theme binding. Barlow Condensed and Noto Sans remain the type system. `proposedScaleMappings` records the approved spacing/type scale without inventing implemented CSS variable names. Future extra tokens must be explicit reviewed proposals. Component guidance must use semantic variables, with measurable contrast on both paper and dark surfaces.

The two `assetGroups` list each stable content ID with an unresolved Pen node binding. The `rivals-v2` group contains six heroes and the shared board; `fivefold-cards-v3` contains all 60 cards. The runtime and source manifests are the authority for paths, art keys, variant sizes, source hashes and provenance. Public image URLs map below `apps/web/public`, not repository root. `assetResolverPath` points to the actual `resolveArt`/`artById`/`battleAssetRequests` integration. Core power/token fallback and the unconditional eight terrain strips must remain intact.

## Component-level rules and mapping shape

`surfaceMappings` links twelve logical families to real component files: shell/home, hero roster/inspect, decks/collection/review, setup, mulligan, battle, inspect/log, block response, pause/recovery, results/history, settings/tutorial and auth. These are logical screen groups, not assumptions that each family maps to exactly one Pen frame.

Each family combines the shared `globalStates` and `globalInteractionRequirements` with its `requiredStates`. `penNodeId` identifies its primary screen root; `penStateNodes` and `penResponsiveNodes` will be objects from logical requirements to arrays of verified node IDs. These screen bindings do not stand in for component mappings. If a state is inapplicable, the final mapping must state the reason and review outcome rather than quietly omit it.

Every family has a `componentMappings` array keyed by the pair `repoPath` + `repoComponent` (the actual exported component declaration). Each component has one or more `originBindings`. Each origin binding has a unique `logicalVariant`, a nullable `penOriginId`, and an `instances` array. Each instance has a unique `logicalUsage` within that origin, nullable `penInstanceId`, and nullable `penOverrides`. The pending `default` variant/usage are logical placeholders, never Pen IDs or claims that those design variants exist. All actual Pen fields remain null.

This relation supports multiple origins per repository component and repeated instances per origin, including different states, screen locations and responsive layouts. For example, battle Board, Hand, PhaseControl and HeroPanel each have their own relation; Hand has separate screen-family usage in mulligan and battle. CardCollection and its QuantityControls, and ResultDialog and ResultDetail, are separate component entries even though they share a file. Once inspected, `penOverrides` must be an array of records with `penTargetNodeId`, `property` and `value` describing each verified instance override (an empty array means inspected with no overrides; null means unresolved). An override target must resolve within that instance's origin/descendant structure; variable or asset references in values must also resolve. Each `penInstanceId` must refer to its recorded `penOriginId`. Shared origins may recur across component/screen mappings when intentional, with the relationship documented. Non-reusable design nodes must be reported as a mapping conflict, not assigned fabricated origins.

`responsive` defines 375px mobile/fallback, 1024×640 compact board, 1440×900 desktop and 200% reflow. These are acceptance viewports, not invented CSS breakpoint tokens. `motionMappings` references actual GSAP helpers/cues; it cannot make a static drawing an animation test. The future design must annotate normal/reduced states, cancellation, native dialog close, low VFX and hidden/reconnect fast-forward.

## Accessibility requirements and acceptance criteria

Before implementation, a reviewer must check the real design for 4.5:1 normal text, 3:1 large text/meaningful boundaries, 44×44px targets and 8px spacing; focus visibility; keyboard/pointer/touch parity; native modal focus/return; long-content reflow; full rule inspection; and accessible loading/error/retry states. Decorative art must not replace semantic controls or duplicate announcements. The project requires unobscured focus even where that exceeds WCAG AA's minimum. The prompt contains per-family behavior and pass/fail checks.

These design checks do not certify browser behavior. After implementing a later approved design, code and browser checks must verify the actual user-visible flow, console errors, interruption, reduced motion and all supported viewport/zoom conditions. Physical-device, assistive-technology, performance p95, balance and human-playtest holds in the [release checklist](../../implementation/release-checklist.md) must not be cleared by design review.

## Content and tone standards

All product copy must remain concise English; exact rules must resolve by stable ID from `apps/web/src/content/english-content.ts`. “Choose your hero”, “End phase” and “Keep for later” are clear actions. User account/deck names must remain unmodified in any language. Designers should shorten explanatory prose, never amounts, targets, trigger order or duration in rules.

## Future import, identity, mapping and implementation workflow

1. **Receive and preserve.** Read the supplied file and dependencies without overwriting source. Record the real repository-relative path and SHA256 of exact file bytes. Read the actual `version` and document identity if the format provides one; do not invent a document ID if absent. Record an explicit revision identifier (for example, the Git commit containing the supplied file, or a supplied immutable design revision). Missing revision identity must remain unresolved and must block readiness. App conversion requires retaining the original and recording the converted file as a new reviewed source/hash/version.
2. **Inspect against the actual schema.** Verify version support with current official docs and a supported available Pen surface. Validate object IDs, references, component origins/instances/overrides, variables/themes, images and library dependencies. Report unsupported constructs or unavailable libraries. Do not run embedded scripts or generated code merely because a design references them.
3. **Resolve mappings.** Populate real frame/component/state/responsive node IDs, variable names/theme values, all 67 hero/board/card content bindings, image references and motion cue boards. Check the saved file itself, not guessed labels or screenshots. Use arrays for repeated instances/variants. Record all unmapped requirements and any proposed token/component additions.
4. **Reconcile authority and baseline.** Compare the pinned repository inputs to current code. Record design/runtime conflicts, differing copy or asset pairings, and intentional design changes. Resolve conflicts with the existing game requirements; unresolved authority conflicts block implementation. Populate `conflictReview` only after actual review; its current `null` conflict list means not inspected, not zero conflicts.
5. **Validate before applying.** Review screen/state completeness, editable structure, responsive and accessibility annotations and motion budgets. Attach exact source identity, validation results, evidence paths and reviewer decision. `awaiting_design` may advance to `mapped_pending_review` after inspection; `implementation_ready` requires all required mappings and checks plus recorded review, with `implementationReady: true`. Those are future workflow states, not supported claims from the current pending-only checker. Extend the contract/checks for the actual file format before advancing it; optional absent document metadata may stay null with a documented reason.
6. **Apply within authorization.** Only after the mapping gate passes and implementation is authorized, make the smallest coherent component/token changes, preserving game authority. Inspect the diff, run relevant focused checks and verify the complete browser flow. Record the exact source revision used. If the design changes, invalidate the old readiness, rehash/remap/review, and repeat the affected validation before further application. Commit/push/deploy remain subject to the user's authorization.

## Anti-patterns and prohibited implementations

The contract must not contain fake Pen IDs, an invented schema version, an assumed live connection, a fabricated file hash or an approval based on screenshots alone. A source destination must not masquerade as a received file. Empty evidence arrays and null bindings must not be read as successful validation. No automatic design-to-code write, whole-screen rasterization, hidden gameplay changes or broad regeneration is implied.

## QA checklist and current check command

From the repository root run:

```sh
python3 docs/design/pen/check-pending-contract.py
```

This dependency-free check validates the **pending repository handoff only**: strict JSON for our own contract, unresolved design identity/bindings, pinned repository input hashes, existing component/authority paths, CSS token values, complete manifest asset ID sets and exported paths, independently pinned screen/component/viewport coverage, explicit nullable origin/instance/override relations, plus local Markdown links in the handoff. It does not parse a `.pen` file, validate Pen's schema, execute a design or certify UI behavior. A standalone Pen schema is intentionally not duplicated before a real file/version exists.

- [ ] Actual `.pen` file, dependencies and immutable source identity received.
- [ ] Actual version, IDs, references, variables/themes and components validated.
- [ ] All logical screens/states/responsive variants and 67 content bindings resolved.
- [ ] Gameplay/copy/asset conflicts reviewed and resolved; repository drift reconciled.
- [ ] Design contrast, input/focus, reflow, motion and error recovery reviewed with evidence.
- [ ] Review decision recorded before implementation readiness; actual browser verification follows implementation.

All items above remain pending. The completed redesign's earlier evidence remains in the [redesign archive](../../implementation/evidence/rivals-redesign/README.md); it must not be misrepresented as validation of a future Pen design.
