# Tutorial theo từng bước — đề xuất v1

**Đề xuất:** tám bước chính cho phe thiện, chia thành bốn tình huống ngắn; thêm bài hai bước cho phe ác. Người chơi thực hiện thao tác thật trên engine. Thời lượng mục tiêu4–6 phút phần chính,1–2 phút phần ác; cần playtest mới xác nhận.

Lấy cảm hứng từ việc PvZ Heroes cho chơi cả hai phe với hero/power riêng, và deck mẫu gắn chiến thuật hero. Kịch bản, lời thoại và cách chia bài dưới đây là thiết kế mới của Ngũ Lộ, không phải bản chép tutorial PvZ Heroes. [EA giới thiệu hero hai phe](https://www.ea.com/games/plants-vs-zombies/plants-vs-zombies-heroes), [trailer Strategy Decks chính thức](https://www.youtube.com/watch?v=L5qlwZscq5U).

## 1. Cách học và ranh giới

- Home hiện “Học cách chơi” cho người mới; vẫn có “Chơi ngay”. Bỏ qua không khóa hero/card.
- Mỗi bài có một hướng dẫn ngắn, highlight đúng đối tượng và một kết quả nhìn thấy. Inspect, settings, pause luôn dùng được.
- Không phủ modal dài lên bàn khi cần chọn target. Panel hướng dẫn neo cạnh dưới, không che lane/hand đang học.
- Trạng thái chuẩn bị sẵn ghi rõ “Tình huống luyện tập”. Chuyển bài có nhãn, không giả vờ quân/HP tự đổi trong một trận thường.
- Skirmish dùng shuffle/random bình thường. Tutorial dùng scenario seed công khai, deck order/power order cố định và board setup theo manifest riêng.
- Sát thương, mana, phase, block, entry Location, targeting và death vẫn dùng RULES; không thêm bất tử, miễn mana hoặc sửa damage để ép thắng.
- Trong bước có thao tác bắt buộc, `legalActions` là giao của engine legality và tutorial allowlist. Một action đúng luật nhưng ngoài bài nhận `TUTORIAL_STEP_MISMATCH`; không sửa state.

## 2. Scenario và dữ liệu khởi đầu

Nguồn dữ liệu: [tutorial-v1.scenarios.json](contracts/tutorial-v1.scenarios.json). File này là **đặc tả fixture**, chưa phải code engine. Nó dùng handle dễ đọc như `G:GC01:1`; runtime map sang opaque InstanceId, không đổi wire contract.

Hai hero ở mọi bài: GOOD `H_G_BV` An Nhiên, EVIL `H_E_FX` Hắc Luyện. Deck nguồn `D_G_BV`/`D_E_FX`, mỗi deck30 bản. Với mỗi scene, lấy những bản đã chỉ định ra hand/board; phần còn lại vào deck theo ưu tiên draw trong manifest rồi thứ tự cardId/copy tăng dần. Token không trừ deck. Không có card thừa hoặc bản thứ3.

Power đầu: GOOD `P_V1`; EVIL `P_F1`. Thứ tự nhận GOOD: P_V1 → S_G_BV → P_B1 → P_V2; EVIL: P_F1 → P_F2 → P_X1 → S_E_FX. Đã nhận chỉ gồm power đầu ở mỗi scene mới. Đây là override setup của tutorial, không đổi cơ chế “không nhận trùng”.

Terrain mọi bài: lane1 Quiet Meadow, lane3 Ancient Forest, lane5 Healing Spring. Reveal theo global turn1/3/5; lane2/4 NORMAL.

| Scene | Thời điểm vào | Hand/board GOOD | Hand/board EVIL | Mục đích |
|---|---|---|---|---|
| A | Turn1 GOOD_PLAY; mana GOOD1, EVIL0; HP20/20 | Hand GC01,GC02,GC05,V06; board V01 lane4 | Hand trống; EC01 lane2 | Chơi quân, đọc mana, lane trống |
| B | Turn2 GOOD_PLAY; mana GOOD2, EVIL0; HP20/20 | Hand GC05,B01,V06,GC01; GC02 lane2, V01 lane4 | Hand trống; EC02 lane2, EC01 lane4 | Trick và damage pair |
| C | Cuối turn2 trước TURN_END; mana0/0; HP20/20 | Hand B01,GC02,GC05,V06; board trống | Hand trống; EC02 lane3 | Reveal turn3 và buff khi chơi từ tay |
| D | Turn4 COMBAT, trước pair lane1; mana0/0; HP GOOD10, EVIL20 | Hand trống; GC02 lane4; token Đèn Gác0/3 Khiên lane2 | Hand trống; EC01 lane1 | Block/power và reveal turn5 |
| E | Turn3 EVIL_DEPLOY; mana3/3; HP20/20 | Hand GC01; GC02 lane2 | Hand EC01,EC05,F01,F02; EC02 lane4 | Hai phase của phe ác |

Mọi quân dùng printed stats, full HP, không modifier trừ keyword in trên card; token có Khiên. Charge cả hai bằng0, used0, trừ GOOD ở scene D charge6. Scene C/D draw đầu lượt kế: GOOD GC01 bản1, EVIL EC02 bản còn khả dụng đầu tiên. Manifest ghi handle chính xác.

Counter lastRegularAttackTurn=null; fatigue0; discard trống; mulligan đã xác nhận; turn counters0. Scene chỉ chứa setup hiện tại, không giả tạo toàn lịch sử trước đó.

## 3. Tám bước chính

### G01 — Đặt quân vào lane

**Scene A.** Lời hướng dẫn: “Chọn Người Gác Đèn, rồi chọn lane2 để chặn Lính Tro.”

- Highlight GC01 trong tay và lane2 phía GOOD.
- Cho PLAY_UNIT(GC01 bản1, lane2); target khác không gửi hoặc bị tutorial reject.
- Sau action: GOOD mana0; GC01 1/2 lane2; hand3.
- Panel: “Quân cùng lane sẽ giao tranh. Quân vừa chơi có thể đánh ngay.”
- Nút “Tiếp tục” → G02; không tự chạy combat.

### G02 — Đọc năng lượng

Vẫn scene A. Lời hướng dẫn: “Bạn đã dùng hết1 năng lượng. Kỵ Sĩ Lá cần2 nên chưa thể chơi.”

- Highlight mana0/1 và cost2 trên GC02; card vẫn inspect được.
- Không gửi action giả để trừ mana hoặc thêm năng lượng.
- “Đã hiểu” gửi TUTORIAL_CONTINUE(G02); prerequisite mana0 và GC02 còn trong tay.
- UI giải thích disabled: “Cần2 năng lượng, hiện có0.” → G03.

### G03 — Lane trống đánh hero

Lời hướng dẫn: “Người Trồng Mầm ở lane4 không gặp quân địch, nên sẽ đánh thẳng hero.”

- Người chơi bấm “Kết thúc hành động” → GOOD_PLAY pass.
- Bot ở EVIL_TRICKS pass; ADVANCE giải quyết combat lane1→5, dừng ở TURN_END trước end-turn effects.
- Lane2: GC01 1/2 đấu EC01 2/1 → cả hai bị hạ.
- Lane4: V01 gây1 lên hero EVIL → HP19, charge2.
- Panel kết quả: “Lane4 gây1 sát thương lên hero. Lane2 đã chặn đường tấn công.”
- “Bài tiếp theo” → tải scene B/G04; thông báo “Tình huống2: dùng trick”.

### G04 — Trick giải quyết trước combat

**Scene B.** Lời hướng dẫn: “Dùng Tia Đèn lên Lính Tro ở lane4 để mở đường cho quân mình.”

- Cho PLAY_TRICK(GC05 bản1, target EC01 lane4).
- Cost2 → GOOD mana0; EC01 nhận2 damage và bị hạ; V01 không bị ảnh hưởng.
- Trick/UNIT bị hạ vào discard đúng owner; không chuyển phase vì chỉ chơi một lá.
- Panel: “Trick có hiệu lực ngay. Bạn vẫn đang ở pha Thiện.”
- “Tiếp tục” → G05.

### G05 — Hai quân trao đổi damage trong cùng nhịp

Lời hướng dẫn: “Kỵ Sĩ Lá và Gác Lò đều2 công/3 HP. Cả hai sẽ gây2 sát thương.”

- Người chơi pass; bot EVIL_TRICKS pass; chạy combat tới TURN_END.
- Lane2: GC02 và EC02 cùng còn1 HP. Ác wind-up trước, cả hai HP thay đổi ở shared impact beat.
- Lane4: V01 đánh hero EVIL từ20 xuống19, charge0→2.
- Panel: “Đòn ác hiện trước, nhưng quân thiện vẫn gây sát thương trong cùng giao tranh.”
- “Bài tiếp theo” → scene C/G06.

### G06 — Location mở và chỉ buff quân chơi sau đó

**Scene C.** Mở đầu: “Sắp sang lượt3: Location ở lane3 sẽ được mở.”

- ADVANCE chạy TURN_END2 rồi TURN_START3; mở Forest, refill3, draw đúng manifest; bot EVIL_DEPLOY pass.
- Quân EC02 đã ở lane3 từ trước vẫn2/3, không được hồi tố buff.
- Hướng dẫn: “Chơi Mầm Khiên vào lane3. Rừng Cổ Đăng tăng1 HP cho quân chơi từ tay vào đây.”
- PLAY_UNIT(B01 bản1, lane3) → quân1/2 + Khiên, GOOD mana2. Hero vẫn20/20.
- Panel so sánh: “Quân cũ giữ nguyên. Mầm Khiên mới nhận +0/+1.”
- “Bài tiếp theo” → scene D/G07. Có nhãn “Tình huống4: phản hồi block”.

### G07 — Block và lựa chọn superpower

**Scene D.** Banner: “Meter đang6/8. Đòn combat tiếp theo sẽ được chặn.”

- ADVANCE chạy pair lane1: EC01 2 công đánh hero GOOD; charge6→8→0; used0→1; hero GOOD vẫn10 HP.
- Cấp S_G_BV, mở response. Power nhận thật vào reserve; không chèn power sau response.
- Copy: “Bạn nhận Lời Thề Nảy Mầm. Dùng ngay miễn phí, hoặc giữ để dùng giá1 trong pha Thiện.”
- Hai nhánh đều hợp lệ:
  - Dùng ngay: chọn GC02 lane4; cấp Khiên và +0/+2 →2/5; hero GOOD10→12; mana vẫn0.
  - Để dành: reserve giữ S_G_BV; GC02 vẫn2/3; hero GOOD10. Giá hiển thị trên reserve trở lại1.
- Chỉ GC02 là target của bài; token Đèn Gác vẫn inspect để giải thích Khiên.
- Sau lựa chọn, dừng automatic ở checkpoint response đã đóng; “Tiếp tục” → G08.

### G08 — Reveal lượt5 và kết thúc hướng dẫn

- Sau TUTORIAL_CONTINUE(G07), ADVANCE tiếp tục đúng lane1 AFTER_LANE, các lane2–5, TURN_END4 và TURN_START5.
- GC02 lane4 gây2 lên hero EVIL →18 HP, charge2. Token lane2 ATK0 không đánh.
- Healing Spring ở lane5 mở tại đầu turn5; mana5, draw1 mỗi bên; bot EVIL_DEPLOY pass.
- Dừng ở GOOD_PLAY; không tự chơi power giữ lại. Nhánh dùng signature: GOOD12 HP; nhánh giữ: GOOD10 HP.
- Copy: “Location mở ở các lượt1,3,5. Lane2 và4 luôn thường. Bạn đã sẵn sàng chơi một trận.”
- Nút “Hoàn thành” → TUTORIAL_CONTINUE(G08), mark main tutorial completed, lifecycle COMPLETED, phase GAME_OVER, outcome NONE/TUTORIAL_COMPLETED.
- Kết quả hướng dẫn có “Chơi với bot”, “Học phe Ác”, “Học lại”. Không hiển thị Thắng, XP, thưởng hoặc win rate.

## 4. Bài bổ sung phe ác

Scenario riêng `tutorial_evil_v1`, scene E; humanSide=EVIL. Có thể mở từ settings mà không bắt buộc hoàn thành phần thiện.

### E01 — Triển khai và để dành mana

“Phe Ác chơi nhân vật trước. Chơi Lính Tro vào lane2, rồi kết thúc triển khai.”

- PLAY_UNIT(EC01 bản1, lane2), cost1; EVIL mana3→2.
- PASS_PHASE → GOOD_PLAY; tutorial dừng trước bot action để hiện “Bạn còn2 mana cho pha trick”.
- CONTINUE(E01) → E02; bot GOOD chơi GC01 bản1 vào lane5 rồi pass. Lane5 còn hidden nên quân1/2, không buff.
- Vào EVIL_TRICKS; EVIL vẫn2 mana. Không refill giữa phase1 và3.

### E02 — Trick sau khi đối phương triển khai

“Giờ bạn đã thấy quân của phe Thiện. Dùng Mũi Than lên Người Gác Đèn ở lane5.”

- PLAY_TRICK(EC05 bản1, GOOD GC01 lane5) → quân chết, EVIL mana0.
- Người chơi bấm “Kết thúc trick”; combat theo lane: EVIL EC01 lane2 chết, GOOD GC02 lane2 còn1 HP; EVIL EC02 lane4 đánh hero GOOD còn18 HP.
- Dừng TURN_END; “Hoàn thành” mark evilTutorialCompletedAt, outcome NONE/TUTORIAL_COMPLETED.
- Đây là bài giải thích thứ tự pha, không dùng luật first strike hoặc thêm mana cho bot.

## 5. Persistence và action gating

State tutorial gồm scenarioId, sceneId/chapterId, stepId, completedStepIds, stepState, sceneLoadOrdinal, scriptCursor và branch `USED | KEPT | null`. Private checkpoint lưu đủ; PlayerView chỉ projection trong API-CONTRACT.

TUTORIAL_CONTINUE chỉ chấp nhận đúng stepId hiện tại. Bước có gameplay cần đạt expected-state predicate rồi mới AWAITING_CONTINUE; G02/G08 là bước xác nhận thông tin, cho CONTINUE khi prerequisite đạt. Không dùng việc animation `onComplete` làm điều kiện trên server.

Scene load là một automatic root `TUTORIAL_LOAD_SCENE` trong journal, có scenario/scene/ordinal; reset gameplay theo manifest nhưng giữ matchId, revision, eventSeq, rootSeq và instance ordinal tăng. Instance ID không tái sử dụng giữa scene/restart. Replay nhận đúng manifest version và load ordinal; không tự tạo seed mới.

G01→G02→G03 dùng cùng A; G04→G05 cùng B; G06 dùng C; G07→G08 cùng D. E01→E02 cùng E. Chuyển scene reset board rõ ràng qua snapshot+TutorialAdvanced; không giả event CardPlayed cho quân đặt sẵn.

RESTART chỉ chapter hiện tại, reset các step trong chapter đó và script cursor; giữ completedStepIds của chapter trước; replay journal ghi scene load mới. Khi chapter có nhiều bước, quay lại bước đầu chapter. Không cho client yêu cầu load scene tùy ý.

SKIP ở bất kỳ bước chưa terminal → ABANDONED, reason TUTORIAL_SKIPPED, không tính thua và không mark completed. Có thể học lại bằng tạo tutorial mới. Reload giữ đúng bước/nhánh/pending response; skip không xóa deck người dùng.

Một principal vẫn chỉ có một active/paused match, kể cả tutorial. Nếu đang có skirmish, màn hình giải thích và cho “Tiếp tục trận”; không ngầm bỏ trận để mở tutorial. Sau tutorial terminal có thể tạo skirmish bình thường.

Bot tutorial chỉ chạy script đã liệt kê; mọi phase không ghi hành động đều PASS. Không dùng bot Dễ/Thường để quyết định trong bài cố định. Runtime fixture phải assert legality ở từng action; không legal thì báo lỗi scenario, không tìm target thay thế.

## 6. Acceptance cụ thể

| ID | Expected |
|---|---|
| TU01 | A sau G01: GOOD mana0, GC01 lane2 1/2, hand3 |
| TU02 | A sau G03: lane2 cả hai trống, EVIL HP19/charge2 |
| TU03 | B sau G04: EVIL lane4 trống, GOOD mana0; sau G05 hai quân lane2 cùng1 HP |
| TU04 | C reveal: EC02 giữ2/3; B01 played sau reveal thành1/2 + Khiên; mana2 |
| TU05 | D block: GOOD HP10, charge0, used1, S_G_BV cấp đúng một lần |
| TU06 | D dùng signature: GC02 2/5 + Khiên, GOOD12 HP; keep: GC02 2/3, GOOD10 HP |
| TU07 | D đến G08: turn5 GOOD_PLAY, Spring mở, EVIL18 HP; power giữ không bị tự dùng |
| TU08 | E phase1→3: mana2 được giữ; trick đánh GC01 lane5 2 damage, mana0 |
| TU09 | E cuối combat: GOOD18 HP, GC02 lane2 còn1 HP, EVIL EC01 bị hạ |
| TU10 | Reload/retry mỗi CONTINUE hoặc action không tăng step/grant/load hai lần |
| TU11 | Restart không trùng instance ID; skip không win/loss/completion; skirmish từ chối tutorial controls |
| TU12 | Main và evil completion độc lập; mọi thao tác có click/tap/keyboard; reduced motion giữ cùng expected state |

Các outcome trên được tính tay để author test; chưa có engine để xác nhận bằng chạy trận. T14 phải dựng fixtures, chạy cả hai nhánh G07 và đối chiếu TU01–TU12 trước nghiệm thu.
