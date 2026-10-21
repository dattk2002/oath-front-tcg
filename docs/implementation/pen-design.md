# Pen design implementation

Source: [oath-front-tcg-design.pen](../design/pen/oath-front-tcg-design.pen), SHA256 `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`. The source bytes remain unchanged. [Contract](../design/pen/DESIGN-CONTRACT.md) and [approved scope](../superpowers/specs/2026-10-21-pen-design-implementation.md) distinguish actual Pen frames from the approved adaptation of existing game screens.

## Delivered surfaces

| Surface | Route / implementation | Design basis |
| --- | --- | --- |
| Home | `/`, `CampaignHome` | BXxLv, bec8B, vtHuB |
| Hero roster | `/explore/heroes`, `CampaignPage` | xaC80, ImQTb |
| Six profiles | `/explore/heroes/[heroId]`, `HeroProfile` | Six desktop/mobile profile pairs in contract |
| News and articles | `/news`, `/news/[slug]`, `EditorialPage` | BsnWN, mqwt0, x67YO7, g72q4 |
| Events and details | `/events`, `/events/[slug]`, `EditorialPage` | QXjQb, pNR5Q, di6Pk, c9F7A |
| Game features | `/game-features`, `GameFeatures` | Wcfik, ap90K |
| Playable game | Existing hero/deck/setup/match/history/dialog routes | Inherited layout with `game-theme.css` |

Exact vector logo, source artwork, Barlow Condensed and paper/slate/lilac/acid palette are shared. The 21 campaign derivatives/fonts have a source/hash/license manifest. All six original heroes, sixty cards and their numeric rules remain intact.

Play now resumes an active match or opens the native hero selector. Profile Choose deck preserves the selected hero and never replaces an active match. Public pages remain browsable during a game API outage. News and Events are visibly labeled mock content; no registration or real schedule is asserted.

## Intentional differences

- `/heroes` retains its gameplay meaning; public browsing has its own namespace.
- Readable rules/body copy uses 16px where Pen used 14px; small meaningful text is at least 12px. Navigation, focus rings, 44px targets and account/settings/history access remain usable.
- Mobile navigation shares current campaign destinations. Tablet and reflow are derived layouts where no frame exists. Small-screen battle retains its existing fallback.
- Missing editorial detail copy is labeled draft/mock. Missing artwork has a bounded fallback; profile art supports retry even when the image failed before hydration.
- Game screens preserve their existing layout and faction colors. Pen did not supply a new complete battle or deck layout.
- GSAP entrances last 300–480ms. Card feedback lasts 160ms; fine-pointer Home drift is bounded to 3px. CSS clips the decorative art only. Reduction, route changes and hidden tabs revert tweens and remove listeners. Game state never waits for these animations.

## Verification record

M1–M6 focused checks passed: 12 Python reader/derivative tests, seven campaign/editorial model tests, public entry/API outage, filters/details/404, artwork recovery, account disclosure, keyboard focus and reduced/interrupted motion. Public axe/reflow checks covered six surfaces at 1440, 720 and 375px. Existing game checks covered tutorial/auth, selection/deck/settings and dense ten-card/ten-unit boards at five sizes including 1024×640.

Representative source exports and browser captures were visually compared. This is close implementation fidelity, not a claim of pixel-identical Pen rendering. Final integration/review results are recorded below when complete.

## Remaining boundaries

No production deployment is part of this change. Physical devices, real assistive technology, new balance certification and human playtests remain separate release gates. Unrelated in-progress background-music changes and the user's local `next-env.d.ts` are excluded from design commits.

The later request for fourteen additional heroes is a separate expansion after this implementation, followed by another whole-app consistency/gameplay review. It must not be represented as already present in this frozen six-hero design snapshot.
