# Nội dung core_v1

Toàn bộ tên và số liệu dưới đây là thiết kế mới cho Ngũ Lộ, chưa được chứng minh cân bằng. Nội dung có thể sửa qua version mới sau playtest; không sửa match đang diễn ra.

## Thế giới và ngôn ngữ hình ảnh

Ngũ Lộ nối các khu vườn lơ lửng với một kinh thành luyện tro. Liên Minh Bình Minh (`GOOD`) giữ ánh sáng nuôi sống các đảo; Triều Đình Tro Tàn (`EVIL`) muốn dùng ngọn lò cũ để kiểm soát các con đường. Phong cách phiêu lưu fantasy cách điệu, nhân vật có cá tính, không máu me. Thiện–ác là vai trò hư cấu trong câu chuyện, không gắn với dân tộc/tôn giáo có thật.

GOOD: ngà, ngọc lam, lá non, đồng sáng; silhouette tròn, giáp gỗ/kính, vải. EVIL: than tím, cam tàn, đồng cũ; silhouette góc cạnh nhưng dễ đọc, mặt nạ, lò đèn, áo choàng. Hero có cá tính riêng; không phải mọi hero thiện đều phòng thủ và mọi hero ác đều aggro.

## Class

| ID | Phe | Tên | Bản sắc và giới hạn |
|---|---|---|---|
| BASTION | GOOD | Thành Lũy | Khiên/Giáp, giữ quân; ít damage trực tiếp hero |
| VERDANT | GOOD | Sinh Mạch | Heal, tăng HP, duy trì bàn; không xóa mọi trạng thái |
| PRISM | GOOD | Lăng Kính | Move, Choáng, tempo; thân quân mỏng |
| FURNACE | EVIL | Lò Tro | Damage, tăng ATK, Xuyên; ít hồi phục |
| HEX | EVIL | Nguyền Ấn | Độc, hiệu ứng chết, hao mòn; bị Giáp khắc chế |
| VEIL | EVIL | Màn Đêm | Move, Khiên, chọn lane; ít damage diện rộng |

8 card/class × 6 class + 6 card chung/phe × 2 = **60 card thường**.
Mỗi hero sử dụng 8+8+6 = **22 ID thường**. Mỗi deck cần ít nhất 15 ID khác nhau để đủ 30 lá với giới hạn 2.

## Hero

| ID | Tên / danh hiệu | Class | Vai trò | Bộ 4 power | Signature |
|---|---|---|---|---|---|
| H_G_BV | An Nhiên — Người Giữ Mầm | BASTION, VERDANT | Giữ quân, hồi phục, đánh bền | P_B1, P_V1, P_V2, S_G_BV | Lời Thề Nảy Mầm |
| H_G_BP | Lam Vệ — Người Giữ Kính | BASTION, PRISM | Chặn nhịp, bảo vệ, đổi vị trí | P_B1, P_B2, P_P2, S_G_BP | Phán Quyết Pha Lê |
| H_G_VP | Mộc Dao — Người Dệt Ánh | VERDANT, PRISM | Tăng trưởng và mở lane | P_V1, P_P1, P_P2, S_G_VP | Đường Mòn Ánh Sáng |
| H_E_FX | Hắc Luyện — Chúa Lò Tro | FURNACE, HEX | Damage kết hợp hao mòn | P_F1, P_F2, P_X1, S_E_FX | Tiếng Chuông Lò Cổ |
| H_E_FS | Dạ Vũ — Kẻ Rẽ Bóng | FURNACE, VEIL | Áp lực nhanh, mở đòn xuyên | P_F2, P_S1, P_S2, S_E_FS | Vệt Đao Chạng Vạng |
| H_E_XS | Mặc Ảnh — Người Gieo Ấn | HEX, VEIL | Poison, đổi lane, lợi thế bài | P_X1, P_X2, P_S1, S_E_XS | Màn Sương Niêm Ấn |

Mọi hero 20 HP và cùng block rule. Tên ngắn dùng trong battle HUD; danh hiệu chỉ ở hero inspect/selection. 6 hero mở sẵn. Bot chọn được cả 6 với deck mẫu và cùng 4 power.

## Superpower: 18 định nghĩa, 24 slot trên 6 hero

Mọi power dạng SUPERPOWER/TRICK, baseCost=1, không nằm trong deck 30. Dùng bình thường ở GOOD_PLAY hoặc EVIL_TRICKS theo phe; miễn phí chỉ trong cửa sổ block của chính power vừa nhận. “Vĩnh viễn” nghĩa đến khi quân rời bàn; “lượt này” đến TURN_END. Power hết mục tiêu chỉ được giữ trong block response, không được dùng lấy effect phụ.

| ID | Class/chủ | Tên | Target và văn bản chính xác |
|---|---|---|---|
| P_B1 | BASTION | Tấm Chắn Ban Mai | Chọn một quân đồng minh. Cấp Khiên cho quân đó. Rút 1 lá. |
| P_B2 | BASTION | Vá Giáp | Chọn một quân đồng minh. Hồi 4 HP cho quân đó. Rút 1 lá. |
| P_V1 | VERDANT | Mầm Kiên Cường | Chọn một quân đồng minh. Quân đó +0/+2 vĩnh viễn. Rút 1 lá. |
| P_V2 | VERDANT | Nhịp Thở Rừng | Hồi 3 HP cho hero của bạn. Hồi 1 HP cho tất cả quân đồng minh. |
| P_P1 | PRISM | Bước Qua Gương | Dịch chuyển một quân đồng minh sang lane trống phía bạn. Quân đó +1 ATK lượt này. |
| P_P2 | PRISM | Chớp Lặng | Chọn một quân địch. Gây Choáng lượt này cho quân đó. Rút 1 lá. |
| P_F1 | FURNACE | Tàn Lửa | Gây 2 sát thương lên một quân địch hoặc hero địch. |
| P_F2 | FURNACE | Hun Lưỡi | Chọn một quân đồng minh. Quân đó +2 ATK lượt này. Cấp Khiên cho quân đó. |
| P_X1 | HEX | Chấm Mực Độc | Chọn một quân địch. Gây 1 sát thương rồi đặt Độc lên quân đó. |
| P_X2 | HEX | Thu Hồi Sinh Khí | Hồi 2 HP cho hero của bạn. Rút 1 lá. |
| P_S1 | VEIL | Lối Đi Sai | Dịch chuyển một quân địch sang lane trống phía chủ quân đó. |
| P_S2 | VEIL | Áo Đêm | Chọn một quân đồng minh. Cấp Khiên; quân đó +1 ATK lượt này. |
| S_G_BV | H_G_BV | Lời Thề Nảy Mầm | Chọn một quân đồng minh. Cấp Khiên và +0/+2 vĩnh viễn cho quân đó. Hồi 2 HP cho hero của bạn. |
| S_G_BP | H_G_BP | Phán Quyết Pha Lê | Chọn một quân địch. Gây 2 sát thương rồi Choáng lượt này cho quân đó. Rút 1 lá. |
| S_G_VP | H_G_VP | Đường Mòn Ánh Sáng | Dịch chuyển một quân đồng minh sang lane trống phía bạn. Quân đó +2/+1 vĩnh viễn. |
| S_E_FX | H_E_FX | Tiếng Chuông Lò Cổ | Gây 1 sát thương đồng thời lên tất cả quân địch. Sau đó gây 2 sát thương lên hero địch. |
| S_E_FS | H_E_FS | Vệt Đao Chạng Vạng | Chọn một quân đồng minh. Quân đó +2 ATK và có Xuyên trong lượt này. |
| S_E_XS | H_E_XS | Màn Sương Niêm Ấn | Đặt Độc lên tất cả quân địch. Hồi 2 HP cho hero của bạn. |

Các effect trong câu thực hiện từ trái sang phải. Các target bắt buộc phải tồn tại trước khi chơi. P_F1 dùng `ENEMY_CHARACTER` (quân hoặc hero). Move chọn unitId và laneId. S_E_FX/S_E_XS/P_V2 không có target chọn, được dùng khi board trống. Cơ chế “không có target” khác “target bắt buộc đã chết”.

## Token

| ID | Tên | Phe | ATK/HP | Khả năng |
|---|---|---|---|---|
| TK_G_SEED | Mầm Đèn | GOOD | 1/1 | Không |
| TK_G_LANTERN | Đèn Gác | GOOD | 0/3 | Khiên |
| TK_E_CINDER | Tàn Quỷ | EVIL | 2/1 | Không |

Token có printed stats cho điều kiện Storm Peak. Không cost/deck slot/collection quantity. SUMMON_TOKEN không kích ON_PLAY hoặc entry Location. Nếu lane đích không trống lúc effect thực thi, summon no-op. Token chết bị remove và hiện trong log; không tăng discard card count vì không phải lá từ deck.

## Location: locations_v1

| ID | Tên | Nhóm | Hook | Văn bản chính xác |
|---|---|---|---|---|
| ancient_forest | Rừng Cổ Đăng | BUFF | ON_UNIT_PLAYED | Nhân vật được chơi từ tay vào đây nhận +0/+1 vĩnh viễn. |
| volcano | Miệng Lò Tro | HAZARD | AFTER_LANE_COMBAT | Sau giao tranh ở lane này và các phản hồi block, gây 1 sát thương đồng thời lên mọi quân còn sống ở đây. |
| storm_peak | Đỉnh Ngân Lôi | BUFF | BEFORE_ATTACK | Quân ở đây có ATK in trên card không quá 3 nhận +1 ATK cho regular attack này. |
| frozen_lake | Hồ Kính Lạnh | CONTROL | ON_UNIT_PLAYED | Nhân vật được chơi từ tay vào đây bị Kiệt sức đến hết lượt hiện tại. |
| desert | Cồn Cát Chuông | COST | COST_MODIFIER | Chơi card nhân vật từ tay vào đây tốn thêm 1 năng lượng. |
| healing_spring | Suối Chồi Non | BUFF | END_TURN | Cuối lượt, sau Độc và trigger quân, hồi 1 HP cho mỗi quân còn sống ở đây. |
| ruined_arena | Đấu Trường Vỡ | BUFF | BEFORE_ATTACK | Quân ở đây nhận +1 ATK cho regular attack này nếu lane có quân đối phương lúc chụp snapshot. |
| quiet_meadow | Đồng Cỏ Yên | NEUTRAL | NONE | Không có hiệu ứng. |

Ruined Arena được phân loại BUFF rõ ràng thay cho “Neutralish” v0.1. Nó không thêm bonus cho đòn trực tiếp khi lane không có quân; nếu có quân và attacker có Pierce, bonus ATK dùng cho cả hai packet cùng attack. Quiet Meadow có reveal riêng, không đồng nhất với lane NORMAL 2/4.

## Quy tắc authoring

Chi tiết 60 card ở [CARDS.md](CARDS.md). Deck mẫu ở [DECKS.md](DECKS.md). Mỗi ID có art key `cards/<id-lowercase>.webp`; hero `heroes/<id-lowercase>/portrait.webp`; power `powers/<id-lowercase>.webp`. Asset chỉ là yêu cầu sản xuất, chưa có sẵn.

VFX theo nhóm: kinetic, shield, growth, prism, ember, ink, veil. Không tạo animation riêng hoàn toàn cho từng card nếu cùng primitive. Signature dùng accent của hero + một đoạn mở đầu riêng, sau đó cùng event primitive để giữ đúng timing.

Văn bản card, tooltip và engine manifest phải được sinh/kiểm chứng từ cùng definition đã version; UI không giữ bản mô tả luật độc lập tự viết.
