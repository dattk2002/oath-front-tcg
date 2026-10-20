# Quyết định sản phẩm — Ngũ Lộ

Ngày: 2026-10-20. Baseline: `rules_v1`, `core_v1`, `locations_v1`.

Người dùng đã chọn “tất cả làm theo đề xuất” trong bộ 40 câu hỏi. Những quyết định dưới đây phân biệt lựa chọn đã được chấp thuận với chi tiết do người thiết kế tự chốt để tài liệu có thể triển khai. Đây là tài liệu thiết kế; chưa có phần mềm, hạ tầng hay kết quả playtest.

## Quyết định được chấp thuận

| Câu | Quyết định |
|---|---|
| 1 | Combat theo lane: ác 1 → thiện 1 → ác 2 → thiện 2… |
| 2 | Hai quân trao đổi sát thương trong một nhịp nguyên tử; animation ác trước không tạo lợi thế first-strike. |
| 3 | 6 hero, 3 mỗi phe. |
| 4 | 3 class riêng mỗi phe; mỗi hero sử dụng 2 class. |
| 5 | Mỗi hero có 4 superpower: 1 signature riêng và 3 power theo class. |
| 6 | Nhận ngẫu nhiên 1 power đầu trận; các power còn lại nhận khi block, không lặp. |
| 7 | Block Meter 8 điểm, tăng cố định 2 mỗi đòn hợp lệ, tối đa 3 block/trận. |
| 8 | Power vừa nhận khi block được dùng ngay miễn phí hoặc giữ; power giữ lại giá 1 năng lượng trong pha hợp lệ. |
| 9 | Power ở khay riêng, không chiếm tay bài thường. |
| 10 | Không có passive/cooldown hero riêng ở v1. Nhân vật có keyword và triggered ability. |
| 11 | 20 HP; deck 30; tối đa 2 bản/card; năng lượng 1→10, hồi đầy mỗi lượt, không tích dư. |
| 12 | 4 lá thường + 1 power đầu trận; mulligan một lần; rút từ lượt 2; tay thường tối đa 10. |
| 13 | Fatigue 1,2,3…; cùng chết trong một root resolution thì hòa; hết lượt 20 chưa thắng thì hòa. |
| 14 | 1 quân/phe/lane; quân mới đánh ngay; HP không tự hồi; chỉ di chuyển qua effect; không có sát thương dư tự xuyên. |
| 15 | 60 card thường, 8 Location; hero, power và token đếm riêng. |
| 16 | Người thiết kế tự sáng tạo toàn bộ roster, tên, ability và deck mẫu. |
| 17 | 6 keyword nền, ưu tiên trigger đơn giản; không thêm stacking quân, hồi sinh, biến hình, combo vô hạn. |
| 18 | Dùng 8 Location của v0.1 làm nền; 3 khác nhau, ít nhất 1 neutral/buff. |
| 19 | Tutorial + đấu nhanh; người chơi chọn cả hai phe; bot phe đối diện. Campaign/boss ngoài v1. |
| 20 | Bot Dễ và Thường; cùng luật và giới hạn thông tin với người chơi. |
| 21 | Mở toàn bộ nội dung; không economy, XP hay unlock grind ở v1. |
| 22 | Mục tiêu 5–10 phút/trận; không đồng hồ suy nghĩ; pause/resume. |
| 23 | Fantasy cách điệu, cá tính và nhẹ nhàng; hai phe có ngôn ngữ hình ảnh riêng. |
| 24 | PvZ Heroes là tham khảo cơ chế; nội dung và hình ảnh mới. Không thêm nguồn hình ảnh bắt buộc. |
| 25 | Nhân vật 2D trên bàn với idle/attack/hit/death; thẻ đầy đủ ở tay và deck builder. |
| 26 | Motion nhanh, có lực, đọc rõ; signature nổi bật; có giảm motion/VFX. |
| 27 | Hiện ATK/HP/status; inspect card; legal targets; lý do không dùng được; battle log; preview chỉ từ thông tin biết được. |
| 28 | SFX + nhạc nền; âm lượng riêng; chưa voice acting. |
| 29 | Art bible + pipeline ảnh gốc AI có chỉnh sửa/kiểm tra nhất quán. Chưa sản xuất toàn bộ asset trong bước tài liệu. |
| 30 | Desktop/laptop và tablet ngang; mobile chơi đầy đủ để sau; mục tiêu 60 FPS trên máy chuẩn sẽ đo. |
| 31 | UI tiếng Việt; ID kỹ thuật tiếng Anh; chuẩn bị cấu trúc bản dịch tiếng Anh. |
| 32 | PvE online: engine/bot trên server; browser chỉ nhận view hợp lệ. |
| 33 | Guest thử game; đăng nhập để lưu/đồng bộ giữa thiết bị. |
| 34 | Lưu profile, deck, trận đang chơi, kết quả/lịch sử. Replay người dùng không bắt buộc ở v1. |
| 35–38 | Chưa có số liệu khách quan về mục tiêu kinh doanh, team, deadline, ngân sách, máy chuẩn hay tài nguyên sẵn có. |
| 39 | React + TypeScript + Vite + GSAP + PixiJS; Neon + Drizzle. |
| 40 | Spec tổng hợp + tài liệu chuyên đề + sơ đồ/mockup tĩnh + milestone/task có nghiệm thu. |

## Quyết định nền giữ nguyên

5 lane cố định; Location chỉ ở lane 1/3/5, reveal + activate tại global turn 1/3/5; lane 2/4 luôn thường; Location không thể thay đổi hay loại bỏ; lane ẩn chơi được nhưng effect chưa hoạt động. Không Environment Card. Thắng bằng HP hero, không tính số lane chiếm giữ. 4 pha hành động do người dùng xác định; vai ác/thiện cố định, không đổi theo lượt.

## Chi tiết do người thiết kế chốt

| ID | Quyết định | Lý do |
|---|---|---|
| A01 | Tên làm việc “Ngũ Lộ — Bình Minh & Tro Tàn” | Tên nội bộ, chưa khẳng định tính độc quyền thương hiệu. |
| A02 | Mỗi phe 24 card class (8/class) + 6 card chung của phe | Mỗi hero có 22 card hợp lệ, đủ tạo deck 30 với giới hạn 2 bản và còn lựa chọn thay thế. Không card chung xuyên phe. |
| A03 | 18 định nghĩa power: 12 power class + 6 signature | Mỗi class có 2 power; mỗi hero có 4 slot, có thể trùng power class giữa hero. |
| A04 | 3 token ngoài deck | Dùng bởi power/card; token không thể đưa vào deck. |
| A05 | Tất cả superpower v1 là dạng trick; một số có thể tạo token | Phase hợp lệ rõ ràng; không thêm loại super-creature riêng. |
| A06 | Auth đăng nhập Google qua Neon Auth; guest do ứng dụng quản lý | Không phụ thuộc tính năng anonymous-account của provider; không thêm hệ mật khẩu ở v1. |
| A07 | API Node.js + Fastify; HTTP request/response với event batch | PvE không cần websocket; lưu trận rồi trả view, dễ resume và chống gửi lặp. |
| A08 | Vite tạo frontend static; Node API phục vụ cả static build và `/api` cùng origin ở v1. Mục tiêu Render Singapore + Neon Singapore | Giảm dịch vụ và tránh phụ thuộc third-party cookies; có thể tách CDN về sau. Chưa cấp phát; giá/gói kiểm tra trước triển khai. |
| A09 | Guest tồn tại 7 ngày; account có một trận chưa kết thúc; trận account hết hạn sau 30 ngày không hoạt động | Chính sách lưu rõ, hạn chế trận bỏ dở tăng vô hạn. |
| A10 | Nhật ký đầy đủ lưu riêng 30 ngày; kết quả gọn 180 ngày | Đủ kiểm lỗi/balance; chưa có giao diện replay công khai. |
| A11 | Mục tiêu beta nội bộ 20 trận PvE đồng thời | Mốc load test do người thiết kế đặt, không phải dự báo nhu cầu hay cam kết công suất. |
| A12 | Ưu tiên ít dịch vụ, chưa Redis/queue/LLM/CMS | Tập trung gameplay và chi phí; không mặc định ngân sách bằng 0. |
| A13 | Máy chuẩn tạm: laptop CPU 4 nhân, RAM 8 GB, iGPU, 1366×768; tablet 1024×768 | Phải chọn thiết bị thật trước chứng nhận hiệu năng. |
| A14 — đề xuất | Public API contract dùng JSON Schema Draft7; action/view/event/error đóng | Một nguồn schema, giảm frontend/backend tự đặt tên; không dùng private API của PvZ Heroes. |
| A15 — đề xuất | Tutorial8 bước GOOD trong4 scene,2 bước EVIL riêng; setup cố định và có nhãn | Người học chắc chắn gặp reveal/block; engine vẫn dùng cùng luật. |
| A16 — đề xuất | Hero/deck/block/result có mockup desktop/tablet và behavior riêng | Hero→class/power→deck mẫu lấy cảm hứng trải nghiệm PvZ Heroes, nội dung/art gốc. |
| A17 — đề xuất | Result summary có rematch config owner-only và content-version guard | Reload vẫn chơi lại đúng deck; không âm thầm áp nội dung mới. |

## Điều chưa được chứng minh

- Card “hợp lệ theo luật” không đồng nghĩa “đã cân bằng”. Các con số là baseline thử nghiệm.
- Mục tiêu FPS/latency/bot strength chỉ được xác nhận bằng đo và playtest.
- Chưa chọn gói trả phí, tạo Neon project, tạo repository, commit, deploy hay publish.
- Không dùng lại giả định “2 hero / 40 card” của v0.1; không tự đưa PvP vào v1.
- Thay đổi yêu cầu đã chốt phải ghi quyết định mới và cập nhật rule, nội dung, test, UI cùng nhau.
