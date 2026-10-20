# Ma trận nghiệm thu

Các case dưới đây là **đặc tả test cần triển khai**, chưa phải tests đã chạy. Fixture có thể dựng board trực tiếp cho unit test; trận end-to-end phải dùng deck30 hợp lệ. Txx ánh xạ task trong kế hoạch.

Phụ lục v1.1 mở rộng case hiện có: API-CONTRACT mục8 → AC16/22/24/25/26/34; TUTORIAL TU01–TU12 → AC35; SCREENS UX01–UX06 → AC29–AC33/AC37. Các mẫu JSON chỉ kiểm transport; tutorial fixtures dùng deck30 hợp lệ nhưng setup có nhãn luyện tập, không phải skirmish ngẫu nhiên.

| ID | Case / điều kiện | Kết quả bắt buộc | Task |
|---|---|---|---|
| AC01 | Catalog toàn bộ | 60 card, 38U/22T; 6 hero; 18 power; 8 Location; 3 token; ID duy nhất | T01 |
| AC02 | 6 deck mẫu / hero | Mỗi deck 30 lá, tối đa 2 bản/ID; 22 card hợp lệ/hero; từ chối sai phe/class | T01 |
| AC03 | Seed cố định | Setup/shuffle/power tái lập; bot RNG không đổi RNG deck/Location | T02 |
| AC04 | Location assignment | Chỉ lane 1/3/5; 3 ID khác nhau; ít nhất 1 BUFF/NEUTRAL; lane 2/4 NORMAL | T02 |
| AC05 | Reveal | Lane 1/3/5 mở ở turn 1/3/5 tương ứng; hidden không có effect | T02 |
| AC06 | Mulligan | Đổi 0–4 lá một lần; không rút lại instance vừa bỏ; power cấp sau xác nhận | T02 |
| AC07 | Phase permissions | Ác UNIT pha 1; thiện UNIT/TRICK pha 2; ác TRICK pha 3; power đúng pha | T03 |
| AC08 | Energy | Turn 1/10/11 có 1/10/10 mana; Desert chỉ phụ phí UNIT played; không tích dư | T03 |
| AC09 | Location entry | Forest/Frozen không hồi tố; token/move không kích entry; hidden không phụ phí | T03 |
| AC10 | 3/2 đấu 3/2 | Cả hai chết cùng pair; hero không mất HP; displayOrder ác trước | T04 |
| AC11 | Stun/Exhaust/ATK0 | Không đánh; vẫn nhận damage và chặn lane; Stun/Exhaust hết cuối lượt | T04 |
| AC12 | Pierce và block | Hero meter6 chặn hero packet; unit packet vẫn gây damage | T04 |
| AC13 | Shield + Armor | Damage1 gặp Armor1: Shield còn; damage3 gặp Armor1 + Shield: Shield mất, HP giữ nguyên | T03 |
| AC14 | Block meter | Đòn COMBAT dương thứ4 bị chặn; EFFECT/POISON/FATIGUE không charge; tối đa3 block | T04 |
| AC15 | Power grant/response | Nhận4 ID khác nhau; khay riêng; miễn phí chỉ power vừa cấp; giữ lại dùng1 mana đúng pha | T04 |
| AC16 | Response checkpoint | Reload BLOCK_RESPONSE giữ đúng power, giá0 và continuation lane; không cấp lần hai | T07,T11 |
| AC17 | Death trigger + lethal | Queue ổn định; hero0 không heal sống lại; hai hero chết trong root thì hòa | T05 |
| AC18 | Move trong combat | Không đánh hai lần; quân mới ở lane đã xử lý không đánh; lane sau dùng state mới | T04 |
| AC19 | End turn | Poison batch trước unit hooks và Spring; turn20 hòa sau effect nếu chưa có kết quả | T05 |
| AC20 | Hand cap/fatigue | Overdraw discard công khai; khay power độc lập; fatigue1/2/3; draw2 đúng thứ tự | T05 |
| AC21 | Pure/illegal | Illegal không đổi state/PRNG/seq; không mutate input; không NaN | T05 |
| AC22 | Projection leakage | Không lộ tay địch, deck order, seed, hidden Location hoặc power ID qua JSON/error/log | T05,T07 |
| AC23 | Replay nội bộ | Initialization + journal cùng version cho cùng hash/events; BOT row khôi phục RNG | T05,T06,T08 |
| AC24 | Duplicate/lost response | Cùng commandId/body chỉ apply một lần; receipt cũ không làm UI lùi; khác body409 | T07 |
| AC25 | Stale/two tabs | Cùng expectedRevision chỉ một action commit; action kia409, không tự áp lại | T07,T09 |
| AC26 | Crash/DB fail | Không lưu checkpoint/event/result nửa chừng; retry từ state đã commit | T06,T07 |
| AC27 | Bot fairness | Chỉ chọn legal action; view giống nhau thì bot Thường chọn giống nhau | T08 |
| AC28 | Bot budgets | Batch dừng giữa root ở giới hạn8 action/250ms CPU; pause dừng advance; guard chống softlock | T08 |
| AC29 | Browser full match | Hero → deck → mulligan → play → block → end → result → rematch | T09,T11 |
| AC30 | Input | Click/tap/drag/keyboard tạo cùng intent; target không hợp lệ không gửi lệnh | T09,T11 |
| AC31 | Animation | Cancel/unmount/reconnect không rò tween; reduced giữ kết quả; HP pair cập nhật cùng nhịp | T10 |
| AC32 | Builder | Lưu draft; validate30/30; chặn copy3; deck edit không đổi match cũ | T12 |
| AC33 | Auth/claim | Guest resume; Google login; merge idempotent; xử lý hai active match; logout revoke | T13 |
| AC34 | Ownership | Người B không đọc/ghi deck/match/history/receipt của A | T07,T13 |
| AC35 | Tutorial/settings | Đủ8 bước; skip/replay; music/SFX riêng; gesture unlock; khôi phục progress | T14 |
| AC36 | Asset failures | Không nhảy layout; fallback có tên; retry; preload không phụ thuộc hidden assignment | T15 |
| AC37 | Layout/a11y | Desktop1366×768/1440×900; tablet1024×768; fallback375px; zoom200%; keyboard/SR/reduced | T16 |
| AC38 | Performance | Đo frame/network/memory theo UI-MOTION; console không error; tải mục tiêu20 trận | T16,T18 |
| AC39 | Balance | Baseline900 trận, báo seed/version; playtest người thật; tests xanh không chứng minh balance | T17 |
| AC40 | Release/restore | Build lockfile; test migration/restore; retention giữ active data; hỗ trợ active versions | T18 |

## Ví dụ expected state để tránh test “chỉ phản chiếu code”

1. **Pair với Pierce:** EVIL 3/2 Pierce, GOOD 2/4; hero GOOD 20 HP, meter6. Sau pair: quân EVIL bị hạ, quân GOOD còn1 HP; hero GOOD vẫn20 HP; blocksUsed1, charge0, reserve tăng1, chờ GOOD response. Không tạo attack thứ hai.
2. **Volcano sau response:** Sau case1, GOOD giữ power; Volcano gây1 lên quân GOOD còn1 HP nên quân chết. Nếu power hồi4 HP trước đó, quân sống qua Volcano. Hai kết quả phải khác để chứng minh continuation đúng.
3. **Forest reveal:** Quân2/2 có ở lane3 từ turn2 không nhận buff khi Forest mở ở turn3. Quân2/2 chơi từ tay sau reveal trở thành2/3. Token1/1 summon sau reveal vẫn1/1.
4. **Stale intent:** Revision8, hai request khác nhau cùng expected8. Request A commit9; request B nhận409 + view9. Mana/card chỉ trừ cho A.
5. **Atomic lethal:** Hai hero đều1 HP; hai quân có ability “Khi bị hạ: gây1 lên hero địch” cùng chết trong một batch. Cả hai hero về0 nên hòa. Đây là fixture tổng hợp cho engine, không thêm card ngoài catalog.
6. **Hidden information:** Hai server state chỉ khác hidden lane5 và topdeck đối phương. Trước reveal, viewer chưa thực hiện action chạm draw: serialized view và legal actions của viewer phải giống nhau.

## Điều kiện chặn milestone

Sai luật, lộ thông tin riêng, mutation trùng, mất checkpoint đã commit hoặc UI trọng yếu không đọc được đều chặn milestone liên quan. Visual polish có thể tinh chỉnh nhưng animation không được thay luật. Release phải báo các check bỏ qua; “chưa đo” không được tính PASS.
