# OathFront Pen ↔ Codex implementation contract

**Status: `implementation_ready_scoped` (version 2).** The user approved recommendations 1A–7A, sequential M1–M7 implementation, and close fidelity to the supplied [editable design](oath-front-tcg-design.pen). This is readiness for the supplied campaign/Home screens and an explicitly approved theme adaptation of existing game screens. Implementation and local runtime checks are complete within that approved scope; this is **not** complete Pen gameplay coverage or release certification.

## Source identity and verification

- Source: `docs/design/pen/oath-front-tcg-design.pen`, Pen version `2.20`.
- Exact SHA256: `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`.
- Immutable content-addressed revision: `sha256:` followed by that digest. Source bytes are preserved; no Pen app conversion was performed.
- Document ID: unresolved. An undocumented file token is not treated as a verified document identity.
- Readback: 42 top-level frames, 1,128 unique nodes, 9 reusable origins, 98 instances, 29 variables and 18 local image dependencies. The reader resolves the used origin/descendant replacement structures and checks image hashes and variables. It does not certify the complete external Pen schema or renderer.
- [Readback inventory](campaign-design-inventory.json), [approved specification](../../superpowers/specs/2026-10-21-pen-design-implementation.md), [sequential plan](../../superpowers/plans/2026-10-21-pen-design-implementation.md), [design handoff](CAMPAIGN-HANDOFF.md).

The earlier `oathfront-rivals.pen` filename and `d23e9c…` hash describe a previous export, not this file. The supplied export rebases images into `oath-front-tcg-design-assets/`. The older `assets/` and `images/` files are preserved as historical dependencies, not used to guess new references. Supplied PNG reviews can lag a revision; the actual resolved design tree is authoritative.

## Scope and authority

| Scope | Design basis | Implementation behavior |
| --- | --- | --- |
| Home | `BXxLv`, `bec8B`, `vtHuB` | Match ensemble background, logo, typography, header, composition and actions. |
| News, Events, features, hero list/detail | Actual nodes in `campaignExtension` | Semantic Next pages, exact visual direction and original artwork; static mock editorial content. |
| Existing twelve gameplay families | Current runtime + approved new identity | Preserve layout, hidden information, rules, recovery, session and command semantics; apply theme and readability refinements. |
| Missing tablet/reflow/state frames | User-approved derived work | Adapt the supplied components; record deviations and verify in browser. |
| Motion | Existing GSAP/Pixi + approved restrained enhancements | Preserve timing authority, cleanup, interruption and reduced motion; no gameplay command in animation callbacks. |

Pen governs composition and presentation. Runtime owns phase order, stats, costs, powers, legal actions/targets, bots, persistence, receipts and revisions. Immutable core/location/tutorial data and exact English rules stay intact. User names are not translated. Public Heroes is distinct from native game selection. Browsing must not create or replace a match.

News and Events remain visibly labeled editorial mocks, with no invented dates, registration, rewards or eligibility. The selected promotional images and vector wordmark are approved for this implementation; scenes do not become new gameplay locations.

## Tokens, assets and mappings

The JSON retains all 24 baseline CSS tokens and now maps them to actual Pen variables. Numeric radii use explicit CSS-pixel conversion. Five campaign color variables are additional presentation values. Barlow Condensed is the approved UI font, with readable body weights and Noto Sans Unicode fallback.

All 67 existing runtime hero/board/card identities remain covered. Only IDs actually present in Pen receive `penNodesByContentId` bindings; omitted gallery cards remain null and retain their existing images. Image identity is matched by bytes, not by renamed filenames. Optimized runtime derivatives must have source hashes in their manifest.

The original 36 repository component relations are preserved. A screen frame is not a reusable component origin: App/Layout composition does not acquire a fabricated `penOriginId`. Every family has a `designBasis` and explicit explanation of missing Pen coverage. Actual campaign code mappings now point to shipped components, with shared header, Home and logo relations recorded separately. Planned paths must not masquerade as existing exports. The raw inventory records actual origins, instances and descendant overrides.

## Fidelity and accessibility

Implementation must follow source composition, artwork framing, hierarchy, logo, colors and typography. Deliberate departures are limited to supported viewport adaptation, readable text, full rules/stats, keyboard focus, 44px targets, 8px separation and missing loading/error/retry/empty states. Record departures in `implementationScope.deviations` and compare browser screenshots with the supplied design.

Desktop 1440×900, compact 1024×640, 375px public pages/game fallback, and 200% reflow remain required. The compact battle must retain all hand stats/trick cues and reachable phase controls. Each dialog keeps its own Escape/focus behavior: Pause can resume when allowed or cancel confirmation; Result uses explicit exits. Reduced motion must retain clear feedback without motion-dependent input.

## Validation and change protocol

Run from the repository root:

```sh
python3 -m unittest discover -s docs/design/pen -p 'test_*.py'
python3 docs/design/pen/check-design-contract.py
```

`check-pending-contract.py` delegates to the v2 checker for command compatibility. It no longer asserts that all identity fields are null.

The checks verify source hash/revision, used references and nested overrides, local dependencies, token bindings, inherited components, supplied campaign IDs and documentation links. The eight reader tests exercise malformed origins/overrides, cycles, variable errors, unsafe/missing image paths, duplicate IDs and source drift. Five additional derivative tests reject changed output/source bytes, unsafe paths, duplicate outputs, unknown source nodes and missing/malformed required hashes. The 21 shipped campaign derivatives are checked alongside their licenses and source references. These checks do not prove runtime visual/accessibility quality.

A change to the `.pen` bytes invalidates its mapping and review. Reinspect, preserve the old identity in history, resolve new conflicts and review before applying. Repository input hashes must be deliberately reconciled with a documented implementation change; never silently update them to hide drift. `implementationVerification` is updated only after actual code/browser checks.

Physical-device, assistive-technology, performance, balance and human-playtest holds in the [release checklist](../../implementation/release-checklist.md) remain separate. This design implementation does not clear them.

The [single-file prompt library](OATHFRONT-PEN-PROMPTS.md) and [original full brief](OATHFRONT-PEN-PROMPT.md) remain historical design-authoring references. Their earlier pending-design wording is superseded by this contract and the approved specification.

Implementation and verification evidence: [Pen implementation report](../../implementation/pen-design.md).

## Hero expansion design addendum

The [fourteen-hero design collection](../heroes-expansion/README.md) adds seven proposed Dawnward and seven proposed Ashen Court identities, each with original full-body artwork and a four-power design. See the [gallery](../heroes-expansion/gallery.html), [design manifest](../heroes-expansion/roster.json) and [source asset manifest](../../../assets/source/heroes-expansion-v1/manifest.json).

This extension is **design-only, not playable**. The current runtime remains six heroes; twenty is the proposed total. Playable integration and whether to add new cards are pending the existing scope answers. Draft IDs must not be treated as current API IDs. All fourteen Pen node bindings remain null because the frozen source contains no frames for them. Existing six-profile templates provide a derived design basis only.

The extension must not alter source identity, existing runtime asset groups, core_v1, active matches or the implemented-scope readiness status. A future editable Pen revision must supply actual frames before bindings are populated. A playable version must separately cover content versioning, persistence compatibility, power semantics, decks, bot decisions, UI mapping and balance validation.
