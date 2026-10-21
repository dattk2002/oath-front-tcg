### Spec Compliance

- ✅ **Compliant for Task 4.** `useUiMotion` owns scoped GSAP contexts, image-load/decode continuation, hidden-document settling, and OS/game reduction (`apps/web/src/features/motion/use-ui-motion.ts:15`, `:25`, `:33`, `:58`, `:149`). Home, roster, phase, block, and native dialog callers are present (`apps/web/src/app/App.tsx:193`, `apps/web/src/features/hero/HeroSelect.tsx:20`, `apps/web/src/features/match/MatchShell.tsx:30`, `apps/web/src/features/match/BlockResponse.tsx:25`, `apps/web/src/features/match/PauseDialog.tsx:22`). The current spec explicitly requires immediate semantic dialog dismissal and focus restoration; the entrance hook does not delay close, and the existing `openDialog` cleanup closes and restores focus (`apps/web/src/features/match/keyboard.ts:74`).
- ✅ **Battle timing and content constraints hold in the diff.** Damage progress is linear with its unchanged 40% commit callback, while attack cues retain EVIL at 0 and GOOD at 80ms (`apps/web/src/features/match/motion/event-timeline.ts:82`, `:87`, `:88`, `:90`). Signature duration remains 550ms (`apps/web/src/features/match/motion/event-timeline.ts:47`). The seven bounded, deterministic family shapes and mirrored named palette are in `apps/web/src/features/match/rendering/vfx.ts:7` and `:64`; the scene resolves local anchors once per draw, reuses packet labels, and destroys them on clear/dispose (`apps/web/src/features/match/rendering/scene.ts:136`, `:278`, `:458`, `:559`). No immutable family definitions or transport/engine interfaces are changed in this package.
- ⚠️ **Separate acceptance gates:** Full production build/browser flow, 200% reflow, physical device/performance, and human play acceptance are assigned to Task 5/release by the brief. The Task 4 report gives focused development Chromium/WebGL results and makes no physical benchmark claim; those later gates cannot be established by this diff.

### Strengths

- The decoded-image continuation checks the live context after asynchronous completion, so an abandoned hero selection cannot restart its reveal (`apps/web/src/features/motion/use-ui-motion.ts:25`). Context reversion also restores final static DOM on dismissal, route change, reduction, and hide (`:33`, `:149`).
- The visual damage arrival, burst, and outlined label now align with the existing commit beat (`apps/web/src/features/match/rendering/scene.ts:227`, `:251`, `:278`); no cosmetic callback sends a command. Real scene label lifecycle and a focused clock regression are covered (`apps/web/tests/presentation.test.ts:542`, `apps/web/tests/rivals-motion.test.ts:7`).
- The focused browser test samples intermediate home/hero transforms, delayed Morrow art, reduction, native dismissal/focus, and compact/mobile overflow (`tests/e2e/rivals-motion.spec.ts:10`, `:132`, `:248`). The reported battle captures use visibility pause to inspect intermediate frames without changing production event durations (`tests/e2e/motion.spec.ts:249`, `:501`).

### Issues

#### Critical (Must Fix)

- None.

#### Important (Should Fix)

- None.

#### Minor (Nice to Have)

- `apps/web/src/features/match/motion/event-timeline.ts:144`: `reset()` flattens a card on OS reduction or tab hide, but the visibility and media listeners never replay a held `focused`/`hovered` state when motion becomes allowed again. A still-focused card remains flat until another focus event. Reconcile the stored state on resume, while keeping the static state when reduction is active. The browser check at `tests/e2e/motion.spec.ts:218` exercises reduction onset, not this return path.

### Assessment

**Task quality:** Approved.

**Reasoning:** The motion is local, bounded, cancellable, and aligned with the authoritative presentation clock. The only identified issue is a small feedback restoration gap; semantic focus and game behavior remain intact. No suites were rerun. Focused outside-diff reads checked the concrete reduced-motion observer, native dialog close/focus helper, and unchanged event-duration values; the scene draw hunk was cut mid-function, so its sprite-reset lines were read to verify cleanup.
