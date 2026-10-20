# Tài khoản, giữ tiến trình và lịch sử — Task 13

Implementation từ base `dcca7bb` gồm `f1208f9` (dependency), `3711bf3` (backend/replay) và `44b9171` (giao diện, proxy, lịch sử và môi trường local). [Review độc lập](evidence/task13/review.md) yêu cầu sửa gia hạn phiên khi storage lỗi; hai nhận xét nhỏ về refresh lịch sử và retry đăng xuất Google được xử lý cùng lượt tại `2caa8e1`. [Review lại](evidence/task13/rereview.md) đóng cả ba finding, không phát hiện lỗi mới trong phạm vi bản sửa. Task 13 đạt gate kỹ thuật; kết quả product loop M4 được ghi tiếp tại [Task 14](tutorial-settings-audio.md).

## Hành vi

- Người chơi vẫn có thể dùng phiên khách. Google login qua Neon Auth development; Next xử lý `/api/auth/*`, chỉ `/api/v1/*` được chuyển sang Fastify.
- Guest mới chuyển thành tài khoản giữ nguyên ID. Khi gộp vào tài khoản đã có, bộ bài và lịch sử được giữ. Nếu cả hai có trận đang chơi, người chơi chọn trận tiếp tục; trận còn lại được đóng với `ACCOUNT_MERGE`, không tính thua.
- Phiên game dùng cookie HttpOnly/Secure, kiểm Origin/CSRF và hết hạn không quá 15 phút hoặc thời điểm JWT hết hạn. Gia hạn phiên giữ nguyên request đang chờ; không tự gửi lại thao tác.
- Recovery sau mất phản hồi dùng đúng receipt và bằng chứng phiên trong cửa sổ năm phút. Receipt trùng mã giữa hai principal khiến toàn bộ merge rollback; không xóa hoặc ghi đè receipt.
- Bản nháp và thao tác cục bộ được tách theo principal. Chỉ claim thành công mới chuyển namespace của guest; tài khoản khác không nhận lại thao tác riêng của người dùng trước.
- Lịch sử phân trang 20 trận, chỉ owner được đọc. Tutorial không cộng vào lịch sử thắng/thua.

## Google login thực tế

Ngày 2026-10-21, người dùng báo đã đăng nhập Google nhưng game vẫn hiện nút đăng nhập. Điều tra tìm thấy cache của SDK trả đối tượng session cho lời gọi token sau khi khôi phục callback. Bản sửa sử dụng cơ chế `X-Force-Fetch` của SDK để lấy token mới; verifier được tiêu thụ và xóa khỏi URL trước đó.

Sau bản sửa, người dùng xác nhận **“Đã hiện đúng tài khoản”**. [Bằng chứng tổng hợp](evidence/task13/real-google-acceptance.json) chỉ đọc trên database local riêng xác nhận một tài khoản, một claim hoàn tất và một phiên tài khoản còn hiệu lực, thời hạn không quá 15 phút. Không đọc hoặc ghi ra email, subject, cookie hay token.

Đây là bằng chứng cho Google → callback → claim → giao diện tài khoản. Các bước logout/relogin, merge hai tài khoản đang có trận và bảo toàn draft với provider thật chưa được người dùng kiểm riêng; kiểm tự động cho các tình huống đó được ghi tách biệt.

## Kiểm tra và giới hạn

- 61 test tập trung được phủ qua lần chạy 60/61 và chạy lại file chứa fixture sai. Không chạy lặp bộ kiểm tra toàn dự án.
- Browser ban đầu qua 5/7 case. Sau sửa lỗi SDK và build mới, hai case còn lại đã qua các lần chạy tập trung. Không tuyên bố cả bảy case đã chạy lại trên artifact sau cùng.
- Typecheck, lint, contract generation, API build và Next production build đã qua theo báo cáo implementer. Build browser cố định `API_ORIGIN=http://127.0.0.1:3101`.
- Controller đối chiếu độc lập [265 source hash](evidence/task13/settled-source-manifest.json) và [2.227 artifact hash](evidence/task13/settled-artifact-manifest.json), đều khớp tại thời điểm kiểm tra.
- SDK chính thức chỉ có bản `0.6.0-beta`, được chấp thuận như ngoại lệ riêng. `jose` dùng stable `6.2.12`. Peer warning của dependency UI không sử dụng vẫn được ghi nhận; không nâng hàng loạt dependency để che cảnh báo.

[Báo cáo implementation](evidence/task13/implementation-report.md) giữ đầy đủ phạm vi từng lần chạy và lỗi fixture/runtime đã tìm thấy. Ảnh chọn trận khi merge: [desktop](evidence/task13/merge-desktop.png), [tablet](evidence/task13/merge-tablet.png), [mobile](evidence/task13/merge-mobile.png); [lịch sử mobile](evidence/task13/history-mobile.png).

## Bản sửa sau review

Gia hạn tại chỗ tiếp tục được khi storage lỗi, giữ đúng auth intent trong bộ nhớ và cảnh báo không reload. Chuyển trang sang Google bị chặn nếu không lưu được intent, vì bộ nhớ không tồn tại qua điều hướng. History tự tải lại khi nhận phiên mới; editor đang có thao tác chờ không bị remount. Nếu provider logout thất bại, nút retry chỉ gọi provider, không đăng xuất phiên khách mới; lần đăng nhập mới loại bỏ trạng thái cleanup cũ.

Ba regression tái hiện đúng lỗi trên artifact trước sửa. Bản sửa qua **3/3 case production trong 8,6 giây**, hai test trạng thái cleanup, typecheck/lint và một build web mới. [Kết quả tập trung](evidence/task13/review-fix-verification.json) ghi riêng RED/GREEN; không chạy lại toàn bộ 61 test hoặc bảy browser case cũ. Controller đối chiếu [267 source hash](evidence/task13/review-fix-source-manifest.json) và [2.227 artifact hash](evidence/task13/review-fix-artifact-manifest.json), đều khớp; API artifact không đổi.

Ảnh cảnh báo storage: [desktop](evidence/task13/review-storage-renewal-desktop.png), [tablet](evidence/task13/review-storage-renewal-tablet.png), [mobile](evidence/task13/review-storage-renewal-mobile.png). [Retry đăng xuất provider trên mobile](evidence/task13/review-provider-retry-mobile.png). Phiên Google thực tế của người dùng không bị dừng hoặc đăng xuất để chạy các kiểm tra này.

## Chạy local

Trên máy đã được chuẩn bị:

```sh
cd /home/bia/Works/Coding/oath-front-tcg
pnpm build:api
node scripts/local-auth.mjs
```

Mở `http://localhost:3000`; API ở cổng 3001. Database `oathfront_interactive` độc lập với fixture kiểm thử. Không reset database hoặc dừng phiên chơi này khi chạy kiểm tra tự động. Launcher mới dùng `.next-interactive`; phiên người dùng đang chạy được giữ nguyên.

[Cấu hình và hướng dẫn chi tiết](../AUTH.md) mô tả chuẩn bị database, biến môi trường, callback và bảo vệ thông tin xác thực. Production chưa deploy; shared Google development không thay thế cấu hình OAuth production.
