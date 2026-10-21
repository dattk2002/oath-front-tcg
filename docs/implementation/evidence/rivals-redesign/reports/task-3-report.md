# Task 3 — sixty-card illustration integration

## Outcome

Integrated original art for all 60 immutable card IDs: 38 real-alpha units and 22 opaque tricks. The deterministic exporter produced 158 bounded per-card WebPs, a complete 47-frame atlas at each battle quality, runtime/source manifests, review sheets and budgets. `resolveArt`, `artById`, `battleAssetRequests` and `AssetBundle.atlases` use the card override. All eight core terrain strips and the Rivals board remain unconditional; the atlas includes six existing hero identities and three unchanged token support frames. No core content, source-parity rule, wire shape, saved data, power art or terrain art changed.

The new art exposed two presentation issues. In collection cards, the grid-sized image extended below its 144px slot, hiding unit feet and trick scenes. A browser assertion failed with image bottom 890px against slot bottom 768px; the collection art slot was changed to block layout, and the assertion and responsive screenshots passed. On the desktop board, a 64px art region left the full-figure unit tiny in a 200×128 tile. A focused probe failed at 64px; the tile now reserves 88×88 for Pixi art, keeps the full name across its top, and places stats beside the figure. The final screenshot and probe show the full name and legible stats. The 1024×640 compact board remains in its existing layout with End phase within the viewport.

## Source, visuals and budgets

- 60 unique local PNG SHA256 hashes; 125,790,425 source bytes (119.96 MiB). Every ID has an exact prompt and per-ID image-generation record. `generation.json` and `visual-review.json` each list 60 completed entries. GC03 and V02 received targeted framing edits; prior source/prompt revisions are retained. P05/S01 wing extremities and S04 halberd were inspected and intact.
- I inspected all five final sheets (`units-1..3.jpg`, `tricks-1..2.jpg`) and individual 512px GC03, V02, P05 and S01 derivatives. The 38 silhouettes remain contained at card and small board scale; the 22 tricks show distinct focal events. No further crop or duplicate-subject correction was needed.
- Thumb: 256×256, 18,774–35,912 bytes. Inspect/cutout: 512×512, 52,078–107,842 bytes. Low atlas: 924×924, 456,874 bytes; high: 1820×1820, 1,322,566 bytes. Both contain 47 populated frames.

| Quality | Network entry transfer: atlas + board + eight terrain strips | Decoded RGBA allocation for those images |
|---|---:|---:|
| Low | 989,646 bytes | 11,796,544 bytes |
| High | 1,855,338 bytes | 21,631,040 bytes |

Both network entry sizes are below the 12 MB budget. Inspect files are requested only by their DOM surfaces. The decoded figures are uncompressed pixel allocation, not network bytes.

## Verification

- `python3 tools/assets/export-fivefold-cards.py`: completed, 60 cards / 38 units and the budgets above. `python3 tools/assets/inspect-fivefold.py`: passed source/export hashes, actual alpha, dimensions and populated atlas-frame checks.
- `pnpm exec vitest run tools/assets/tests/fivefold-export.test.ts tools/assets/tests/fivefold-complete.test.ts tools/assets/tests/rivals.test.ts tools/assets/tests/manifest.test.ts apps/web/tests/english-presentation.test.ts`: 5 files, 14 tests passed. The sample exporter test was observed red before implementation and green afterward. The complete-set test was red with the partial manifest and green after all masters arrived.
- Web/assets typechecks and changed TS/TSX ESLint passed; CSS Prettier check passed. `pnpm build:api` passed for the browser fixture. CI already installs pinned `Pillow==12.1.0` from `tools/assets/requirements.txt` before `pnpm test` (`.github/workflows/ci.yml:26,35`).
- Isolated browser fixture used API 3121 / UI 3200 and the existing disposable test DB. Five focused scenarios passed across initial and targeted reruns: all 60 images loaded through six hero collections, missing card art showed its English name and recovered without opening details, seeded trick hand/unit board art loaded, missing hero art recovered, and a failed battle atlas retried with all eight terrain requests. One initial retry assertion used a locator anchored to the fallback element that disappears on recovery; a stable title locator passed. Collection and board art geometry assertions were each observed red before their fixes and passed afterward. The fallback probe recorded eight terrain requests, zero page errors and zero unexpected console errors. The final six-collection probe also recorded zero page/console errors.
- I inspected 1440×900 desktop, 1024×640 tablet and 375×812 mobile collection screenshots, desktop and compact seeded board/hand screenshots, and the fallback probe's responsive captures. No horizontal overflow; names, stats, rules and controls remained legible. Playwright stopped its fixture servers. User UI/API services and the unrelated HuntingAlice service were untouched.
- `OATHFRONT_E2E_API_PORT=3121 pnpm exec playwright test tests/e2e/rivals-theme.spec.ts`: both Task 2 presentation/compact arena tests passed after the new card art and board layout. The guest POST 201 diagnostic assertion passed.

The full engine suite, production build and full game browser flow belong to Task 5. Physical device/touch and human playtest gates remain open.

## Commits and handoff

- `90a5b7b` — original sixty-card source, deterministic exports, provenance, reference and art direction.
- `c166b2f` — runtime art mapping, collection/board presentation, focused tests and implementation documentation.

After both commits, the working tree is clean. The final focused rerun passed: five Vitest files / fourteen tests, web and asset-tool typechecks, changed TypeScript/Playwright ESLint, and the independent export inspector. Nothing was pushed or deployed.
