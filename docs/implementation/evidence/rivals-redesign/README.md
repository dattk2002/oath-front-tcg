# Rivals redesign evidence

This 2026-10-21 archive follows the current [implementation](../../rivals-redesign.md), [QA/state contract](../../rivals-redesign-qa.md), [English ID catalog](../../../PRESENTATION-EN.md) and approved [spec](../../../superpowers/specs/2026-10-21-oathfront-rivals-redesign.md). It retains useful evidence from Tasks 1–6 without rewriting historical source/parity records. The original user reference Markdown in `docs/reference/` is unchanged.

## Review and decisions

- [Task reports and reviews](reports/) cover English ID presentation, six heroes/theme, all sixty original card illustrations, GSAP/Pixi choreography, and integrated verification. Task 1 includes its scoped rereview. [Task 5 report](reports/task-5-report.md) has exact gate commands, original failures and covering runs. [Task 5 review](reports/task-5-review.md) is retained verbatim; its minor protected-port naming correction is applied in the current implementation document.
- [Every current SDD `Ruling:` line](rulings.md) is copied verbatim with its stated cost. The first decision to retain old card paintings was **superseded** when the user approved new art for all 60 cards; the line remains for provenance.
- [Task 6 report](reports/task-6-report.md) records the [ready-to-paste Pen prompt](../../../design/pen/OATHFRONT-PEN-PROMPT.md) and [pending Pen ↔ Codex contract](../../../design/pen/DESIGN-CONTRACT.md). No actual design file or resolved Pen node mappings exist yet. The [Task 6 review](reports/task-6-review.md) and [scoped rereview](reports/task-6-rereview.md) retain the mapping findings and their resolution. [Delivery evidence](delivery.md) identifies the final reviewed source and verification scope. This archive is not production approval.

## Selected visual and browser evidence

| Set | What it shows |
| --- | --- |
| [Task 2 captures](selected/task-2-evidence/) | Home desktop, mobile deck, and hero 200% reflow from the theme stage. |
| [Task 3 captures](selected/task-3-evidence/) | Desktop/mobile collection anatomy and full-figure board card art. |
| [Task 4 captures/results](selected/task-4-evidence/) | Decoded hero reveal, seven effect silhouettes, shared damage beat and normal/reduced DOM/Pixi samples. |
| [Integrated initial production captures](browser-initial/) | Hero desktop/mobile, 1440×900 and 1024×640 boards, actual GOOD/EVIL guest flow snapshots, fallback and contrast outputs. New outputs originally written to historical task15/task16 paths were copied here, then those old paths were restored to `HEAD`. The three axe JSON outputs are retained only from the covering run. |
| [Covering production captures](browser-covering-prod/) | 200% reflow, atlas failure fallback, pending command, tutorial focus/inspect, three axe outputs and provider-only retry at mobile size. The focus geometry improved from 0.44px panel-border overlap in [the failed probe](browser-covering/task16/tutorial-skip-focus-1024.json) to 8px clearance in [the dev fix probe](browser-covering-dev/task16/tutorial-skip-focus-1024.json), then passed on the production rebuild. |

The curated archive remains bounded; the final fix adds about 1.2 MiB of captures, measurements and logs. It retains selected images and compact JSON results, rather than duplicated full screenshots, generated asset masters, browser traces or raw auth requests. Original source prompts/hashes remain in `assets/source/rivals-v2` and `assets/source/fivefold-cards-v3`; exported manifests and review sheets remain in the asset directories. Original interactive login secrets, cookies, provider payloads and cloud state are not in this archive.

## Final review fix wave

The [final fix report](reports/final-fix-report.md) records the compact stat regression (RED), the related desktop trick-cue failure, five development passes and six focused passes on the new production build. [New production captures and text-bound measurements](final-fix/task16/) keep this evidence separate from the original run; [RED geometry](final-fix/red/) and bounded command logs preserve both failures. The actual 1024×640 and 1440×900 production captures were visually inspected. The Pen baseline is reconciled to the committed fix while remaining `awaiting_design`; the [whole-change review](reports/final-review.md) and [final scoped rereview](reports/final-rereview.md) now record the findings and their resolution. The authorized push and its automatic CI are tracked separately by exact commit on GitHub.

## Gate and cost

The first production suite reported **82 passed, 4 failed, 2 skipped**. Three failures were stale assertions/routes after the English/art replacement; one found a compact tutorial focus clearance issue. The four affected cases passed on the covering production artifact after the scoped fixes. A targeted 200%/axe capture then passed. Exact details and build identity are in [Task 5's report](reports/task-5-report.md). No full engine, balance, load or physical benchmark was repeated for this presentation change. The [release checklist](../../release-checklist.md) still holds physical frame p95, balance, human playtests, physical device/touch/AT/Safari/Edge/audio checks and production acceptance.
