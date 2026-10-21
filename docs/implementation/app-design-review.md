# OathFront — whole-app design and web-game review

Reviewed 2026-10-22 (Asia/Ho_Chi_Minh). Runtime baseline: `1194199a9db3e475700ec55f5a6d15477d921e48`. Reference: [frozen Pen contract](../design/pen/DESIGN-CONTRACT.md), source SHA256 `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`.

**Verdict:** the supplied campaign designs and approved inherited game theme are consistent within their documented scope. No unresolved Critical or Important review finding remains. Fourteen additional heroes now have original artwork and design kits, but remain a separate design collection. The runtime still contains six heroes and sixty cards. This verdict is not complete Pen gameplay coverage, a balance verdict or production certification.

## What was compared

The review combined source/component inspection, actual Pen exports/resolved nodes, production-build browser captures, exact-commit GitHub CI and an independent read-only visual/code review. The independent reviewer inspected all fourteen new illustrations and representative screenshots across public pages, builder, hero selection, history, settings, tutorial, results and dense battle. Existing full-run evidence was reused; no claim is made that every behavior was manually replayed after the art work.

| Surface | Pen basis | Consistency / behavior reviewed |
| --- | --- | --- |
| Home | BXxLv / bec8B / vtHuB | Ensemble composition, exact logo, type hierarchy, CTA and public navigation. Play resumes an active match or opens native selection. |
| Public roster and six profiles | xaC80 / ImQTb and six actual profile pairs | Faction filters, semantic whole-card links, full-figure art, class/power identity, selected-hero deck intent. |
| News, articles, Events and event details | Actual campaignExtension IDs | Shared header/tokens, filters, empty state, deep links and 404. Mock content is visibly labeled. |
| Game Features | Wcfik / ap90K | Source composition, English rules hierarchy, responsive reflow and shared actions. |
| Native hero selector | Inherited runtime skin | Hero/faction distinction, keyboard selection, exact preset mapping; distinct from public browsing. |
| Collection / deck builder | Inherited runtime skin | Card artwork, costs/stats/rules, class legality, 30-card validation, draft/save/retry and responsive drawer. |
| Setup / mulligan | Inherited runtime skin | Correct hero/deck context, explicit start/confirm and safe double-submit handling. |
| Battle / inspection / log | Inherited runtime skin | Five lanes, phase/energy/health visibility, target state, full inspected rules and reachable controls. Dense ten-card/ten-unit evidence at five sizes including 1024×640. |
| Block response | Inherited runtime skin | Correct just-earned power, free response rules, explicit keep, interrupted/resumed combat context. |
| Pause / recovery | Inherited runtime skin | Authoritative checkpoint/revision, retained intent, offline/conflict feedback, explicit recovery choices. |
| Result / history / rematch | Inherited runtime skin | Result dialog focus, terminal state, reload/history/expiry, exact rematch source and idempotent retry. |
| Settings / tutorial / account | Inherited runtime skin | Shared theme, keyboard/focus, reduced motion, tutorial fallback, account disclosure and session restoration. Concurrent audio changes are excluded. |

Pen does not contain complete replacement layouts for the twelve gameplay families. The inherited layout and faction colors are deliberate approved adaptations. Tablet and missing/error states are derived layouts. No percentage or pixel-identical rendering claim is made.

## Visual and interaction consistency

The exact vector wordmark, Barlow Condensed, paper/slate/lilac/acid palette, angular actions and original hero art are consistent across reviewed surfaces. Character-specific colors support identity without becoming action/error tokens. Readable body text, full rules and keyboard focus take priority over a smaller source text size.

Campaign stages preserve source dimensions as minimum heights and grow under enlarged text. Existing verification covers 1440px, 720px and 375px public accessibility/reflow; the dedicated final text-growth checks include 200% text and fallback font. Tablet/compact and five battle sizes are also covered. Small-screen battle keeps the documented fallback rather than squeezing unreadable lanes.

Scoped GSAP entrances/feedback honor OS and app reduced-motion settings, hidden-tab interruption and unmount cleanup. Game state does not wait for animation callbacks. Public pages remain accessible during game-API failure. Missing art has bounded fallback/retry. Real assistive-technology testing remains an open acceptance item.

## Game correctness evidence

The art and Pen work changes no engine, API or immutable content logic. Correctness is supported by the existing tests and latest exact-commit CI, not inferred from screenshots.

| Invariant | Evidence |
| --- | --- |
| EVIL_DEPLOY → GOOD_PLAY → EVIL_TRICKS → COMBAT, legal card types and explicit targets | [phase tests](../../packages/game-engine/tests/phases.test.ts), [core ability tests](../../packages/game-engine/tests/core-abilities.test.ts) |
| Lane 1→5, EVIL/GOOD presentation order, both eligible attackers snapshotted before atomic lane damage | [combat tests](../../packages/game-engine/tests/combat.test.ts), [rules R08–R09](../RULES.md) |
| Armor before Shield, Poison/end-turn order, Pierce separate full-ATK hero packet | [effect tests](../../packages/game-engine/tests/effects.test.ts), [end-turn tests](../../packages/game-engine/tests/end-turn.test.ts) |
| Block response pauses/resumes at the correct combat lane; no second attack from movement | [block-response tests](../../packages/game-engine/tests/block-response.test.ts), [command persistence checks](../../apps/api/tests/commands.test.ts) |
| Bot/client do not receive hidden card order or unrevealed assignment | [projection tests](../../packages/game-engine/tests/projection.test.ts), [PvE HTTP tests](../../apps/api/tests/pve-http.test.ts) |
| Seed/replay consistency and invalid-intent state preservation | [replay tests](../../packages/game-engine/tests/replay.test.ts), [invariant tests](../../packages/game-engine/tests/invariants.test.ts) |
| Durable receipts, reload, recovery and immutable deck snapshots | [persistence tests](../../apps/api/tests/persistence.test.ts), [deck tests](../../apps/api/tests/decks.test.ts), [restore drill](../../apps/api/tests/restore-drill.test.ts) |
| Browser → API → DB → result/history/rematch for both factions | [full-match browser tests](../../tests/e2e/full-match.spec.ts), recovery/input/auth/tutorial checks in the same suite |

The chosen atomic lane-damage rule preserves both attackers' declared packets even if one receives lethal damage in that batch. The EVIL-then-GOOD visual order does not cancel the GOOD packet. This is the existing approved RULES.md behavior; the review did not alter it.

## Verification record

[GitHub CI run 39642006445](https://github.com/dattk2002/oath-front-tcg/actions/runs/39642006445), exact runtime commit `1194199`, completed successfully:

- Contract generation, typecheck, lint and production build passed.
- 82 unit/integration files, **662 tests passed**, including isolated PostgreSQL migration/restore and API checks.
- **97 browser tests passed; 2 intentional skips**: Firefox-without-Navigation-API case in Chromium, and opt-in hardware benchmark. No failed browser tests.
- Frozen Pen/derivative verification passed.
- Bounded 20-match HTTP workload passed its configured thresholds (500 warm actions). It is a runner-local Node/PostgreSQL workload, not a hosted capacity or free-tier SLA.

The design-only extension was checked separately:

- Fourteen unique hero IDs/names, seven per faction, compatible classes and 42 existing power references; fourteen unique signature designs.
- Starter templates match each hero's two classes and existing 30-card decks.
- Fourteen 1024×1536 RGBA files with true transparent regions, matching SHA256 hashes and no solid-alpha edge clipping.
- Local gallery verified at **1440, 1024 and 375px**: all fourteen images loaded, no horizontal overflow, keyboard disclosures work, zero console errors.
- Frozen Pen checker and **13 Python tests passed** after the contract addendum; Markdown links checked.
- After review identified incomplete lazy-image evidence, the focused production browser case for Home/roster/profile passed **1/1** across three sizes (nine captures). The mobile roster evidence now includes all six portraits. ESLint passed for the changed test.
- No full test-suite rerun was needed for the design-only files. The focused test change does not modify app behavior.

## Findings and disposition

| Finding | Severity | Resolution |
| --- | --- | --- |
| Vanta counterplay implied a durable/Shielded blocker could mitigate Pierce hero damage | Important content clarity | Corrected in roster, bible and gallery. Stun/removal before declaration or ATK reduction are counters; blocker durability does not absorb the separate hero packet. |
| Full-page mobile roster screenshot missed four off-screen lazy portraits | Minor evidence quality | Test now scrolls through image elements, waits for every image, returns to top and captures. Focused run passed; committed mobile evidence refreshed. This was not an established runtime loading bug. |
| Requested 8% source-art margin was not consistently generated | Minor art handoff | Actual solid bounds remain inside all canvases. Documented padded contain framing and future per-asset portrait-crop review; no claim of exact generated margins. |
| Fixed-height campaign overlap at enlarged text and missing hash validation | Previously resolved | Already corrected in runtime baseline `1194199`; regression and integrity checks remain in the suite. |

Independent review verdict: ready for scoped design delivery; no unresolved Critical or Important finding. The reviewer was read-only and did not rerun browser tests. The additional focused browser verification above was performed by the implementer.

## Fourteen-hero expansion boundary

The [character bible](../design/heroes-expansion/README.md), [gallery](../design/heroes-expansion/gallery.html) and [source manifest](../../assets/source/heroes-expansion-v1/manifest.json) are complete design artifacts. Fifty-six kit slots comprise forty-two reused class powers and fourteen proposed signatures. The fourteen signatures are not yet executable content.

The Pen contract records null mappings for all fourteen draft heroes because the frozen source has no corresponding frames. Existing six heroes, sixty cards, content versions, saved games and tutorials remain unchanged. Playable integration scope and whether to add cards are still awaiting the existing user answers. A future playable expansion must version content and cover server validation, engine/bot actions, storage/replay compatibility, presets, English UI mapping, thumbnail variants and balance testing.

## Reference and limits

The [official Marvel Rivals site](https://www.marvelrivals.com/) and [hero pages](https://www.marvelrivals.com/heroes/index.html) were inspected as presentation references: strong character silhouettes, prominent profiles, condensed headings and cinematic artwork. The official site markets a downloadable 6v6 shooter; it does not establish rules or browser-play requirements for this TCG. Original OathFront assets and approved Pen composition remain authoritative.

This review does not certify exhaustive engine/security behavior, physical-device performance, real screen-reader behavior, hosted production operation, human balance or optimized expansion decks. Those remain in the [release checklist](release-checklist.md). No manual deployment was performed. Concurrent background-music changes and generated `next-env.d.ts` were excluded from this task.
