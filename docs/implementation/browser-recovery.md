# Recovery, block và kết quả — Task 11

Triển khai tại `f61f169`, `b8f94d4` và bản sửa `a5a3059`, từ base `fc8b8b8`. [Review ban đầu](evidence/task11/review.md) và [review bản sửa](evidence/task11/rereview.md) đã đóng finding chặn về retry/reconnect trong dialog pause. M3 đạt gate kỹ thuật; các gate thiết bị thật và phần việc M4 bên dưới vẫn được theo dõi riêng.

Review cũng ghi một nhận xét nhỏ cho Task 12: thông báo rematch chưa biết kết quả phải giữ cảnh báo không thể phục hồi qua reload khi sessionStorage ghi thất bại. In-memory retry vẫn giữ đúng ID/body.

## Hành vi đã triển khai

- Block là panel không modal, có “Dùng ngay · 0” và “Để dành”. Không auto-play hoặc timeout; Esc chỉ hủy chọn mục tiêu. Khi không có target hợp lệ, Để dành vẫn dùng được.
- Reconnect lấy snapshot thật từ server và tải log tới cùng ranh giới sequence. Cursor đã scan log tách khỏi cursor trình bày; trang toàn event riêng vẫn tiến cursor, event trùng được loại bỏ. Nếu đầu log hết hạn, client ghi rõ phần thiếu và vẫn lấy phần còn giữ.
- Tab đang xem kiểm snapshot mỗi 5 giây; tab ẩn dừng polling và ADVANCE. Snapshot không đổi giữ selection/focus; response cũ không thay snapshot mới. Recovery thất bại khóa mutation cho tới khi retry thành công.
- Pause, xác nhận đầu hàng và kết quả có focus/Tab/Shift+Tab/Esc tương ứng. Pointer, keyboard và drag qua ngưỡng 6px dùng chung intent controller.
- Kết quả và rematch dùng `MatchSummary` đã lưu. `/history/:id` và trường hợp chi tiết trận hết hạn không dựng PlayerView giả. Retry rematch giữ nguyên command ID/body; chuyển trận trực tiếp bỏ store cũ và bỏ qua response đến muộn của trận trước.
- Các nhận xét Task 9 về preview hero, nhãn TRICK có thể chơi và lỗi sessionStorage đã được xử lý. Nếu không lưu được pending command, client giữ nó trong bộ nhớ và báo giới hạn phục hồi qua reload.

## Kiểm chứng và giới hạn của kết quả

| Phạm vi | Kết quả |
|---|---|
| Baseline toàn workspace | [46 file / 518 test qua](evidence/task11/final-test.log), 156,39 giây; trước sửa focus cuối |
| Sau sửa focus | [8 file / 38 test web qua](evidence/task11/final-focus-web-tests.log); typecheck/lint và [build mới](evidence/task11/final-focus-build.log) qua |
| Production browser | [28/29 qua](evidence/task11/red-foundation-live-revision.log), gồm toàn bộ 20 case Task 11 và 5 case motion |
| Assertion foundation được sửa | [4/4 foundation qua](evidence/task11/green-foundation-live-revision.log) trên runtime không đổi |
| Console | [20 bộ thu console](evidence/task11/console-summary.json), không có lỗi ngoài các lỗi mạng được chủ động tiêm |

Trước bản sửa pause, tổng cộng 29 case browser được phủ qua các lần chạy trên cùng runtime; **không có tuyên bố một lần chạy 29/29**. Trận tự động đi qua UI/API/database thật ở cả hai phe và kết thúc tự nhiên, dùng PASS/KEEP thông thường; không ép terminal, sửa gameplay hoặc reset rate limit. Fixture block/log được chuẩn bị riêng trong database kiểm thử.

Sửa focus cuối có trang tái hiện riêng: native dialog đưa focus ra body sau chuỗi Tab. Helper modal bổ sung vòng Tab/Shift+Tab, được kiểm lại cùng pause, kết quả, rematch và signature. Baseline 518 test không được chạy lại cho sửa hiển thị này.

Case foundation cũ so revision tại hai thời điểm khác nhau. [Trace đã lọc dữ liệu nhạy cảm](evidence/task11/foundation-live-revision-trace.json) chứng minh ADVANCE diễn ra giữa GET revision 10 và lần SQL đọc revision 11. Assertion đổi thành revision DB dạng số và không nhỏ hơn snapshot; giữ kiểm journal, PlayerView và routing. Không đổi runtime hoặc build lại cho sửa test.

Một lần full test trước đó có lỗi mới về phần log còn giữ và một retry receipt vượt deadline 80ms của test. Lỗi log đã có regression và được sửa. Lỗi deadline chưa xác định nguyên nhân, không có sửa backend; [kiểm tách riêng](evidence/task11/clean-recovery-deadline.log) và baseline sạch sau đó đều qua. Không gán lỗi này cho các tiến trình fixture cũ khi chưa có bằng chứng.

## Bản sửa recovery trong pause

RecoveryControls dùng chung được đặt bên trong native dialog khi trận PAUSED, nên retry và reconnect vẫn nhận pointer/keyboard trong lúc các nút gameplay khóa. Retry gửi lại đúng envelope cũ; không tạo RESUME mới. Các nút này vẫn hiện trong bước xác nhận đầu hàng.

Hai regression browser tái hiện lỗi trước bản sửa. Sau sửa, [5/5 case production](evidence/task11/fix-round1-production-browser.log) qua trong 16,5 giây: mất RESUME trước commit rồi retry bằng bàn phím/reload/pointer với cùng ID/body, snapshot 503 khi pause và active, retry block cũ, và luồng pause/focus thông thường. [38 test web](evidence/task11/fix-round1-web-tests.log), typecheck/lint và build mới đều qua. [Năm bộ thu console](evidence/task11/fix-round1-console-summary.json) không có lỗi ngoài lỗi mạng được chủ động tiêm. Không chạy lại toàn bộ suite cho sửa này.

Ảnh bản sửa: [retry trong pause](evidence/task11/pause-uncertain-retry.png), [tablet](evidence/task11/pause-uncertain-tablet.png), [mobile](evidence/task11/pause-uncertain-mobile.png), [snapshot recovery](evidence/task11/pause-snapshot-recovery.png).

[Đối chiếu source/artifact bản sửa](evidence/task11/fix-round1-integrity-summary.json): 231 source file và 162 artifact gốc không đổi sau build; sáu file cache mới được ghi riêng. Controller kiểm lại hash, reviewer kiểm source và bằng chứng đã chạy; không lặp suite.

## Source và artifact

[Manifest trước](evidence/task11/final-source-artifacts-before.json), [manifest sau](evidence/task11/final-source-artifacts-after.json) và [bảng đối chiếu](evidence/task11/final-integrity-summary.json) gồm 230 source file, kể cả file chưa được Git track lúc build. Controller kiểm lại các hash: chỉ test assertion foundation thay đổi sau build; 162 file artifact gốc giữ nguyên. Next tạo thêm 18 file cache trong lúc chạy, được ghi riêng.

Bản log đưa vào Git chỉ chuẩn hóa whitespace cuối dòng và dòng trống cuối file; log/trace thô giữ trong workspace kiểm chứng. Raw browser trace không được đưa vào bộ bằng chứng công khai này.

Ảnh: [block desktop](evidence/task11/block-desktop.png), [tablet](evidence/task11/block-tablet.png), [375px](evidence/task11/block-mobile.png), [kết quả](evidence/task11/good-result.png), [kết quả tablet](evidence/task11/result-tablet.png), [kết quả mobile](evidence/task11/result-mobile.png), [log hết hạn một phần](evidence/task11/expired-log.png), [reconnect vào trận pause](evidence/task11/recovered-paused.png).

## Điểm nối M4 và các gate sau

Khi phiên bản nội dung đổi, [panel review](evidence/task11/version-review.png) giữ đúng preset hoặc deck ID/revision gốc, hiển thị phiên bản cũ/mới và chặn create cũ. “Chọn bộ bài khác” là lựa chọn thay thế. **Task 12 phải nối tiếp vào builder thật theo nguồn deck chính xác**, với xác nhận rõ trước khi tạo trận mới. Điểm nối này và cảnh báo rematch storage đã được kiểm chứng, review ở [Task 12](hero-deck-builder.md).

Task 13 làm history list phân trang và auth/claim. Art/audio cuối thuộc Task 15; thiết bị thật, Safari, assistive technology và đo hiệu năng thuộc các gate sau. Các test Chromium và visibility giả lập không thay thế các kiểm chứng đó.
