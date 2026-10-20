# Task 16 — Responsive and accessibility evidence

Scope: the approved Vietnamese battle layout, settings, renderer recovery, and the carried deck-builder browser-history fallback. Game rules, private projections, API contracts and the Task 15 eighty-pixel hero-selection artwork/retry contract are preserved.

## Layout and interaction

The battle uses a bounded two-column layout from 1024×640. Hero HP, energy, five lanes, hand selection and phase actions precede optional reading. A side rail contains tutorial instructions, inspection or the free-power decision. The block tutorial moves below the board while ordinary hand controls collapse to a list. Reserve powers and the battle log remain available through disclosures. At taller desktop sizes, unit/hand artwork grows without changing stat size.

At widths below 1024 or heights below 640, the gameplay fallback preserves the match and exposes a labeled five-lane reading list plus full own-hand/power text. It does not send surrender. Settings and deck management remain available. The reflow check uses 720×450 CSS pixels, equivalent to a 1440×900 viewport at 200% zoom; this is **not** a physical browser-zoom or assistive-technology acceptance result.

The normal account prompt follows gameplay; urgent session recovery remains prominent. Existing SessionRecovery/Pause/Result command recovery is retained. Modals retain focus trapping, Escape and focus restoration. The board uses real DOM controls over a decorative Pixi canvas. Input, labels, HP, costs and effects are never encoded only in artwork.

## Verification and limitations

- `tests/e2e/responsive.spec.ts`: element bounds at 1440×900, 1366×768, 1280×720, 1024×768 and 1024×640 with ten units and ten hand cards; 375px fallback; real tutorial G01/G02/G07; empty hand, pending command and failed renderer. Viewport screenshots accompany geometric assertions. Full-page screenshots alone are not accepted as fit evidence.
- `tests/e2e/accessibility.spec.ts`: settings focus/keyboard, full hand names/44px targets, axe WCAG A/AA scans, contrast tokens, equivalent 200% reflow, version-1 settings migration and Firefox browser-history compatibility.
- The pinned development-only `@axe-core/playwright` 4.14.0 was published on 2026-10-15. Official [Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing) recommends this integration and explicitly separates automated checks from manual/user assessment.
- Axe reports no violations in the recorded battle/settings/reflow scans. Its color-contrast checks remain **incomplete** where gradients prevent background inference (see the raw JSON). They have not been relabeled as passes. `contrast.json` independently measures the approved foreground/surface token combinations, including the lightest opaque HUD surface; the rendered screens were visually reviewed. These calculations do not constitute a screenshot pixel scanner.
- Vietnamese Noto Sans assets are local; captured titles, costs, HP, tutorial copy and dialog text include Vietnamese glyphs. The artifact screenshots provide visual evidence, not a general font certification.

## Browser history

Firefox 157.0 (Playwright-patched Ubuntu fallback build) was tested with the official `dom.navigation.webidl.enabled=false` preference; the test first asserts that `navigation` is absent. Back → Stay → reload retains the draft. A second Back → explicit Leave reaches the original deck list. Explicit Leave still clears the local draft as before. The fix restores the current Next history entry with `pushState` instead of overwriting the destination with `replace`.

This is a real Firefox engine compatibility configuration, not unmodified system Firefox 150, Chrome with an API stub, Safari, or a claim about every historical browser.

## External acceptance

`awaiting_external_input`: human screen-reader assessment (including pronunciation and announcement pacing), physical tablet touch, manual browser zoom at 200%, and Safari/Edge stable execution. Keyboard paths are exercised by real browser keyboard input in automation; an independent human keyboard pass remains pending. Scanner results do not replace these gates. Audio listening acceptance from Task 15 remains separate and pending.

See `evidence/task16/` and the task report for exact commands, source/build hashes, failures, final artifact boundary and benchmark data.
