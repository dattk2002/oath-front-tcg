# Tiến độ định nghĩa sản phẩm

Đây là trạng thái tài liệu, không phải trạng thái phần mềm.

| Milestone | Trạng thái | Bằng chứng |
|---|---|---|
| D0 — Yêu cầu | Hoàn thành | DECISIONS.md: 40 câu, xác nhận của người dùng, các giả định được tách rõ |
| D1 — Luật | Hoàn thành bản đặc tả | 22 nhóm luật; 10 tình huống được đối chiếu thủ công; chưa chạy engine |
| D2 — Nội dung | Hoàn thành baseline | Kiểm tra 60 card, 6 hero, 18 power, 6 deck đúng30 lá/class/copy limit; balance chưa playtest |
| D3 — UI/motion | Hoàn thành thiết kế | 3 mockup đã xem; 5 cặp màu chữ đo≥4.5:1; có motion/input/asset contract; runtime chưa kiểm |
| D4 — Kiến trúc/Neon | Hoàn thành bản thiết kế | Engine/view/API/checkpoint/auth/schema; đã sửa các điểm review về recovery, journal và RNG bot |
| D5 — Kế hoạch/kiểm tra | Hoàn thành | 18 task / 6 milestone; 40 acceptance case có mapping; kiểm tra catalog/deck/link/ảnh/contrast; review cuối không còn blocker quan trọng |
| D6 — Public contract | Hoàn thành đề xuất v1.1 | API-CONTRACT +79 schema definitions;9 JSON examples hợp lệ;11 negative cases bị từ chối |
| D7 — Tutorial cụ thể | Hoàn thành đề xuất v1.1 | G01–G08, E01–E02;5 scene fixtures; expected outcomes và branch/reload/skip |
| D8 — Screens còn thiếu | Hoàn thành đề xuất v1.1 | Hero/deck/block/result;8 mockup desktop/tablet đã render và xem; behavior/keyboard/error states |

D0→D5 đã hoàn tất theo thứ tự ở cấp tài liệu. M1→M6 trong kế hoạch triển khai vẫn **chưa bắt đầu**. Kết quả và giới hạn kiểm chứng ghi tại VERIFICATION.md; balance/performance/runtime chưa được nghiệm thu.

D6→D8 hoàn thiện ba phụ lục theo yêu cầu tiếp theo của người dùng. Các lựa chọn mới mang nhãn “đề xuất”; bằng chứng và giới hạn hiện hành ở VERIFICATION-v1.1.md. Không chuyển sang implementation trong lượt này.

Nguồn gốc: `/home/bia/Downloads/SPECIFICATION.md`.
SHA-256: `4caaadd3cd4abc2289fa5d7219e6533e3ed72f7837aa4e248f68e70408aa375b`.
Bản đối chiếu không sửa: [reference/SPECIFICATION.v0.1.md](reference/SPECIFICATION.v0.1.md).
