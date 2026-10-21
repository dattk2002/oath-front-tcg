# OathFront — fourteen-hero expansion design

Date: 2026-10-22. Deliverable: character design and artwork, followed by a whole-app design/game review. The existing Pen implementation is complete through M7 on commit `1194199`; its GitHub CI run 39642006445 passed.

## Intent and scope

The user requested fourteen additional heroes after the Pen implementation, with Marvel Rivals as an art/presentation reference, and a review of the full app against the Pen source and web-game behavior. This work must deliver fourteen original full-body hero illustrations and an English character bible: name, title, faction, two classes, identity, visual language, four-power kit, strategy, counterplay, and motion/art handoff.

The allocation of seven Dawnward and seven Ashen Court heroes is the designer's proposed default. Two asynchronous questions are pending: whether these heroes must become playable now, and whether to retain the existing sixty-card pool or add cards. Completing their designs is independent of those answers. This delivery must not silently expand the live catalog. Current runtime remains six heroes; twenty is the proposed total. Numeric balance is a design hypothesis, not a playtested claim.

## Non-negotiable constraints

- All new visible names and text must be English.
- Existing `core_v1`, `locations_v1`, `tutorial_v1`, six heroes, sixty cards, historical records and active matches must remain unchanged.
- The frozen Pen file must retain SHA256 `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`. No new hero frame may be claimed to exist inside it.
- Artwork must be original, generated with the built-in image tool; reference sites must inform shape, composition and presentation rather than supply copied characters or assets.
- Each hero must have a distinct name, silhouette, equipment, material/color balance and tactical role. Similar class pairs are intentional, but identical four-power kits are prohibited.
- Art must retain genuine alpha, full figure and readable equipment. Slight translucent rim-light and low-alpha edge dust are acceptable; visible clipping of solid anatomy is not.
- No runtime code, database, environment, production deployment or audio changes belong to this design delivery.
- Commit/push of this scoped work remains authorized; unrelated user audio changes and `next-env.d.ts` must be excluded.

## Design direction

Use OathFront's existing angular comic fantasy, carved painterly planes, ivory/navy/gold Dawnward materials and charcoal/ember/plum Ashen materials. Marvel Rivals' large character presentation, strong silhouette and condensed title hierarchy are relevant references. Its official website describes a downloadable 6v6 shooter; it is not evidence that a browser card game's rules are correct. Sources: [official website](https://www.marvelrivals.com/) and [hero presentation](https://www.marvelrivals.com/heroes/index.html), inspected 2026-10-22 local time.

Public presentation must continue using the established Pen paper/slate/lilac/acid tokens and Barlow Condensed. Character colors must not replace semantic UI colors. The existing six-profile template is the future adaptation basis, not an invented claim of fourteen new Pen frames.

## Content contract

`docs/design/heroes-expansion/roster.json` is a design manifest, not a runtime catalog. IDs beginning `H_G_`, `H_E_`, `S_G_` and `S_E_` in this manifest are reserved proposals only. Each candidate has 20 HP, two existing classes, three existing class powers and one unique proposed signature costing 1 energy. There are fourteen new signature designs and fifty-six kit slots, not fifty-six new effects.

Normal held-power timing must remain GOOD_PLAY for Dawnward and EVIL_TRICKS for Ashen Court. The existing BLOCK_RESPONSE exception permits only the just-earned power at its existing free cost. Acquisition, hand/tray limits and one-use power pool must remain governed by RULES.md. Heroes have no extra passive or basic attack button.

The manifest lists English rule text, required target and ordered effects. For any later playable implementation:
- A required unit target must exist and be legal at validation. A move destination must be different, empty on that unit's side and lane 1–5.
- Invalid intents must change no state, RNG or energy. A selected target that disappears during a cascade must not be retargeted; later independent effects still resolve.
- Permanent health buffs must increase current and maximum HP together. Healing must cap at maximum and must not resurrect.
- Shield, Armor and Poison must not stack. Armor precedes Shield; zero damage must not consume Shield. Poison ticks under existing end-turn ordering.
- Pierce must add a separate full-ATK hero packet when the unit attacks a blocker; it is not overflow damage.
- All-unit damage must be one simultaneous batch. Tokens must use existing definitions and must not trigger PLAY_UNIT entry rules.
- A signature with no target may be used on an empty board and have no effect. Mandatory empty-lane summons must be illegal on a full allied board.
- Movement must not grant a second regular attack in the same turn.
- Existing root/cascade/lethal checkpoints must apply; no hero may be healed from 0 HP during a resolving root.

Starter deck references point to legal existing 30-card presets with matching classes. They are buildable templates, not fourteen optimized or independently balanced lists. No new cards are part of the default proposal.

## Deliverables and handoff

1. `docs/design/heroes-expansion/README.md`: complete English character bible, shared-power glossary and preview links.
2. `roster.json`: explicit design data; `prompts.json`: exact generation prompts and any corrections.
3. `assets/source/heroes-expansion-v1/heroes/*.png`: fourteen accepted final originals.
4. `assets/source/heroes-expansion-v1/manifest.json`: hashes, dimensions, alpha bounds, provenance and review notes.
5. `docs/implementation/app-design-review.md`: cross-surface Pen mapping, functional evidence, actual issues and remaining acceptance limits.
6. Pen contract addendum: clearly unmapped design extension, separate from implemented scope.

Full figures should use contain without distortion. Hero tiles should crop the face/upper torso with per-asset focal-point review. UI labels must remain separate text, never baked into artwork. Future motion must use scoped GSAP, 300–480 ms entrances and 160 ms immediate feedback consistent with the campaign; no gameplay result may depend on animation. Reduced motion must remove travel, drift and repeated effects while preserving all information.

## Sequential milestones

- H1: finalize all fourteen profiles, semantic kits, asset prompts and compatibility boundaries; builder-check the written design.
- H2: generate all fourteen images, correct visible clipping, inspect alpha and record an auditable manifest.
- H3: review the full current app against the frozen Pen source, current CI evidence and game rules; fix any evidenced in-scope defect, record gaps honestly.
- H4: validate links/data/assets, inspect scoped diff, commit and push the design package and review.

If playable integration is requested, a separate implementation plan must first cover versioned content negotiation, server validation, engine/bot legal actions, persistence/replay compatibility, decks and profile/selector mappings. Do not modify immutable core_v1 in place. Physical-device performance, assistive-technology checks and human balance playtests cannot be replaced by screenshots or generated art.

## Decisions left to the designer

Individual original names, lore, clothing, palette proportions, practical silhouettes, signature candidate values and image framing are designer decisions within this brief. Exact runtime content version and balance values remain future implementation decisions after scope is answered. No additional questions are necessary to finish the design artifacts and current-app review.
