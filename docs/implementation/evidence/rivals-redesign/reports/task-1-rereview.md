### Finding Verdicts

- **Recovery failure status persists after successful reconnect** — ADDRESSED: `apps/web/src/features/match/recovery.ts:4` defines the exact messages; `apps/web/src/features/match/use-match.ts:145` clears only those messages after recovery, matching the failure writes at lines 154 and 203. `tests/e2e/block-recovery.spec.ts:545` checks the rendered message and its removal.
- **Preset names expose historical source copy** — ADDRESSED: `apps/web/src/content/english-content.ts:426` resolves preset IDs while preserving saved names; `apps/web/src/features/setup/PresetSetup.tsx:277` and `apps/web/src/features/deck/DeckScreen.tsx:117` use it for preset display and review, including preset-derived drafts.
- **History loss and hero resource line remain Vietnamese** — ADDRESSED: `apps/web/src/features/history/HistoryScreen.tsx:17` returns `Loss`; `apps/web/src/features/match/HeroPanel.tsx:77` renders `Hand`. Both have assertions in `apps/web/tests/english-presentation.test.ts:35`.
- **Artwork retry and lane action labels omit spaces** — ADDRESSED: `apps/web/src/features/match/ArtImage.tsx:3` builds `Retry art Briar`; `apps/web/src/features/match/Board.tsx:192` builds `Choose lane 1, legal target`. The new focused test checks both at `apps/web/tests/english-presentation.test.ts:57`.
- **Six-hero E2E expects historical hero and power names** — ADDRESSED: `tests/e2e/deck-builder.spec.ts:82` and line 87 resolve names by stable ID, retaining the four-power and signature checks.
- **Responsive E2E expects the wrong empty-hand sentence** — ADDRESSED: `tests/e2e/responsive.spec.ts:254` expects `Your hand is empty.`, matching the UI copy.
- **Empty artwork label falls back to historical manifest copy** — ADDRESSED: `apps/web/src/features/match/rendering/asset-manifest.ts:18` uses `Illustration` when the caller supplies no label; `apps/web/tests/english-presentation.test.ts:77` checks that boundary.
- **Phase E2E retains Vietnamese combat alternative** — ADDRESSED: `tests/e2e/match-foundation.spec.ts:178` expects `Combat`.

### New Breakage in the Fix Diff

None identified. The fix changes presentation helpers, UI labels, and E2E expectations without changing immutable rules, wire data, or custom saved names.

### Out-of-Scope Observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

**Checks reviewed:** The implementer report records 4 files / 25 focused tests passed, typecheck exit 0, lint exit 0, Playwright discovery of 81 tests, and `git diff --check` exit 0. The report and diff agree on the covered changes. No tests were rerun; browser execution and build remain deferred, so browser success is unverified.
