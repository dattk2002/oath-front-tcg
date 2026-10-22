# Lobby UI delivery · 22 October 2026

The screenshot-led UI changes are implemented in the frontend. API, database, catalog, deck legality and match rules are unchanged by this work. Concurrent uncommitted API/auth/audio changes were preserved and excluded from these commits.

## Delivered

- Compact account disclosure in game navigation, with mounted authentication controls, Escape/focus return and automatic visibility for each distinct urgent message.
- Viewport-sized hero lobby; six equal cards per desktop page, four on compact pages, permanent Selected slots, full hero names and Play inside the profile. Play opens the existing opponent confirmation using that hero's preset. Browse decks retains the saved/custom path.
- Framed system insignia and 36 effect-specific power glyphs. Full power rules and counters open accessible dialogs.
- Hero deck covers, default-visible actual card contents, exact copy counts, energy/rarity/stats, card inspect and compact accessible energy curve. Unknown historical entries remain visible and included in totals.
- Scoped GSAP entrances, restrained artwork tilt and hero depth; static reduced-motion behavior, interruption/visibility/unmount cleanup. React Bits informed the interaction; no new dependency was added.
- [Design contract](../design/lobby-ui-contract.md) and machine-readable Pen extension updated. Original Pen SHA-256 remains `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`.

## Verification

- Four viewport checks: 1440×900, 1024×640, 768×1024 and 375×812. All twenty hero names/profile contents checked at 1024×640 and 375×812; 720×450 reflow fallback checked.
- Seven focused browser flows: equal lobby geometry/Play/real match creation; account/deck art/count/inspect; pointer/reduced-motion/power focus; all twenty heroes and axe; missing-art retry/slow image stability; exact hero powers/preset browsing; deck builder into battle with rarity/system labels.
- Ten account regression flows also exercised. The independent reviewer identified hidden new messages when an earlier urgent flag remained true; the signed-fixture regression reproduced it, and the content-sensitive observer fix passed. The history/open helper was stabilized. The paused-recovery fixture now waits for the visible modal instead of assuming a fixed fetch ordinal under development Strict Mode. Private-deck reads after logout explicitly assert 404 and only that exact URL's expected console error is allowed.
- 16 focused frontend unit tests passed (deck, English/elements presentation and motion).
- Frontend typecheck and scoped ESLint passed. Production Next build passed both in the working checkout and a clean export of committed UI, excluding concurrent audio/auth edits. The final account observer patch also passed frontend types/lint; hosted build verifies the final delivered revision.
- Fresh-context code and screenshot review found one Important issue, fixed above, no remaining Critical/Important findings and no deferred minors.

These are focused checks with cumulative green results after corrections, not a claim that the full repository suite ran in one invocation. No backend suite was broadened for a presentation-only change. Browser coverage uses Chromium/emulated sizes; physical-device and real screen-reader certification remain outside this pass.

## Review decisions

The supplied screenshots and existing approvals defined the scope; no additional approval round or branch was needed. Pen typography/palette and existing game contracts take precedence over generic style templates. Pagination fits the lobby without shrinking all twenty heroes onto one page; very short/zoomed layouts may scroll for accessibility. The Next development badge is hidden because it intercepted Previous heroes. Concurrent changes and backend correctness were excluded from this review and were not modified. No physical-device or assistive-technology certification is claimed.

## Visual evidence

- [Desktop hero lobby](evidence/lobby-ui/heroes-1440.png)
- [Long hero name on phone](evidence/lobby-ui/gravemarch-375.png)
- [Desktop deck library](evidence/lobby-ui/decks-desktop.png)
- [Phone deck library](evidence/lobby-ui/decks-375.png)
