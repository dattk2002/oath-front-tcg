# Deck mẫu và bot

Mỗi dòng deck chứa **15 ID khác nhau × 2 bản = 30 lá**. Mọi card ngoài hero's classes hoặc phe đều bị từ chối, cả ở guest. Người chơi có thể sửa deck mẫu hoặc tạo deck mới; deck mẫu nguồn không bị ghi đè.

| Deck ID | Hero | 15 ID, mỗi ID 2 bản |
|---|---|---|
| D_G_BV | H_G_BV | GC01, GC02, GC03, GC05, B01, B02, B03, B04, B06, B07, V01, V02, V03, V05, V06 |
| D_G_BP | H_G_BP | GC01, GC02, GC03, GC05, B01, B02, B03, B04, B05, B06, P01, P02, P03, P06, P08 |
| D_G_VP | H_G_VP | GC01, GC02, GC03, GC05, V01, V02, V03, V04, V06, V07, P01, P03, P05, P06, P08 |
| D_E_FX | H_E_FX | EC01, EC02, EC03, EC05, F01, F02, F03, F04, F06, F08, X01, X02, X03, X06, X08 |
| D_E_FS | H_E_FS | EC01, EC02, EC03, EC05, F01, F02, F03, F04, F06, F07, S01, S02, S03, S06, S08 |
| D_E_XS | H_E_XS | EC01, EC02, EC03, EC05, X01, X02, X03, X05, X06, X08, S02, S03, S04, S06, S07 |

## Mulligan

Bot giữ tối đa 2 UNIT cost≤2, ưu tiên có cả cost1 và cost2. Giữ tối đa 1 removal trick cost≤2 nếu đã có ít nhất một UNIT rẻ. Đổi các lá còn lại. Tie: cost rồi definitionId rồi instanceId. Không đọc Location ẩn, topdeck hay tay đối thủ. Quy tắc giống nhau ở Dễ/Thường để tách độ khó khỏi chất lượng ván khởi đầu.

## Bot Thường

Input duy nhất: `PlayerView`, `LegalAction[]`, `BotConfig` và bộ nhớ quan sát công khai của trận. Hết phase thì pass. Khi là chủ BLOCK_RESPONSE, đánh giá dùng power vừa cấp và giữ. Không nhìn raw match/seed.

Chấm điểm trên public preview của mỗi action:

`score = 10000×immediateWin − 10000×immediateLoss + 3×enemyHeroDamage − 4×ownHeroDamage + 2×effectiveOwnHeroHeal + ΔboardValue + 1.2×netCardsGained − 0.35×energySpent`

BoardValue = tổng giá trị quân mình − tổng giá trị quân địch; một quân có `1.6×currentATK + currentHP + 1.0×Shield + 0.7×Armor + 0.8×Pierce − 1.0×Stunned/Exhausted − 1.5×Poisoned`. Stunned và Exhausted chỉ trừ một lần nếu cùng có.

Preview thực thi chung primitive trên **view** với unknown draw placeholders; không dùng thứ tự deck thật. Nó không dự đoán power trong tay bot đối thủ, draw identity hay Location chưa reveal. ΔboardValue dùng stats hiện tại, không cộng “giá trị bí mật” cho lane ẩn.

Với play/move, thêm heuristic `+1.5` nếu chặn một đòn đang dự kiến vào hero mình, `+1` nếu tạo favorable trade theo combat pair hiện biết; không cộng cả hai cho cùng lane. Lane thường/ẩn có locationBonus=0; lane đã reveal được tính bằng public preview. Không mô phỏng tương lai quá một action + combat hiện biết.

Ưu tiên action có score lớn nhất; chỉ chơi nếu score>0, nếu không pass/keep. Tie: action kind, card definitionId, instanceId, target lane, target instanceId theo thứ tự từ điển. Surrender không nằm trong lựa chọn bot. Bot xử lý từng action rồi lấy view/legal actions mới.

## Bot Dễ

Cùng legal actions và cùng score, nhưng 70% chọn action tốt nhất, 30% chọn đều trong tối đa 3 action điểm dương đứng đầu. Không chọn hành động bất hợp lệ. Nếu không có điểm dương thì pass/keep. Random dùng substream `bot:easy`, không tác động deck/power/Location.

Độ khó không tăng HP, mana, power hay thông tin. “Dễ” không đồng nghĩa luôn để người chơi thắng.

## Giới hạn runtime

Tối đa 64 bot intents mỗi lượt trước guard; legal-card/mana/hand core phải làm vòng thực tế hữu hạn. Một job API xử lý tối đa 8 action tự động hoặc 250 ms CPU, chọn giới hạn tới trước; sau đó checkpoint và trả `needsAdvance=true`. Client chủ động gọi `advance` cho batch tiếp. Không delay trên server để giả vờ suy nghĩ.

Nếu chạm guard, match FAULTED và ghi diagnostic riêng, không để bot đứng chờ vô hạn. Khi người chơi pause không gọi advance nữa. Khởi động lại server tiếp tục từ checkpoint.

## Phân biệt bot với preview cho người chơi

Bot dùng preview để chấm điểm; người chơi thấy highlight/ước lượng chỉ từ cùng lớp thông tin công khai cộng tay của mình. Preview không cam kết kết quả tương lai nếu còn lượt trick của đối thủ. UI ghi “Dự kiến theo bàn hiện tại”, không hiển thị chắc chắn lethal khi outcome phụ thuộc power/Location chưa biết.
