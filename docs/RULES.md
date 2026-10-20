# Luật chơi v1

Đọc cùng [Effects](EFFECTS.md), [Content](CONTENT.md), [Acceptance](ACCEPTANCE.md).
ID luật `R01–R22` dùng trong test và kế hoạch. Toàn bộ số liệu là baseline để playtest.

## R01 — Thành phần trận

Một người đấu một bot, chọn hero bất kỳ; đối thủ luôn phe đối diện. Mỗi bên có hero 20/20 HP, deck 30 lá thường, tay bài tối đa 10 lá, khay superpower riêng tối đa 4 lá, discard và 5 ô quân. Mỗi ô chứa tối đa 1 quân của bên đó. HP quân bị mất được giữ qua lượt. ATK tối thiểu 0. Hero không đứng trong lane và không tự đánh.

Global turn là một vòng gồm cả hai phe và combat, không phải một pha của một người. Tối đa 20 global turn. Năng lượng riêng mỗi bên; lượt t có max=min(t,10), hồi đầy đầu lượt. Mana còn lại từ pha 1 của phe ác dùng được trong pha 3 cùng lượt, nhưng không qua lượt mới.

## R02 — Deck, class và hero

Deck có đúng 30 bản card thường, tối đa 2 bản của một ID. Chỉ gồm card chung của phe và card của 2 class hero. Không đưa hero/power/token/Location vào deck. V1 không có rarity làm thay đổi sức mạnh, “unique card”, ban list hay yêu cầu sở hữu; toàn bộ core mở sẵn. Server vẫn xác thực membership, phiên bản và copy limit.

Một match pin `rulesVersion`, `contentVersion`, `locationVersion`, `botVersion`, 2 hero và 2 deck snapshot bất biến. Sửa deck sau đó không làm thay đổi match.

## R03 — Khởi tạo và mulligan

1. Server xác thực cấu hình và tạo seed bí mật; xáo 2 deck; chọn/đặt 3 Location theo R05.
2. Mỗi bên rút 4 lá thường. Chưa reveal Location nào. Phe/hero đối thủ và danh mục 4 power có thể nhận là công khai.
3. Người chơi chọn 0–4 lá muốn đổi, xác nhận đúng một lần. Các bản bị đổi được tạm loại; rút đủ số thay từ deck còn lại rồi trả các bản bị đổi về deck và xáo. Có thể rút bản thứ hai của cùng card ID, không phải đúng instance vừa bỏ. Bot cũng mulligan một lần theo policy.
4. Mỗi bên nhận 1 trong 4 power đều xác suất; không được mulligan power. Chỉ chủ sở hữu biết power đã nhận.
5. Bắt đầu global turn 1. Không rút thêm lá thường ở lượt 1.

Tay ban đầu không thể đầy; mọi draw sau đó tuân R14. Client không được xem kết quả mulligan rồi đổi tiếp.

## R04 — State machine

`MULLIGAN → TURN_START → EVIL_DEPLOY → GOOD_PLAY → EVIL_TRICKS → COMBAT → TURN_END → TURN_START` hoặc `GAME_OVER`.

`BLOCK_RESPONSE` là cửa sổ con của combat, không phải global phase mới; giữ continuation của lane hiện tại. `PAUSED` là cờ lifecycle, không tự đổi phase.

| Pha | Ai hành động | Hành động hợp lệ |
|---|---|---|
| EVIL_DEPLOY | Ác | Chơi UNIT; pass; inspect; pause; surrender |
| GOOD_PLAY | Thiện | Chơi UNIT/TRICK, power đang giữ; pass; inspect; pause; surrender |
| EVIL_TRICKS | Ác | Chơi TRICK, power đang giữ; pass; inspect; pause; surrender |
| COMBAT | Engine | Tự xử lý lane 1→5 |
| BLOCK_RESPONSE | Chủ hero vừa block | Dùng đúng power vừa nhận hoặc giữ; inspect/pause/surrender |

Người giữ phase có thể chơi nhiều hành động hợp lệ đến khi pass. Không có reaction stack/counterspell tự do. Chơi trick/power giải quyết xong mới nhận hành động tiếp. Một power tạo token vẫn là TRICK; token xuất hiện qua effect, không cho phép chơi UNIT thường ở EVIL_TRICKS.

## R05 — Location

Chọn 3 ID khác nhau trong 8 Location; mỗi bộ ba hợp lệ có xác suất như nhau; sau đó hoán vị 3 ID đều xác suất vào lane 1/3/5. Hợp lệ khi có ít nhất 1 `BUFF` hoặc `NEUTRAL`; `HAZARD`, `CONTROL`, `COST` đều tính là bất lợi. Đây là lấy mẫu tập con trước, hoán vị sau, không dùng vòng reroll thiếu giới hạn.

Location cố định cả trận, tác động đối xứng. Lanes 2/4 luôn `NORMAL`. Hidden lane chơi được; không effect, không phụ phí trước reveal. Reveal lane 1 tại đầu turn 1, lane 3 tại đầu turn 3, lane 5 tại đầu turn 5; trước energy/draw. Reveal cùng một event sequence cho người và bot; thời gian hiển thị vật lý có thể khác, không yêu cầu cùng mili giây.

Entry buff áp dụng chỉ khi `PLAY_UNIT` được chấp nhận sau reveal, không hồi tố. `SUMMON_TOKEN` và `MOVE_UNIT` không phải `PLAY_UNIT`; không kích hoạt entry buff/exhaustion hay phụ phí. Aura/combat modifier áp dụng cho mọi quân đang ở lane active, dù có mặt trước reveal. Không power nào được thay Location, lịch reveal hoặc loại terrain.

## R06 — Đầu lượt

Tăng turn; reset counter “mỗi lượt”; reveal theo lịch và xử lý onReveal (core không có onReveal gây damage); refill energy cả hai; từ turn 2 thực hiện draw bắt buộc cho cả hai. Hai damage fatigue bắt buộc, nếu cùng phát sinh, thuộc một batch để có thể hòa. Settle trigger rồi kiểm kết quả; nếu còn sống vào EVIL_DEPLOY.

Không có hero passive hay trigger start-turn trong core v1. Bộ engine chỉ cần hỗ trợ hook được content sử dụng.

## R07 — Chơi card và target

Intent gồm ID instance trong tay/khay và target tường minh. Server kiểm actor, phase, version, cost cuối cùng, card có trong tay, điều kiện target và vacancy. Illegal intent không đổi HP/mana/PRNG/sequence.

Cost UNIT = printed cost + phụ phí Desert nếu lane active; không có cost reduction v1. TRICK và power không trả phụ phí Desert, kể cả khi tạo token ở đó. Cost luôn không âm. Sau khi hợp lệ: trừ mana, lấy card khỏi tay, tạo quân hoặc effect root. Trick/power vào discard thích hợp; quân vào discard khi chết.

Chơi UNIT: tạo instance trên board → áp entry Location → ON_PLAY của quân → settle root. SUMMON_TOKEN tạo instance mới, có printed traits nhưng không entry/ON_PLAY.

Target chọn lúc validate, không tự chọn mục tiêu khác nếu target mất trong cascade. Effect trên target mất hiệu lực thì phần đó no-op; những phần độc lập còn lại vẫn chạy. Card có target bắt buộc không được chơi nếu không có target hợp lệ. Heal được chọn mục tiêu đang đầy HP; áp dụng 0 heal. Move phải chọn lane đích khác, trống phía chủ quân và trong 1–5.

## R08 — Khả năng đánh

Quân mới được đánh ngay. Quân ATK=0, `STUNNED` hoặc `EXHAUSTED` không tạo attack packet. Quân không đánh được vẫn chặn lane và nhận sát thương. Không có đánh trả bổ sung ngoài attack của chính quân trong batch. Không có basic attack theo nút người chơi.

Mỗi instance được tạo sau khi lượt xử lý lane của nó kết thúc sẽ đợi combat sau; di chuyển từ lane đã xử lý sang lane chưa xử lý không được đánh hai lần: đánh dấu `lastRegularAttackTurn` khi declare attack. Di chuyển một quân chưa đánh vào lane chưa xử lý vẫn có thể đánh. Quân được triệu hồi trong block response ở lane đã/đang giải quyết không tham gia lại pair hiện tại.

## R09 — Combat một lane

1. Resolve `BEFORE_COMBAT_HERE` trigger: ác trước, thiện sau, rồi creation sequence, ability ID; trigger mới được thêm vào FIFO. Settle và kiểm lethal.
2. Đọc lại quân còn sống ở lane; áp dụng modifier active như Storm Peak/Ruined Arena.
3. Chụp snapshot attackers đủ điều kiện, target và damage. UNIT có đối thủ đánh quân đối diện; không có thì đánh hero. `PIERCE` thêm một hero packet cùng lượng ATK khi đang đánh quân.
4. Tính shield/armor/block theo R10/R11 trên snapshot; áp dụng toàn bộ damage của hai bên cùng một batch. Gắn thứ tự hiển thị EVIL rồi GOOD, nhưng không xóa quyền gây damage của attacker đã snapshot chỉ vì nhận damage chết trong batch.
5. Remove quân chết, chạy cascade như R12; kiểm lethal. Nếu kết thúc, không mở cửa sổ block.
6. Nếu có block cấp power và cả hero còn sống: mở từng `BLOCK_RESPONSE`; hero ác trước rồi hero thiện nếu cùng block. Chỉ power được cấp từ batch này đủ điều kiện miễn phí. Settle từng phản hồi trước phản hồi tiếp.
7. Resolve `AFTER_LANE_COMBAT` của Location (Volcano), dù lane không có attacker; settle và kiểm lethal. Chuyển lane kế.

Damage đánh vào quân không tự tràn sang hero. `PIERCE` là thêm packet riêng, không phải phần damage dư. Nếu phản hồi block làm thay đổi lane sau, lane sau dùng state mới. Damage batch đã commit không bị sửa lại.

## R10 — Damage và giảm sát thương

Damage type: `COMBAT`, `EFFECT`, `POISON`, `LOCATION`, `FATIGUE`. Chỉ COMBAT từ regular attack mới charge/block. Core không có bonus attack.

Trên quân: lấy amount không âm → trừ Armor (tối đa 1 từ các nguồn, floor 0) → nếu còn >0 và có Shield, tiêu thụ Shield, amount=0 → trừ HP. Armor áp dụng mọi damage lên quân. Shield không stack, chặn toàn bộ một packet dương sau armor. Damage=0 không kích `ON_DAMAGED` và không tiêu thụ Shield. Hero không có Armor/Shield ở core.

Poison damage không xuyên armor/shield. Buff ATK không tăng damage spell. Heal giới hạn ở maxHP, không hồi sinh entity HP≤0. Buff maxHP tăng cả currentHP cùng lượng; HP hiện tại vẫn không quá max. Buff tạm hết hạn: giảm maxHP rồi clamp currentHP, không trừ damage lần nữa.

## R11 — Block và power

Hero có `blockCharge=0`, `blocksUsed=0`. Một attack COMBAT có hero packet amount>0 và blocksUsed<3: cộng 2. Nếu đạt 8, đặt charge=0, tăng blocksUsed, hủy hero damage packet của attack đó. Nếu chưa đạt, damage vẫn vào hero. Attack thứ tư hợp lệ block lần đầu. Sau block thứ ba meter inactive; không tích tiếp.

Pierce đánh quân vẫn gây damage quân khi hero packet bị block. Một attack chỉ charge hero một lần. Damage trick, power, poison, fatigue và Location không charge/block. Damage bằng 0 không charge.

Khi block, lấy ngẫu nhiên đều 1 power chưa từng nhận trong bộ 4; mark received trước mở response. Không trùng, không hoàn lại. Power đầu trận đã thuộc received. Đến block thứ ba đã nhận đủ 4. Power đã dùng không thể được cấp lại.

Power được cấp nằm ngay trong reserve riêng; player chọn:
- `USE_BLOCK_POWER(powerInstanceId, targets)` giá 0, chỉ đúng power vừa cấp; hoặc
- `KEEP_BLOCK_POWER`: kết thúc response, giữ power để dùng giá 1 tại GOOD_PLAY/EVIL_TRICKS.

Không chọn target hợp lệ thì vẫn giữ được power. Không có timeout ở PvE. Bot quyết định và resolve qua cùng action validation. Không mở response lồng: power là EFFECT nên không tạo block. Pause/reload giữ nguyên pending response.

## R12 — Trigger, chết và lethal

“Root resolution” là một hành động card/power, một trigger theo lịch, hoặc một damage pair/batch được ghi rõ. Các primitive trong root chạy theo thứ tự; sau mỗi primitive, thu thập deaths và xử lý queue trước primitive tiếp. Một batch multi-target áp dụng đồng thời toàn bộ HP trước cleanup.

`ON_DAMAGED` chỉ queue cho quân còn sống sau batch và nhận damage dương. `ON_DESTROYED` queue từ snapshot của mọi quân vừa chết, kể cả chủ hero đã về 0 trong root. Các corpse được remove cùng lúc; death trigger có thể summon vào chỗ vừa trống. `ON_PLAY` chỉ trên chơi UNIT từ tay; token không kích hook này. Heal không hồi sinh hero/quân về 0.

Thứ tự queue trong cùng một batch: ON_DAMAGED trước ON_DESTROYED; sau đó lane tăng dần, phe ác trước thiện, creation sequence, ability ID. Queue FIFO, effect mới nối cuối. Không đọc order của object/hash map.

Lethal chỉ kiểm ở checkpoint sau khi root và cascade của nó hết: một hero≤0 thì thua, hai hero≤0 thì hòa. Các primitive còn lại của root được xử lý theo target sống/chết; không cho heal hero đã về 0. Khi GAME_OVER, dừng các root tiếp, block response chưa mở, Location tiếp và lane tiếp.

Giới hạn 256 primitive/root và 32 generation trigger: nếu vượt, transaction rollback toàn root, match chuyển `FAULTED`; không tính thắng/thua, không đổi state một phần. Core phải được kiểm định không đạt giới hạn trong các trường hợp hợp lệ.

## R13 — Cuối lượt

1. Tất cả quân Poisoned nhận 1 POISON trong cùng một batch toàn bàn; settle.
2. Chạy `ON_TURN_END` của quân còn sống theo lane, phe, creation, ability; mỗi trigger là root riêng.
3. Chạy `END_TURN` Location theo lane 1,3,5 (Healing Spring heal cả hai quân trong lane); mỗi lane là root.
4. Hết buff `UNTIL_TURN_END`, STUNNED và EXHAUSTED; Shield/Armor/Poison không tự mất.
5. Kiểm thắng; nếu vẫn chưa kết thúc và turn=20 → hòa `TURN_LIMIT`; nếu không → TURN_START.

Poison giết quân trước khi Healing Spring có thể hồi nó. Choáng/kiệt sức áp dụng khi combat đang diễn ra chỉ cấm attack chưa declare; hết ở TURN_END của lượt hiện tại.

## R14 — Draw và fatigue

Draw bắt buộc/từ card dùng chung quy tắc: nếu deck có lá, lấy top; tay<10 thì thêm, tay=10 thì đưa lá đó vào discard công khai (`OVERDRAW`). Deck rỗng thì fatigueCounter+=1 và gây đúng số đó lên hero. Mỗi draw trong “rút 2” xử lý lần lượt; kết quả root kiểm theo R12. Hai draw đầu-turn bắt buộc được batch fatigue như R06.

Overdraw không gây fatigue. Power không thuộc deck/tay thường, không bị hand cap và không ngăn block. Deck còn bao nhiêu lá, số tay và discard là công khai; nội dung tay và thứ tự deck là riêng.

## R15 — Keyword và thời hạn

6 keyword chính: Khiên (`SHIELD`), Giáp (`ARMOR`), Độc (`POISONED`), Choáng (`STUNNED`), Xuyên (`PIERCE`), Dịch chuyển (`MOVE`).

- Shield/Armor không cộng dồn; cấp lại dùng max(hiện tại,1). Shield tiêu thụ theo R10, Armor tồn tại.
- Poison stack tối đa 1 và tồn tại đến khi quân chết; nhận lại không tăng damage.
- Stun cấm attack còn lại của lượt hiện tại, không tắt trigger hay làm mất khả năng chặn lane.
- Pierce là trait chỉ áp dụng regular attack của instance đang có trait.
- Move không tạo instance mới, giữ HP/status/modifier/attack marker.
- Exhausted là trạng thái do Frozen Lake, không phải keyword card riêng; nghĩa chiến đấu như Stun nhưng nguồn hiển thị khác.

## R16 — Thông tin hợp lệ

Công khai: hero/class, 4 power có thể có của hero, board/stats/status, năng lượng, phase/turn, Location đã reveal, số tay/deck, discard, power đã công khai sử dụng và số power đang giữ. Riêng: danh tính power chưa dùng, tay, deck order, Location assignment ẩn, seed và RNG state.

Bot nhận `PlayerView` và legal actions cho chính nó, không nhận raw MatchState. Danh sách legal actions không được cho phép suy ra assignment Location ẩn; cost hidden lane luôn cost thường. Client có thể biết toàn catalog và pool, nhưng không biết assignment của trận.

## R17 — Điều khiển và pass

Click/tap card → chọn target; kéo thả là đường tắt tương đương. Esc/click nền hủy lựa chọn trước gửi. Sau action server đã chấp nhận không undo. Pass luôn xác nhận chuyển pha, không tự pass khi vẫn còn lựa chọn hợp lệ; nút hiển thị “Kết thúc triển khai”/“Kết thúc hành động”/“Kết thúc trick”. PvE không có đồng hồ suy nghĩ.

## R18 — Pause/resume, mất mạng

Pause ở một checkpoint đã commit. Nếu đang trình diễn animation, có thể pause trình diễn ngay; server state có thể đã tiến xa hơn, UI phải lưu cursor riêng và resync khi tiếp tục. Không rollback luật vì pause hình ảnh. Mất mạng: dừng gửi action, báo reconnect, retry cùng commandId theo protocol; không xử thua.

Browser đóng không thua; trận ở checkpoint/pending response được lưu. Chỉ một match ACTIVE/PAUSED mỗi principal. Account hết hạn sau 30 ngày không hoạt động, guest sau 7 ngày: `ABANDONED`, không tính win/loss. Surrender là loss, cần confirmation để tránh bấm nhầm.

## R19 — Tutorial

Tutorial là scenario riêng `tutorial_v1`, không tính thống kê balance. Dùng seed/script công khai được gắn nhãn “Hướng dẫn”; không làm lộ seed trận bình thường. Dạy: play unit → đọc mana → đọc lane trống → trick → combat pair → reveal turn3 → block/power → turn5 Location. Cho bỏ qua tutorial và mở lại. Cả phe được chơi ở skirmish; tutorial chính dạy GOOD, có đoạn bổ sung vai EVIL.

Đề xuất cụ thể ở [TUTORIAL](TUTORIAL.md): tám bước G01–G08 trong bốn scene A–D; bài EVIL riêng E01–E02. Scene được nạp từ checkpoint luyện tập có nhãn, bỏ mulligan và dùng deck/power order cố định. Đây là ngoại lệ setup của tutorial; mọi hành động sau load vẫn theo cùng engine damage/mana/phase. Client không được tự cấp board/seed. Tutorial hoàn thành có result NONE/TUTORIAL_COMPLETED, không tính thắng; skip không tính thua.

## R20 — RNG tái lập

Seed gốc 256-bit từ crypto server. Tạo substream độc lập cho `location`, `deck:evil`, `deck:good`, `power:evil`, `power:good`, `bot:easy`; xác định bằng HMAC-SHA256(seed, tên scope UTF-8), dùng 16 byte đầu theo little-endian làm 4 uint32 cho xoshiro128**; trạng thái toàn 0 đổi word cuối thành 1.

Engine sử dụng adapter RNG pure với state 4 uint32, không Math.random/Date.now. `nextInt(n)` dùng rejection sampling tránh modulo bias; Fisher–Yates từ cuối xuống. Location subset được enumerate theo ID từ điển; chọn subset rồi permutation. Snapshot lưu từng stream. Bot Thường không dùng random; Easy dùng riêng stream của nó. Triển khai phải pin golden vectors và algorithmVersion; thay thuật toán phải tăng rulesVersion.

Instance IDs không mã hóa card ID hoặc vị trí deck: derive từ HMAC-SHA256(identityKey, `instance:<ordinal>`), lấy16 byte hex; identityKey derive độc lập từ seed scope `identity`. Counter lưu trong MatchState; cùng seed/config cho cùng IDs. EventId=`matchId:eventSeq`, rootId=`matchId:rootSeq`, ổn định và không phụ thuộc UUID của HTTP command. initial_state cũng được lưu để replay kiểm tra độc lập setup. Private identityKey không nằm trong PlayerView/public preview.

## R21 — Tình huống mẫu

| Tình huống | Kết quả |
|---|---|
| Ác 3/2 và thiện 3/2 cùng lane, không trait | Cả hai chết; không damage hero. |
| Ác 3/2, thiện 3/2 có Stun | Thiện không đánh; thiện chết, ác sống 2 HP. |
| Ác 3/2 Pierce, thiện 2/4; meter thiện=6 | Thiện quân còn1HP, ác chết; hero thiện block 3 damage và nhận power. |
| Quân ATK3 in Storm Peak, đã được buff +2 | ATK cho hit=6 vì kiểm printed ATK3; buff không làm mất điều kiện. |
| Quân tồn tại lane3 trước Forest reveal turn3 | Không được +HP chỉ vì reveal. |
| Move vào Forest hoặc token summon ở Forest | Không nhận entry bonus. |
| Quân Armor1 + Shield nhận1 damage | Armor giảm0, Shield còn nguyên. |
| Poisoned quân1HP ở Healing Spring | Chết trong poison batch trước heal. |
| Meter6, nhận3 damage từ trick | Mất3HP, meter vẫn6, không cấp power. |
| Block ở lane1 cấp power move quân sang lane4 | Power giải quyết trước combat lane2; quân chưa đánh ở lane4 có thể đánh khi tới lane4. |

## R22 — Không nằm trong v1

PvP/ranked/spectator; offline matches; Team-Up/stacking; phản ứng tự do; Environment Card; terrain water/amphibious; thay Location; card từ set ngoài trận; hồi sinh/transform/bounce; extra attack; shop/lootbox/trading; native mobile; campaign. Không tự thêm các cơ chế này dưới tên “giống PvZ”.
