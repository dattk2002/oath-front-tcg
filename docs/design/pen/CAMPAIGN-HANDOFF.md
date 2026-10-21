# OathFront campaign design — supplied source and historical handoff

## Current implementation approval

The user selected `oath-front-tcg-design.pen` and approved recommendations 1A–7A and sequential implementation, with close Pen fidelity. The source is now byte-pinned at SHA256 `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`; relative images are under `oath-front-tcg-design-assets/`. [Contract v2](DESIGN-CONTRACT.md) and the fresh inventory supersede old filename/hash, provisional status and no-implementation statements below. The following notes retain the original design-authoring history; they do not assert current runtime completion.

## Historical scope and authorization

The user authorized a new visual identity and mock News/Events content. This delivery adds five campaign page families, not completion of the original 21-step gameplay design. No runtime code, deployment, credentials or gameplay definitions were changed.

Direction: comic-editorial, warm paper / slate violet / lilac / acid yellow. Original hero art is framed with contain sizing, retaining the full silhouette. The generated twilight-arena background is a presentation proposal, not a replacement for the authoritative gameplay board asset.

## Files

- Editable snapshot: `docs/design/pen/oathfront-rivals.pen` (schema `2.20`).
- Working canvas: `/home/bia/.pencil/documents/0df4995a-8040-45b3-9adf-f36bbfdf0b79/pencil-new.pen`.
- SHA256: `d23e9cb8bd34a93a8b66373de5749322869606ceab0b04bafac81dcb59ea049e`.
- Read-back inventory: `campaign-design-inventory.json` (42 top-level frames, 9 reusable origins including the earlier primary button, 98 reference instances including nested replacements, 18 referenced image files).
- Required relative image directories: `assets/`, `images/`; copied alongside the snapshot. Fonts: Barlow Condensed and Noto Sans; font binaries are not bundled.
- Review PNGs: `campaign-review/`, named by actual node ID.
- Immutable revision: unresolved. Document identity: not exposed by this file; unresolved. No invented revision or approval.

## Page coverage (actual IDs)

| Family | Desktop | 375px mobile |
| --- | --- | --- |
| News | BsnWN | mqwt0 |
| News article | x67YO7 | g72q4 |
| Game Features | Wcfik | ap90K |
| Heroes List | xaC80 | ImQTb |
| Briar detail / H_G_BV | CFFhD | V2TyW |
| Aster detail / H_G_BP | xWCNu | OO9Cw |
| Lumen detail / H_G_VP | PdL8F | k1qOH |
| Cinder detail / H_E_FX | kwF10 | P0Kr5 |
| Vesper detail / H_E_FS | wOMyT | LFX8n |
| Morrow detail / H_E_XS | MjPlg | RbKMC |
| Events | QXjQb | pNR5Q |
| Event detail | di6Pk | c9F7A |

Campaign state/interaction board: `gnUh9`. Existing Home desktop header now uses the campaign navigation. Earlier compact/mobile Home remain a previous direction and need navigation reconciliation.

Hero profiles use exact names, titles, classes, 20 starting HP and four English power descriptions joined from current source by hero/power ID. They are marketing profiles, not a complete in-game power inspection implementation: energy costs, triggers/target selection states and legal-action interactions still belong to unfinished gameplay scope.

## Origins and implementation mapping

- Desktop navigation `hsZRy`; mobile navigation `U1rbi`.
- Editorial card `iIIoZ` (shared News and Events instances).
- Desktop hero stage `F27zFz`; mobile hero stage `J1zPFH`.
- Instance references and raw descendant overrides are recorded from the saved JSON, not inferred from labels.
- Proposed campaign routes/components do not yet have verified `repoPath + repoComponent` implementations. Those fields remain null in `campaignExtension`; do not assign the marketing pages to gameplay components merely because they share a hero.
- The original 36 gameplay component relations are not fulfilled by these campaign origins.

## User-approved typography revision

All existing UI screens and shared components now use **Barlow Condensed**, matching the requested `el9uT` navigation reference. Desktop menu: 20px / 700; mobile menu: 18px / 700. Other sizes and weight hierarchies are preserved. Resolved instance readback found zero non-Barlow enabled UI text nodes. Documentation boards and historical Foundations samples are excluded. Runtime CSS and source token values remain unchanged; this is an authorized design departure from the Noto Sans body baseline. Logo remains editable vector paths.

## Shared editorial branding revision

- Revised original editable vector logo: `NqrjD`; transparent PNG review: `campaign-review/NqrjD.png`. Custom kinetic OATHFRONT lettering with nine angular, forward-slanted glyphs replaces the earlier wordmark/emblem. Large master: `uH99S`, review `campaign-review/uH99S.png`. Inspired by action-game typographic energy, not a legal clearance or a copy of the Rivals wordmark.
- News thumbnail template: `A1rpGz`, shared yellow geometric background and logo top-left.
- Event thumbnail template: `oz8eb`, shared dark geometric background and logo top-right.
- Applied to 24 list thumbnails across desktop/mobile and four detail covers. Shared campaign header origins and legacy Home compact/mobile headers all use the transparent NqrjD logo. Readback found no remaining enabled plain-text OATHFRONT wordmarks.
- Both templates remain reusable with editable headline/edition text; the logo is vector paths, not rasterized lettering. Logo backgrounds and contrast plates are now transparent. Dark headers and Events use light logo paths; yellow News retains dark logo paths. Large-master and logo PNG exports have transparent backgrounds.
- Only one reference image was visible in this revision. The dark Event treatment is provisional pending the second reference.
- Earlier review PNGs not regenerated in this revision may show the old header; the editable snapshot is authoritative.

## Individual hero environments

Six AI-generated promotional scenery backgrounds are shared consistently between all 12 Heroes List cards (`xaC80`, `ImQTb`) and all 12 desktop/mobile Hero Detail stages. The original full-body hero cutouts and power descriptions remain unchanged. Library: `MfFuq`; desktop stage child: `vi9eC`; mobile stage child: `IXTNT`. The index badge retains an opaque paper backing for readability.

| Hero | Background node | Asset | Scene |
| --- | --- | --- | --- |
| Briar | XQUtF | images/generated-8.png | Forest citadel |
| Aster | JM1Xl | images/generated-5.png | Crystal bastion |
| Lumen | A7k81X | images/generated-7.png | Light sanctuary |
| Cinder | O2niCN | images/generated-9.png | Volcanic forge |
| Vesper | TlStH | images/generated-4.png | Dusk rooftops |
| Morrow | zT3S1 | images/generated-6.png | Arcane observatory |

These environments are presentation proposals, not new authoritative gameplay locations.

## Six-hero key art concept

`slomn` / `nkcMm`: new AI-generated promotional illustration, Dawnward versus Ashen Court, requested as a dynamic ensemble battle composition. Current detailed painterly revision: `images/generated-3.png`; canvas export: `campaign-review/slomn.png`. Character rendering now emphasizes facial features, engraved metallic armor, textile ornament and weapon detail. The previous image is superseded in all three Home variants. This is raster concept artwork in an editable frame, not editable character paths. Likeness, anatomy and composition require human approval; foreground figures meet/crop at the lower edge. At user request, the illustration is now the Home desktop/compact/mobile background (`BXxLv`, `bec8B`, `vtHuB`). Separate Briar/Cinder cutout layers and standalone identity captions were removed from Home. Desktop/compact retain a text-contrast veil; mobile shows the ensemble above the text. Runtime manifest assets remain unchanged.

## Mock content policy

All News headlines/articles and Events are mock editorial material. Visible mock labels and notes distinguish them from published content. Event dates, registration, eligibility, prizes and rewards are not invented. Mock titles are proposals, not source-backed announcements. The event detail has no registration action.

## States and interaction

The shared state board illustrates default, hover, focus-visible, active, selected, disabled, loading, empty, error and recovery. It specifies 44px targets, 8px gaps, keyboard/pointer/touch parity and independent destinations. These are design intents, not working interactions.

- Hero marketing tiles navigate to detail; the original in-game selector keeps native radio behavior.
- Filters retain selection through retry. Single mock pagination page is shown; multi-page behavior remains unspecified.
- Loading reserves geometry. Named missing-art state keeps hero information available.
- No campaign dialogs: Escape dismissal is inapplicable. Original Pause/Result rules remain unchanged.
- Reduced-motion intent: static art or short fade. No hover-only information or motion-dependent input.
- Shared states are representative, not every state instantiated on every responsive page.

## Checks performed and limits

- Parsed saved JSON and read schema version `2.20`.
- Every reference origin resolves to a saved node; all 18 referenced image paths exist in the handed-off directory.
- Compared the supplied snapshot byte SHA256 to the contract; match confirmed.
- Representative desktop/mobile pages and state board were screenshot-reviewed and exported.
- Calculated sRGB contrast for solid pairs: ink/paper **14.76:1**, paper/slate **10.89:1**, acid/ink **15.60:1**, muted text/slate **8.35:1**, border/slate **3.35:1**. These figures do not validate image-overlay text or every rendered state.
- Full schema validation, all descendant-override resolution, every text bound, all hit areas, browser focus/navigation, screen readers, actual touch devices and performance remain unverified.

## Still outstanding

1. Campaign compact 1024px and 200% reflow studies; reconcile older Home variants with new navigation.
2. Complete marketing interaction prototype, all filtered/detail recovery variants, final content and publication routes.
3. Full accessibility/contrast and component-instance audit, especially raw descendant overrides.
4. Original in-game screens, 60-card gallery, setup/mulligan/battle, recovery/auth/tutorial/results and motion handoff from the 21-step prompt pack.
5. Immutable reviewed revision, repository conflict reconciliation and implementation authorization.

`design-contract.json` remains `awaiting_design` with `implementationReady: false`. Its additive `campaignExtension` documents only this scope. The old `check-pending-contract.py` assumes all design identity fields are null; it has not been extended and must not be reported as passing acceptance for this partial snapshot. No release gates are cleared.
