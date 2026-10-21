# OathFront — 21 prompt cho Pen.dev trong một file

**Cách dùng đề xuất:** chạy từng prompt trong cùng một cuộc hội thoại và cùng một file `.pen`; không dán cả bộ một lần. Prompt bằng tiếng Anh để đồng bộ UI; hướng dẫn sử dụng bằng tiếng Việt. File này tập hợp toàn bộ hướng dẫn và 21 prompt, chia nhỏ từ [prompt tổng](OATHFRONT-PEN-PROMPT.md) thành 21 bước có phạm vi rõ ràng, dựa trên [contract hiện tại](DESIGN-CONTRACT.md) và [JSON contract](design-contract.json).

## Chuẩn bị một lần

1. Mở repo `/home/bia/Works/Coding/oath-front-tcg` trong workspace mà Pen có thể đọc file. Nếu bề mặt Pen đang dùng không đọc repo, cung cấp các tài liệu/ảnh đầu vào được liệt kê trước khi chạy prompt; không chỉ gửi một ảnh screenshot.
2. Dán khối `text` trong **00** trước. Pen kiểm kê hiện trạng và tạo/tiếp tục **một** file editable, đích đề xuất là `docs/design/pen/oathfront-rivals.pen`. File này **chưa tồn tại** trong lần bàn giao prompt; không phải ID/source đã xác thực.
3. Dán từng prompt tiếp theo khi bước trước đã có output đúng phạm vi. Chỉ sửa màn hình/components liên quan, tái sử dụng những gì đã dựng. Các tên frame được đề xuất là nhãn để tổ chức, không phải Pen node ID.
4. Bước **04** là template theo batch: thay `CURRENT_GROUP: GC` lần lượt bằng `EC`, `B`, `F`, `V`, `P`, `X`, `S`. Mỗi lượt chỉ 6–8 card; tổng tám nhóm phải đúng 60 ID, không trùng. Các màn hình có thể dùng các card mẫu đã hoàn tất trong lúc gallery còn đang làm.
5. Chạy **20** sau cùng. Lấy file `.pen` thực, dependencies và inventory để Codex đối chiếu. Contract vẫn `awaiting_design` cho tới lúc đọc và xác minh file; một ảnh đẹp hoặc danh sách ID tự đặt không hoàn thành kết nối design–code.

Nếu đổi cuộc hội thoại, gửi lại 00 cùng file `.pen` đang làm và bảng tiến độ. Không yêu cầu tạo lại tài liệu từ đầu. Nếu tool không hỗ trợ một thao tác, ghi rõ phần chưa làm; không giả lập tool result, hash hay ID.

## Thứ tự prompt

| Bước | Phạm vi | Phụ thuộc |
| --- | --- | --- |
| 00 | [Nạp contract và giao diện hiện tại](#prompt-00) | Bắt đầu |
| 01 | [Token, typography và nền](#prompt-01) | 00 |
| 02 | [Thư viện control và trạng thái](#prompt-02) | 01 |
| 03 | [Card unit, trick và power](#prompt-03) | 02 |
| 04 | [Điền gallery card theo nhóm nhỏ](#prompt-04) | 03 |
| 05 | [Home và navigation](#prompt-05) | 02 |
| 06 | [Hero roster và bốn power](#prompt-06) | 03, 05 |
| 07 | [Deck list, builder và collection](#prompt-07) | 03, 04, 06 |
| 08 | [Thiết lập trận PvE](#prompt-08) | 06, 07 |
| 09 | [Mulligan bốn lá](#prompt-09) | 03, 08 |
| 10 | [Bàn đấu desktop](#prompt-10) | 03, 09 |
| 11 | [Bàn đấu compact và fallback](#prompt-11) | 10 |
| 12 | [Inspect, rules và combat log](#prompt-12) | 10, 11 |
| 13 | [Block và lựa chọn superpower](#prompt-13) | 03, 10, 12 |
| 14 | [Pause, reconnect và retry](#prompt-14) | 02, 10 |
| 15 | [Kết quả và lịch sử trận](#prompt-15) | 02, 10 |
| 16 | [Settings và accessibility](#prompt-16) | 02, 05 |
| 17 | [Tutorial hai phe](#prompt-17) | 10, 11, 14, 16 |
| 18 | [Guest, Google login và session](#prompt-18) | 02, 05, 14, 15 |
| 19 | [Storyboard GSAP và VFX](#prompt-19) | 06, 10, 11, 13, 14, 18 |
| 20 | [Rà soát và bàn giao cho Codex](#prompt-20) | 00–19 |

Mỗi prompt tập trung một màn hình hoặc một họ component. Những yêu cầu chung nằm ở 00 và contract: states default/hover/focus/active/selected/disabled/loading/error/empty/recovery, keyboard/pointer/touch, 44px targets, 8px gaps, contrast, long content và reduced motion. Mỗi bước phải ghi rõ trạng thái không áp dụng, thay vì mặc nhiên bỏ qua.

**Điểm nên xem lại trước khi đi tiếp (đề xuất):** sau 03 kiểm card anatomy; sau 06 kiểm nhận diện đủ sáu hero; sau 11 kiểm bàn đấu đủ 10 lá và ATK/HP; sau 18 kiểm state/recovery; sau 20 kiểm file và mapping inventory. Đây là điểm review thiết kế, không phải chứng nhận runtime.

## Giao diện làm mốc

Bộ prompt được đối chiếu với source hiện tại ở `5cc6da5`; các hash UI trong contract khớp và baseline CSS cuối là `0f5354d`. Bản kiểm tra pending contract đã xác nhận 24 token, 67 art identities, 12 surface families và 36 component relations. Không có thao tác tạo hay chỉnh `.pen` trong repo ở bước viết prompt này.

| Mốc giao diện | Ảnh tham khảo | Cách dùng |
| --- | --- | --- |
| Home | [Home desktop](../../implementation/evidence/rivals-redesign/selected/task-2-evidence/home-desktop.png) | Giữ cặp Briar/Cinder, nền paper/black chéo, headline lớn và CTA vàng. |
| Hero select | [Roster desktop](../../implementation/evidence/rivals-redesign/browser-initial/task15/heroes-desktop.png), [mobile](../../implementation/evidence/rivals-redesign/browser-initial/task15/heroes-mobile.png) | Roster 6 hero, stage nhân vật, bốn power, marker không che mặt. |
| Collection/deck | [Desktop](../../implementation/evidence/rivals-redesign/selected/task-3-evidence/collection-desktop.png), [mobile](../../implementation/evidence/rivals-redesign/selected/task-3-evidence/collection-mobile.png) | Card paper trên nền tối; rules riêng, quantity controls và deck summary. |
| Battle cuối | [1440×900](../../implementation/evidence/rivals-redesign/final-fix/task16/battle-1440-900.png), [1024×640](../../implementation/evidence/rivals-redesign/final-fix/task16/battle-1024-640.png) | Dùng ảnh **final-fix**: card có đủ stats/trick cue; không lấy layout hand bị cắt chữ từ ảnh browser-initial cũ. |
| Reflow/fallback | [200% reflow](../../implementation/evidence/rivals-redesign/browser-covering-prod/task16/zoom-200-reflow.png), [renderer fallback](../../implementation/evidence/rivals-redesign/browser-covering-prod/task16/empty-renderer-fallback.png) | Phân biệt lỗi renderer với small-screen fallback; kiểm source để giữ đúng hành vi. |

Các ảnh home/roster/collection là ảnh tham khảo từ các milestone trước; source hiện tại và contract có ưu tiên nếu có khác biệt. Không dùng ảnh chụp để suy ra một trạng thái chưa được thể hiện. Prompt yêu cầu đọc các component liên quan cho setup, dialog, tutorial, auth và recovery.

## Độ phủ contract

| Contract surface | Prompt chính |
| --- | --- |
| `shell_home` | 05 |
| `hero_roster` | 06 |
| `decks_collection` | 03, 04, 07 |
| `setup` | 08 |
| `mulligan` | 09 |
| `battle` | 10, 11 |
| `inspect_log` | 12 |
| `block_response` | 13 |
| `pause_recovery` | 14 |
| `results_history` | 15 |
| `settings_tutorial` | 16, 17 |
| `auth` | 18 |

00 kiểm inventory; 01–02 dựng nền/component; 19 giữ sáu nhóm motion mappings và bảy VFX families; 20 đối chiếu toàn bộ 36 quan hệ component, 67 art identities và responsive mobile/compact/desktop/reflow. Các bước 05–18 phải ghi rõ empty/loading/error/recovery theo contract ngay trong họ màn hình của mình; không để QA cuối tự đoán.

## Những chi tiết phải giữ từ bản hiện tại

- Đây là web game PvE. UI English; tên người dùng/deck do người dùng nhập giữ nguyên. Không thêm PvP, shop, ranked, rarity hoặc thay luật để đẹp layout.
- Nền đen/paper, action vàng, Barlow Condensed + Noto Sans. Dùng variable có thật; scale mới là đề xuất. Sáu hero/60 card đã có artwork: tái sử dụng, không vẽ lại hay thay bằng asset Marvel.
- 1440×900 và 1024×640 là kích thước battle được thiết kế. 375px giữ **fallback hiện có**, không tự khẳng định có portrait battle đầy đủ. Reflow 200% phải còn đọc và thao tác được.
- Compact hand ưu tiên chữ, có thể ẩn art trang trí. Đo cả bounds của **chữ bên trong** card, không chỉ card. Đủ 10 card, stats/trick cue, focus và End phase phải còn trong vùng dùng được.
- Escape phụ thuộc dialog: Pause có thể `RESUME`, hoặc hủy bước confirmation trước; Result dùng exit action rõ ràng và không đóng bằng Escape. Không áp dụng quy tắc đóng chung cho mọi modal.
- GSAP/Pixi timings là presentation. Offset 80ms và damage beat 40% không được biến thành luật đánh mới. Storyboard không chứng minh animation đã chạy hay đạt FPS.
- Chỉ làm design và notes trong Pen. Chưa sửa code runtime, biến môi trường hoặc deploy. File JSON contract giữ nguyên pending; Codex sẽ tính hash/đọc ID thật và kiểm xung đột sau khi nhận file.

## Output sau mỗi bước

Pen nên báo ngắn: frame labels đã tạo/cập nhật; reusable origins/instances đã dùng; state/viewport còn thiếu; khác biệt đề xuất với baseline; ID thật đọc được hoặc `unresolved`. Phần này là design notes, không phải chữ hiển thị trên giao diện game.

Sau bước 20, bàn giao: file `.pen` editable, dependencies ảnh/library, ảnh màn hình để review, inventory theo `repoPath + repoComponent` với origin/instance/override thực, variable/state/viewport/motion/asset mapping và danh sách chưa xác minh. Codex không được chuyển contract sang `implementation_ready` chỉ dựa vào prompt hoặc ảnh export.

---

<a id="prompt-00"></a>

## 00 — Nạp contract và giao diện hiện tại

**Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

```text
Start an incremental OathFront design in one editable .pen document. First read:
- docs/design/pen/DESIGN-CONTRACT.md
- docs/design/pen/design-contract.json
- docs/design/pen/OATHFRONT-PEN-PROMPTS.md, including its usage guide and baseline screenshots.
- docs/implementation/rivals-redesign-qa.md
- apps/web/src/content/english-content.ts

Inspect the current source/screenshots before drawing. If inputs cannot be read, report exactly what is missing and stop this step; do not invent UI or assets. Use the existing active OathFront document, or create docs/design/pen/oathfront-rivals.pen only if none exists. That is a requested destination, not an already supplied design.

Create only a Design Notes/inventory frame now: twelve contract surface families, their 36 component relations, required states, viewports and missing inputs. All subsequent prompts continue in this same document and reuse previous work.

Carry these rules into every step: OathFront / The Fivefold; Dawnward / Ashen Court; concise English UI; exact ID-keyed rules and user names preserved. Keep the current black/paper/yellow comic direction, Barlow Condensed/Noto Sans, six original heroes and all 60 card images. Preserve game mechanics, hidden information and recovery semantics. Improve hierarchy and spacing within this direction; record any departure from current UI as a proposal.

Text, controls and layout must stay editable. Use shared variables and reusable components. Apply every contract globalState where applicable; annotate inapplicable states. Document keyboard, pointer and touch, 44px targets, 8px gaps, contrast and reduced motion. Proposed frame names are labels, never fabricated Pen IDs. Do not edit application code or mark the repository contract ready. Stop after this inventory.
```

---

<a id="prompt-01"></a>

## 01 — Token, typography và nền

**Chạy sau:** 00. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/styles/tokens.css
- apps/web/src/styles/fonts.css
- apps/web/src/styles/rivals.css

Create only the Foundations board, using the contract's tokenMappings and proposedScaleMappings. Reproduce all 24 existing CSS custom properties as named design variables with their exact current values and an explicit CSS-to-Pen name table. New scale variables must be labeled proposals, not existing CSS tokens.

Show dark canvas, raised surfaces, warm-paper stage, ink, yellow actions, both faction accent pairs and error/focus examples. Use the dark faction ink variants on paper. Build type samples with Barlow Condensed 700/800/900 for display and Noto Sans for body/rules. Keep the home headline to two or three lines; provide readable dense text without copying the reference's 0px type.

Document spacing, restrained corners and angular decoration outside hit areas. Measure text contrast (4.5:1 normal, 3:1 large) and meaningful control boundaries (3:1) on actual surfaces. If measurement is unavailable, mark it unverified rather than asserting a pass. Keep decorative gradients separate from semantic colors.

Output editable swatches/type scales and a short usage table. Do not design whole screens in this step.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-02"></a>

## 02 — Thư viện control và trạng thái

**Chạy sau:** 01. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/styles/shell.css
- apps/web/src/styles/deck.css
- apps/web/src/styles/match.css

Create only shared control components: primary/secondary/destructive buttons, navigation item, labeled text field, search, select, checkbox/radio, range control, badge/status, empty/error panel and native-dialog visual shell. Reuse Foundations variables.

Provide default, hover, focus-visible, active, selected, disabled, loading, error and recovery variants where meaningful. Explain any inapplicable state. Loading must reserve geometry; errors need text and an explicit existing action. Include long labels and a wrapped user-entered name.

Give each component a full rectangular hit area of at least 44x44px and 8px separation from adjacent controls. Angled decoration must not cut off focus. Specify Tab/Enter/Space, native radio arrows, pointer/touch behavior, disabled behavior and screen-reader label intent. Do not invent one universal Escape rule: later dialog prompts preserve their own runtime behavior.

Document anatomy, spacing/type variables and allowed overrides. Create a small state sheet on dark and paper surfaces. Do not create separate bespoke buttons for each future screen.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-03"></a>

## 03 — Card unit, trick và power

**Chạy sau:** 02. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `decks_collection`, `battle`, `inspect_log`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/deck/CardCollection.tsx
- apps/web/src/features/match/Hand.tsx
- apps/web/src/features/match/InspectPanel.tsx
- apps/web/public/assets/fivefold-cards-v3/manifest.json
- packages/game-content/src/core/cards.ts
- packages/game-content/src/core/powers.ts

Build only the reusable card family, using a few real catalog examples before populating the gallery. Include Lanternkeeper (GC01), Bronze Shieldsmith (B03), Lantern Ray (GC05), and one actual hero power. Read numeric data from core definitions and English names/rules from english-content.ts, joined by stable ID.

Define collection, hand, board-unit and inspect variants. Preserve separate cost, name, artwork, keywords/rules, faction/class and unit ATK/HP slots. Tricks and powers must not acquire invented ATK/HP. Unit silhouettes must fit their art slot; trick focal events must remain visible. Rules remain exact text, never baked into the image. Name truncation must have a full-name inspect path.

Show affordable/unaffordable, selected, legal/illegal-target, focus, disabled/pending and missing-art/retry states. Quantity controls in collection cards are independently labeled actions and must not trigger card inspection.

Use the final current hand layout as the minimum readability baseline: dense cards may hide decorative art, but complete ATK/HP or trick cues must fit. Create reusable origins and instances with named variant axes; keep actual node IDs in design notes only after reading them from the saved document. Do not instantiate all 60 cards yet.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-04"></a>

## 04 — Điền gallery card theo nhóm nhỏ

**Chạy sau:** 03. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `decks_collection`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/public/assets/fivefold-cards-v3/manifest.json
- apps/web/src/content/english-content.ts
- packages/game-content/src/core/cards.ts

CURRENT_GROUP: GC

Populate only CURRENT_GROUP in the card gallery, reusing the card origins from step 03. Valid groups and exact counts are GC=6, EC=6, B=8, F=8, V=8, P=8, X=8, S=8. Run this prompt again with the next group; do not expand all groups in one response.

Join matching stable IDs across the manifest, core card definitions and English presentation. Costs, stats, kind and classes come from core; displayed names/rules come from english-content.ts. Use existing optimized image paths; do not generate replacements. Use UNIT/TRICK kinds to choose the component variant, never guess from an ID prefix. Show the complete illustration and rules in each collection instance.

Create a labeled gallery section and a coverage note listing every content ID placed in this batch, its actual image path and the reusable origin used. Reuse an existing instance for an already completed ID instead of duplicating it. Maintain a running total toward 60 unique cards, ultimately 38 units and 22 tricks.

Check names, values, silhouette cropping, readable rules and independent quantity controls. Save the same document. Stop after this group and report its count plus the next unfinished group.
```

---

<a id="prompt-05"></a>

## 05 — Home và navigation

**Chạy sau:** 02. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `shell_home`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/app/App.tsx
- apps/web/src/app/layout.tsx

Design only shell/home, beginning from the current home screenshot. Keep the black navigation, OathFront wordmark, warm-paper text panel, diagonal dark art stage, Briar/Cinder pair, faction strip and yellow primary action.

Use the existing “FIVE LANES. ONE OATH.” headline and source copy. Preserve Play now, Continue match, Learn to play, Settings, History and the existing account strip; login is optional for guest play. Avoid adding a store, ranking, pricing, social-proof section or new navigation destination.

Create desktop 1440x900 first, then compact 1024x640 and a 375px-wide layout. At 200% reflow, actions and text must remain reachable. Refine spacing and visual hierarchy while keeping recognizable current anatomy and unobscured character identities.

Add small variants for no active match, resumable match, loading, error/retry, guest and signed-in account. The account strip uses the shared auth placeholder, refined in step 18. Name each variant and note keyboard order, artwork fallback and the 480ms reveal intent. Do not redesign other screens.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-06"></a>

## 06 — Hero roster và bốn power

**Chạy sau:** 03, 05. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `hero_roster`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/hero/HeroSelect.tsx
- apps/web/src/features/hero/HeroInspect.tsx
- apps/web/public/assets/rivals-v2/manifest.json
- packages/game-content/src/core/heroes.ts
- packages/game-content/src/core/powers.ts

Design only hero selection and its power inspect, using the current six-tile roster beside the large warm-paper character stage.

Reuse Briar, Aster, Lumen, Cinder, Vesper and Morrow from their exact manifest IDs. Create six selected-state instances of one reusable stage, not six unrelated layouts. Keep full hero/title/classes, starting HP, existing strategy text, four exact powers and Choose deck. Read power membership and wording from current source/catalog; do not invent new superpowers.

Keep the selection marker off the face. Tile surface selects its native radio; arrows change selection. Artwork retry must not select another hero. Power tiles open a readable inspect state with exact cost, trigger and target rules.

Create desktop, compact and mobile/reflow arrangements. Show one missing-art state and a long power rule. Keep selection/name immediately readable while art loads; annotate a 300ms decoded-art reveal and 25ms power stagger with cancellation on rapid selection.

Output the shared roster/stage origins, six hero instances and one power-inspect family. Preserve space and focus clearance around Choose deck.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-07"></a>

## 07 — Deck list, builder và collection

**Chạy sau:** 03, 04, 06. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `decks_collection`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/deck/DeckScreen.tsx
- apps/web/src/features/deck/DeckList.tsx
- apps/web/src/features/deck/DeckBuilder.tsx
- apps/web/src/features/deck/CardCollection.tsx
- apps/web/src/features/deck/ManaCurve.tsx

Design only deck selection, builder, collection and deck review, following the current paper cards on dark canvas and right-side deck summary.

Use existing preset/custom deck choices, deck-name field, name/rule search, class/type/cost filters, 30-card progress and mana curve. Preserve the maximum of two copies and hero/class legality from the runtime. Include exact counts and text labels rather than color-only charts. Do not add rarity, crafting, paid packs or deck rules.

Reuse gallery instances for the selected hero's legal collection; the full 60-card art gallery is a design reference, not a claim that one hero can use all cards. Card surfaces inspect; independent +/− controls adjust quantity. Preserve Save deck and Save and continue behavior, including uncertain-save retry.

Draw desktop, compact and mobile layouts with full-width readable controls and scroll/focus clearance around the action bar. Include empty deck, no filter matches, underfilled/invalid, full 30, pending, saved, error/retry and long user-name variants.

Output only these deck-family frames and state annotations. Reuse controls/card origins; record deliberate layout changes from the current screenshot.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-08"></a>

## 08 — Thiết lập trận PvE

**Chạy sau:** 06, 07. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `setup`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/setup/PresetSetup.tsx

Design only the current PvE setup screen from PresetSetup, using the selected hero/deck, opponent hero, source-deck summary, Easy/Normal difficulty and existing start action.

Use real supported combinations from source. Preserve current legality and creation semantics; do not add PvP, ranked queues, campaign maps or a third difficulty. Keep chosen values visibly selected through a shape/text marker as well as color.

Create desktop, compact and 375px layouts. Show valid selection, invalid or unavailable source deck, create pending, failed request with explicit retry and a committed creation restored after reload. Pending actions must not suggest repeated submission or silently replace the original intent.

Use shared form/radio/button components with clear labels, keyboard order, touch targets, long deck-name wrapping and error placement. Represent navigation to the existing match/mulligan flow with annotations, not a working backend simulation.

Output one reusable setup composition with its state variants. Keep data values and action labels aligned to current source.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-09"></a>

## 09 — Mulligan bốn lá

**Chạy sau:** 03, 08. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `mulligan`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/match/MatchScreen.tsx
- apps/web/src/features/match/Hand.tsx

Design only opening-hand mulligan for the existing match flow. Reuse Hand/card components and the four-card starting hand, with keep/replace selection, selected count and Confirm mulligan.

Create none, some and all cards selected, pending confirmation and retry-after-failure variants. Use a persistent text/shape marker for replacement so the state works without color or hover. Keyboard and touch must select the same choices; dragging must not be required. Preserve exact card names, costs and rules.

Draw 1440x900 and 1024x640 layouts with confirm and inspection reachable. Represent the current 375px small-screen match fallback where runtime uses it, rather than inventing portrait match support. Include a 200% reflow note.

Do not reveal a hidden power before the runtime permits it or imply that animation draws extra cards. Annotate focus order, confirmation locking, reload recovery and reduced-motion presentation.

Output the mulligan variants within the same document. Do not move on to the combat board yet.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-10"></a>

## 10 — Bàn đấu desktop

**Chạy sau:** 03, 09. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `battle`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/match/MatchScreen.tsx
- apps/web/src/features/match/MatchShell.tsx
- apps/web/src/features/match/Board.tsx
- apps/web/src/features/match/HeroPanel.tsx
- apps/web/src/features/match/Hand.tsx
- apps/web/src/features/match/PhaseControl.tsx
- apps/web/src/features/match/BattleScene.tsx

Design only the 1440x900 battle layout, using the final-fix desktop screenshot rather than the earlier clipped-hand screenshot.

Keep the compact top bar, enemy/player hero HUDs, five lanes numbered left-to-right, shared Fivefold board, public location strips, unit slots, inspect column, hand, powers and End phase. Preserve exact phase/turn labels and current information visibility. Use real art and source-backed card data; illustrate both player factions without changing authoritative lane/combat order.

Create a normal board and a worst-case board with ten visible hand cards and ten units. Include Bronze Shieldsmith's long name and Lantern Ray's trick cue. Current desktop hand cards retain artwork with a 48px image row and 32px summary row inside the 144px card. You may propose refinement only if complete text, targets and actions still fit. Board-unit art uses the current 88x88 region.

Show empty/occupied, selected/affordable/unaffordable and legal/illegal-target examples with readable reasons. Keep all essential information independent of particles and hover. Preserve distinct HP, block and energy.

Output layout and reusable HUD/lane/hand instances; leave compact adaptations to step 11 and detailed overlays to later steps.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-11"></a>

## 11 — Bàn đấu compact và fallback

**Chạy sau:** 10. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `battle`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/styles/rivals.css
- apps/web/src/features/match/MatchScreen.tsx

Adapt only the completed battle frame to 1024x640 and the current 375px fallback, plus a 200% reflow study.

Use the final-fix compact screenshot. All five lanes, ten hand cards, ten units, powers and End phase must remain usable. The current dense hand uses 88px-tall cards with a full-width 42px summary row; decorative hand art is hidden at this breakpoint. Preserve this readability outcome. Complete ATK/HP and the three-line trick cue must fit inside the card and viewport; do not validate only the outer rectangle. Long titles may clamp only with the existing full inspect path.

Keep 44px targets and 8px gaps. Collapse secondary art before shrinking essential text or pushing primary actions below the viewport. Annotate overflow/scroll containers and focus clearance.

For 375px and narrow reflow, reproduce the existing small-screen match fallback and its current readable information/navigation/recovery actions. Do not design a newly playable portrait five-lane board. Check current MatchScreen behavior if the screenshots are ambiguous.

Output only responsive variants and measured layout notes, linked to the desktop component origins.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-12"></a>

## 12 — Inspect, rules và combat log

**Chạy sau:** 10, 11. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `inspect_log`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/match/InspectPanel.tsx
- apps/web/src/features/match/BattleLog.tsx
- apps/web/src/features/match/ArtImage.tsx

Design only the inspect panel and grouped battle log in the existing battle shell.

Show full long names, exact rules, keywords/status descriptions, target requirements and current source-backed statistics. Distinguish a hand card's printed data from a deployed unit's current data; do not imply that hidden values are visible. Tricks do not receive fake ATK/HP. Use current ArtImage fallback/retry and reserve its layout footprint.

Create unit, trick and power inspection examples; no selection, long-content scrolling, missing art, loading and error/retry variants. The log must preserve current grouping, pagination and empty state. Keep readable event order and faction labels without one live announcement per particle.

At desktop, align to the existing inspect column. At compact size, prioritize full rules over decorative art. For narrow layouts, use only the existing supported inspect/fallback access path. Focus and complete rules must remain reachable at 200% reflow.

Output these component/state frames with semantic heading, keyboard, pointer and touch annotations. Do not invent a new combat log event or target action.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-13"></a>

## 13 — Block và lựa chọn superpower

**Chạy sau:** 03, 10, 12. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `block_response`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/match/BlockResponse.tsx

Design only the existing block-response decision and target-selection states from BlockResponse.

Show incoming context, the exact offered power, its cost/free-response or signature information, Use now and Keep for later. Read current rules and power data from source. Do not expose other hidden powers, invent a reroll, add a countdown or change when the offered power is available.

Create decision, targeting, unavailable-target and pending-action variants at desktop and compact sizes. Show how keyboard focus reaches the choice and then legal targets; pointer/touch must follow the same intent. Make unavailable reasons explicit, not only gray. Provide a narrow/reflow treatment consistent with the current match fallback.

Reuse the power card and dialog/panel components. Preserve clear focus visibility and complete rules with long descriptions; effects must not obscure the choice. Annotate current dismissal/back behavior after reading the component rather than assuming every dialog closes on Escape.

Output only this decision family and its interaction notes.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-14"></a>

## 14 — Pause, reconnect và retry

**Chạy sau:** 02, 10. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `pause_recovery`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/match/PauseDialog.tsx
- apps/web/src/features/match/RecoveryControls.tsx
- apps/web/src/features/auth/SessionRecovery.tsx

Design only Pause and match recovery states, retaining the current board underneath where runtime does.

Include paused/resume, surrender or tutorial-skip confirmation, offline/reconnect, snapshot failure, stale revision, uncertain command retry, expired-session renewal, unavailable storage and missing-atlas retry. Reuse shared warning/error controls; preserve exact current action choices and retained intent. Do not turn reconnect or animation completion into automatic command replay.

Preserve actual Pause Escape behavior: submit RESUME only when allowed; first cancel a surrender/skip confirmation step; disabled Pause cannot resume. Other recovery surfaces retain their own source behavior. Native close/focus restoration must not wait for decorative exit motion.

Create desktop/compact variants and a scrollable narrow/reflow treatment. The focused control must stay visible; status text and recovery action must remain understandable without color. Keep unavailable-storage warnings readable so a user does not infer that reloading is always safe.

Output only these recovery frames plus a concise state/action table. Session/account visual details reuse the auth family refined in step 18; do not create a different login mechanism.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-15"></a>

## 15 — Kết quả và lịch sử trận

**Chạy sau:** 02, 10. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `results_history`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/match/ResultDialog.tsx
- apps/web/src/features/history/HistoryScreen.tsx

Design only existing result, result detail and match history surfaces.

Use the current win/loss/draw summaries, deck review and rematch actions. Keep outcome, reason, hero/faction and available statistics tied to actual source data. Preserve long deck/account names and the existing empty, loading, error/retry and unavailable-record states. Do not invent ranks, rewards, currency or performance statistics.

Result intentionally prevents Escape dismissal; provide its explicit existing exit actions. Preserve pending rematch, expired-session recovery and uncertainty messaging so the design does not suggest issuing a replacement create operation.

For history, make the item surface activate its one primary destination through a semantic named link/button, retaining any native table/list structure. Secondary controls remain independent.

Create desktop, compact and mobile/reflow versions. Reuse the shared modal, status, typography and button families; reserve space for long content and keep focused actions reachable.

Output result variants and history/detail frames only, with exact close, back, retry and rematch annotations.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-16"></a>

## 16 — Settings và accessibility

**Chạy sau:** 02, 05. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `settings_tutorial`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/settings/SettingsDialog.tsx

Design only Settings as the current native dialog. Read exact control labels/options from SettingsDialog: mute, music/effect volume, reduced-motion and VFX preferences, tutorial entry actions and existing close behavior. Do not add unrelated graphics, account or keybinding settings.

Use shared checkbox, range and button components. Show normal, changed/persisted, unavailable-audio and device-storage-failure variants with existing warning copy. Values must remain visible as text; keyboard users must operate native sliders and controls without drag. Reserve warning space without hiding the close action.

Draw desktop/compact and 375px variants with internal scrolling where needed. Keep 44px hit areas, 8px gaps, visible focus and 200% reflow. Annotate focus entry, Escape/close and focus return from current source.

Show a small note connecting OS/game reduced-motion choices to static/short-fade presentation, not to removal of game feedback. The Pen mockup does not prove audio or motion behavior works.

Output only Settings and its state sheet. Tutorial content itself belongs to step 17.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-17"></a>

## 17 — Tutorial hai phe

**Chạy sau:** 10, 11, 14, 16. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `settings_tutorial`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/tutorial/TutorialOverlay.tsx
- apps/web/src/features/tutorial/tutorial-controller.tsx

Design only the existing Dawnward and Ashen Court tutorial overlays within the already designed match shell.

Read the current tutorial controller and immutable tutorial content through the English presentation. Use exact existing steps, instructions, guided actions and both power branches. Reuse real board/card components rather than inventing a separate campaign or new lesson mechanics.

Show the step/instruction panel, enabled/disabled guided actions, card/power inspect, Skip tutorial confirmation, completion and pause/reload/recovery states. Make the next permitted action clear with a label/shape as well as color. Essential instruction must remain readable with reduced motion and without hover.

Create desktop and compact examples, including the worst compact-height step. Keep the focused Skip tutorial action completely clear of the scroll-panel border and footer; this was fixed in the current implementation and must not regress. At narrow width, preserve the existing match fallback and tutorial entry behavior.

Output overlay origins, per-faction step/branch inventory and representative state instances. Mark any step not yet drawn explicitly; do not declare both tutorials complete from one screenshot.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-18"></a>

## 18 — Guest, Google login và session

**Chạy sau:** 02, 05, 14, 15. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `auth`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/auth/AuthPanel.tsx
- apps/web/src/features/auth/MergeConflictDialog.tsx
- apps/web/src/features/auth/SessionRecovery.tsx

Design only the current account strip and auth/merge/session surfaces from the mapped components.

Start from guest play with optional Sign in with Google, then signed-in account/sign-out, claim pending/error, merge-conflict choices, expired session, logout and provider-only sign-out retry. Preserve existing action labels and user-entered account names. Use safe sample names; do not request or display real credentials, tokens or provider secrets in the design.

Keep the current account-strip/dialog architecture rather than inventing password registration, subscriptions or a forced-login landing page. Distinguish app-session logout from provider-only retry: retry must not imply revoking a newly created guest session. Retained game/deck intent and existing recovery notices must stay understandable.

Create desktop, compact and mobile/reflow states, including long account text and unavailable storage. Modal controls must remain reachable and independently labeled. Read each source component's close/cancel behavior instead of applying one blanket Escape action.

Output only these auth frames and state transitions. Represent Google navigation as an annotation; no live OAuth connection is part of this design prompt.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-19"></a>

## 19 — Storyboard GSAP và VFX

**Chạy sau:** 06, 10, 11, 13, 14, 18. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- apps/web/src/features/motion/use-ui-motion.ts
- apps/web/src/features/match/motion/event-timeline.ts
- apps/web/src/features/match/rendering/vfx.ts

Create only a motion handoff board for the existing screens/components; reuse their instances and do not rearrange the screens.

Annotate start/end frames, timing, affected layers, cancellation and reduced-motion counterpart: home 480ms; decoded hero 300ms with 25ms power stagger; panels 240ms; phase 180ms; reversible card hover/focus 120ms. Controls/names remain readable during loading; rapid selection must cancel the old reveal.

For battle, read exact event/reduced budgets from event-timeline. Preserve the 80ms EVIL-before-GOOD anticipation offset, shared damage commit at 40%, 550ms signature and 900ms ceiling. These are cosmetic timings, not new game mechanics. Storyboard kinetic, shield, growth, prism, ember, ink and veil families with bounded accents that do not cover HP or actions.

Show normal, reduced/low-VFX, paused/hidden, interrupted and reconnect-fast-forward treatments. Native dialog behavior must not wait for an exit animation. GSAP owns choreography and Pixi owns decorative battle rendering; no timer-driven game action, continuous particle flood or marketing scroll-pinning on the board.

Output annotated cue frames and a timing table, not a claim that a static .pen file implements or benchmarks animation.

Apply the contract's applicable states and keyboard/pointer/touch requirements. Save the same document; report frame labels, reused components, proposed departures and unresolved items. Report actual Pen IDs only after readback. Stop after this scope.
```

---

<a id="prompt-20"></a>

## 20 — Rà soát và bàn giao cho Codex

**Chạy sau:** 00–19. **Cách dùng:** copy khối bên dưới vào cùng cuộc hội thoại Pen.

**Contract scope:** `shell_home`, `hero_roster`, `decks_collection`, `setup`, `mulligan`, `battle`, `inspect_log`, `block_response`, `pause_recovery`, `results_history`, `settings_tutorial`, `auth`.

```text
Continue the same OathFront .pen from step 00 and follow its baseline rules plus docs/design/pen/DESIGN-CONTRACT.md. Reuse prior variables/components; modify only this step's frames and shared dependencies explicitly required here.

Read these current inputs for this step:
- docs/design/pen/design-contract.json
- docs/design/pen/DESIGN-CONTRACT.md

Audit the same completed OathFront document; do not redesign everything in this step. Read the current contract's twelve surfaces, 36 component relations, global/required states, four responsive requirements, six motion groups and 67 hero/board/card identities. Produce a coverage table marking drawn, missing or inapplicable-with-reason. Resolve bounded visual inconsistencies; list any remaining work explicitly.

Check exact English copy, art/name pairing, all 60 card instances, contrast, hit areas, focus, per-dialog Escape, long content, retry/error states and normal/reduced motion. Check final compact/desktop hand text bounds, ten cards/ten units and reachable End phase. Show mobile fallback rather than a fictional portrait battle. Do not infer browser, physical-device or release acceptance from drawings.

Save the real editable .pen and its required local image/library dependencies. Export representative screenshots for review if the available Pen surface supports it. Report the actual file version, frame/variable/component origins, instances and overrides by reading the saved design. Map those facts to repoPath + repoComponent and logical surface/state/viewport IDs in a separate handoff inventory. Unknown IDs, hashes or revision evidence must remain explicitly unresolved, never guessed.

Leave docs/design/pen/design-contract.json unchanged at awaiting_design. Codex must inspect the real file, compute its byte hash, reconcile repository inputs and review conflicts before updating mappings/readiness or changing application code. Deliver file location, inventory, screenshots and unresolved items; stop.
```
