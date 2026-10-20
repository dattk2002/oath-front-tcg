# Kiểm chứng bộ đặc tả

**Lịch sử kiểm tra baseline v1.0.** Các số đếm bên dưới phản ánh bộ file trước khi bổ sung ba phụ lục. Kết quả hiện tại cho API/tutorial/screens ở [VERIFICATION-v1.1](VERIFICATION-v1.1.md); dự án hiện có thêm JSON schema/fixtures và tám mockup.

Ngày: 2026-10-20. Phạm vi: tài liệu và mockup tĩnh. **Không có engine, frontend hay API được implement; không có kết quả runtime.**

## Kiểm tra đã thực hiện

Kiểm bằng Python tiêu chuẩn trên file Markdown/SVG, SHA-256 của file nguồn, đọc review và xem trực tiếp ba PNG đã render. Script kiểm tài liệu không phải test gameplay.

| Hạng mục | Kết quả |
|---|---|
| Catalog thường | PASS — 60 ID duy nhất; 38 UNIT, 22 TRICK |
| Nội dung bổ sung | PASS — 6 class; 6 hero; 18 power; 3 token; 8 Location |
| Nhóm luật | PASS — R01–R22 đủ và không trùng |
| Acceptance | PASS — 40 case AC01–AC40 |
| Task và milestone | PASS — 18 task T01–T18; 6 milestone M1–M6 |
| Mapping nghiệm thu | PASS — Mọi acceptance case tham chiếu task tồn tại |
| Chưa triển khai | PASS — Không có checkbox triển khai được đánh dấu hoàn tất |
| Liên kết nội bộ | PASS — 36 liên kết, 0 hỏng |
| Chỉ có tài liệu | PASS — 23 file, chỉ MD/SVG/PNG |

Sáu hero đều tham chiếu đúng4 power khác nhau, gồm một signature đúng chủ và ba power đúng class. Sáu deck đều15 ID khác nhau ×2, đúng phe/class; mỗi hero có22 ID hợp lệ để lựa chọn.

| Deck | Cost trung bình của lá thường |
|---|---|
| D_G_BV | 2.33 |
| D_G_BP | 2.33 |
| D_G_VP | 2.40 |
| D_E_FX | 2.27 |
| D_E_FS | 2.00 |
| D_E_XS | 2.40 |

## Mockup và review UI

Ba SVG parse XML thành công; PNG đã render bằng ImageMagick và xem trực tiếp:

- battle-desktop: 1440×900
- battle-tablet: 1024×768
- card-anatomy: 1440×820

Không thấy clipping/overflow nghiêm trọng ở các hình tĩnh đã xem. Card anatomy đã chỉnh cost góc trái, ATK/HP hai góc và thời hạn buff trên power. Silhouette là placeholder. Chữ annotation nhỏ trong wireframe không phải typography production; UI-MOTION quy định14–16px và inspect đầy đủ.

Review theo ui-ux-pro-max đã đưa vào spec: keyboard/focus, click thay drag, target44px, status không chỉ màu, reduced motion, responsive/fallback và loading/error. Đây là review thiết kế; screen reader, touch, focus runtime, console và animation chưa thể kiểm bằng ảnh.

| Chữ / nền | Contrast đo được |
|---|---|
| `#F4EBDD` / `#1B2A38` | 12.39:1 |
| `#B8C8D4` / `#283E49` | 6.53:1 |
| `#76D9C4` / `#1B2A38` | 8.71:1 |
| `#FFB078` / `#1B2A38` | 8.18:1 |
| `#101923` / `#F4CB76` | 11.52:1 |

## Review tính triển khai

Một reviewer độc lập đọc các spec chuyên đề; sau sửa, đọc lại các điểm liên quan và lướt đủ18 task. Các thiếu sót đã xử lý:

1. Claim guest mất Set-Cookie sau commit: recovery completed claim có thời hạn, gắn cùng identity/source session; không merge lại.
2. Thiếu journal intents để replay: thêm ordered action journal và initialization snapshot.
3. Log sau resync: thêm event pagination với cursor theo seq đã scan, visibility filtering và expiry.
4. Bot Dễ: journal lưu cả nextBotRandomState; replay phục hồi nguyên tử trước kiểm post hash.

Kết quả lần review cuối: không còn phát hiện mâu thuẫn hoặc blocker quan trọng. Đây là bằng chứng review tài liệu, không thay thế integration tests. Kế hoạch T05/T06/T07/T08/T13 gắn assertions vào các trường hợp trên.

## Bảo toàn nguồn và phạm vi

File nguồn và bản đối chiếu giống từng byte. SHA-256:

`4caaadd3cd4abc2289fa5d7219e6533e3ed72f7837aa4e248f68e70408aa375b`

Nguồn: `/home/bia/Downloads/SPECIFICATION.md`. Bản đối chiếu: [reference/SPECIFICATION.v0.1.md](reference/SPECIFICATION.v0.1.md).

Thư mục dự án chỉ có Markdown, SVG và PNG. Không cài dependency, tạo repository/branch, commit, tạo Neon resource hay deploy trong công việc định nghĩa này.

## Chưa được kiểm chứng

- 60 FPS, frame percentiles, latency, memory, tải20 trận và chất lượng animation.
- Runtime luật, replay, transaction, retry/resume, JWT/OAuth và authorization.
- Balance900 trận, stress simulations và playtest người thật.
- Artwork/audio cuối, browser/device matrix và khả năng đọc bằng screen reader.
- Giá/gói hạ tầng, ngày giao và nguồn lực thực tế.

Các mục này nằm trong M1–M6; không được đánh dấu PASS chỉ từ việc tài liệu đã rõ. Mức độ sẵn sàng của đặc tả không phải xác suất thành công đo được95%.
