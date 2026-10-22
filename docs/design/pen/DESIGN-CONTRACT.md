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
| Home | Original `BXxLv`, `bec8B`, `vtHuB`; superseded composition in `heroes_home_v2` | Preserve brand/header tokens; apply user-approved new banner and six-section Home as documented below. |
| News, Events, features, hero list/detail | Actual nodes in `campaignExtension` | Semantic Next pages and original artwork; published DB news/events plus the approved elements extension. |
| Existing twelve gameplay families | Current runtime + approved new identity | Preserve layout, hidden information, rules, recovery, session and command semantics; apply theme and readability refinements. |
| Missing tablet/reflow/state frames | User-approved derived work | Adapt the supplied components; record deviations and verify in browser. |
| Motion | Existing GSAP/Pixi + approved restrained enhancements | Preserve timing authority, cleanup, interruption and reduced motion; no gameplay command in animation callbacks. |

Pen governs composition and presentation. Runtime owns phase order, stats, costs, powers, legal actions/targets, bots, persistence, receipts and revisions. Immutable core/location/tutorial data and exact English rules stay intact. User names are not translated. Public Heroes is distinct from native game selection. Browsing must not create or replace a match.

News and Events now read real published database records. Dates, weekly reveals, ticket progress, owned cards and daily availability come from the API. Old concept-event URLs remain explicitly labeled archives. New arena artwork decorates the board; the eight location mechanics are unchanged.

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

## Historical hero expansion design addendum

The [fourteen-hero collection](../heroes-expansion/README.md) is now playable in `heroes_v1`: twenty total heroes, thirty-two powers, twenty presets and the same sixty cards. The [current art guide](../heroes-v4.md) supersedes the original portrait packs with twenty coherent superhero-inspired OathFront illustrations and one ensemble banner.

The `heroes_home_v2` extension in [the machine contract](design-contract.json) records the latest user-approved Home composition: banner, interactive phase guide, featured heroes, cards/deck rules, Fivefold editorial and closing play action. It must retain the Pen logo, typography, semantic color tokens, accessible interactions and existing profile/editorial templates. Mobile must separate artwork and live copy. Hero IDs, names and four-power kits must agree across public profiles, selection, decks and matches.

These are derived extensions; the frozen Pen bytes and source identity remain unchanged. All fourteen new hero bindings and the new Home extension must remain null until a future editable Pen revision supplies actual nodes. The original asset groups are historical Pen baseline mappings; runtime portrait resolution uses the `heroes-v4` manifest first, for both legacy and current matches. The English content input hash is intentionally updated for the fourteen added identities and signatures.

`core_v1`, `locations_v1`, `tutorial_v1`, old deck revisions, match checkpoints and command receipts must remain readable without rewriting. Pending rematch/review-create commands must retry their exact original ID/body/version before considering migration. Both units strike simultaneously within each lane; lane order is 1 to 5. Ashen-first animation ordering must not be described as first-strike damage.

See the [implementation report](../../implementation/playable-heroes-home.md) for actual checks and remaining human balance/device acceptance limits.


## Current elements and events extension — 2026-10-22

The user-approved extension replaces new-game class rules with `elements_v1`: 20 heroes, two of eight systems each, 36 powers, 60 free base cards and 12 earned event units. Decks must contain 30 cards, at most two copies per ID, no more than 12 Neutral cards and at least six cards from each hero system. Legacy matches/decks must retain their bound catalog. Rarity must use both a readable code/shape and silver U, gold R, purple SR, rainbow SL or orange-red E.

Eight overlapping hero identities were redrawn after reviewing all twenty; twelve distinct v4 heroes remain. The current runtime uses `heroes-v5` overrides, `home-v3`, `event-cards-v1`, `world-v1`, `features-v2` and `elements-v1`. The four manually navigated Features panels and four decorated arenas preserve the Pen brand. New states and surfaces are explicitly derived; their `penNodeId` is null. No new Pen source nodes or gameplay frames are claimed.

`LiveNews` replaces runtime editorial mocks. `EventHub` implements prelaunch/reveal/archive, seven daily challenges, account/practice separation, server countdown, cooldown, resume and recovery. `RewardSummary` reads durable server rewards. Future E cards must stay sealed in collection/event UI until reveal or ownership; full immutable definitions remain available in the public catalog. Card ownership must be checked by the server when saving or starting a deck.

The repository input hash for `english-content.ts` was deliberately reconciled for the approved hero identities and version-bound English text. Source Pen hash and baseline tokens remain unchanged. See the [visual state contract](../elements-visual-contract.md), [hero audit](../hero-distinction-audit.md), [gameplay catalog](../elements-v1.md) and [implementation/evidence report](../../implementation/elements-events.md). Existing physical-device, balance and human-playtest gates remain open.
