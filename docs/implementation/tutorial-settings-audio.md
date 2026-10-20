# Tutorial, cài đặt và âm thanh — Task 14

Implementation từ base `f2dbfac` gồm `c606602` (engine, API và persistence) và `b05c3c8` (giao diện, cài đặt, audio và sửa tích hợp M4). [Review độc lập](evidence/task14/review.md) tìm lỗi Esc trong dialog lồng nhau cùng hai điểm về coverage/copy. Các bản sửa `b3ac70f` và `dff5aa3` đã qua [review lại](evidence/task14/rereview.md), đóng cả ba finding, không phát hiện lỗi mới trong diff. Task 14 và M4 đạt gate kỹ thuật.

## Hành vi

- “Học cách chơi” trên Home mở tám bước phe Thiện; bài bổ sung phe Ác có hai bước. Có thể học lại, bỏ qua hoặc khởi động lại chương hiện tại.
- Tutorial dùng luật combat, mana, block và Location của game. Hai nhánh dùng/giữ signature giữ đúng các kết quả trong [fixture](../contracts/tutorial-v1.scenarios.json); không sửa sát thương hoặc cấp bất tử để ép kết quả.
- Bước học, lựa chọn, script cursor và scene được lưu trên server. Reload tiếp tục đúng bước; chuyển scene là thao tác AUTO có journal để replay. ID và counters tiếp tục tăng khi đổi scene hoặc học lại.
- Hoàn thành phe Thiện và phe Ác được ghi độc lập trên principal. Tutorial không tính vào lịch sử thắng/thua; bỏ qua không ghi hoàn thành.
- Hướng dẫn không dùng modal chặn thao tác. Người chơi vẫn inspect, dùng bàn phím, mở cài đặt và tạm dừng. G02 làm rõ số mana đang có và giá của lá bài.
- Cài đặt lưu theo phiên bản trên thiết bị: mute, âm lượng nhạc, âm lượng hiệu ứng và giảm chuyển động. Cả hai control giảm VFX/chuyển động dùng cùng lựa chọn; vẫn tôn trọng thiết lập giảm chuyển động của hệ điều hành.
- Web Audio chỉ mở sau thao tác người dùng, có hai gain bus riêng, tạm ngừng khi pause/tab ẩn và dọn khi rời màn hình. Các âm hiện tại là âm thử được ghi rõ; bộ âm thanh hoàn chỉnh thuộc Task 15.

## Persistence và khả năng nâng cấp

`0003_tutorial_result.sql` cho phép kết quả `NONE` với lý do `TUTORIAL_COMPLETED`. Backend chỉ ghi trường hợp đó khi tutorial đã hoàn thành; các kết quả trận thường và bỏ cuộc giữ mapping hiện có. Migration đã áp dụng trên database kiểm thử riêng, chưa áp dụng lên Neon hoặc database chơi thử `oathfront_interactive`.

Catalog `core_v1` bất biến được giữ nguyên. Tutorial pin `scenario_id`, checksum manifest và `manifestVersion` vào registry server có phiên bản; thiếu hoặc lệch binding khiến create/read/replay bị từ chối. Các phiên bản registry cũ phải được giữ trong các bản phát hành còn hỗ trợ trận tương ứng. [DATA](../DATA.md) mô tả ràng buộc này.

Checkpoint SKIRMISH cũ không bị chèn field mặc định mới hoặc đổi hash. Sau review, kiểm tra tương thích dùng [fixture được tạo từ mã trước Task 14](../../apps/api/tests/fixtures/pre-t14-skirmish.md), gồm initialization, checkpoint, journal và hash cố định. Lỗi nhỏ Task 8 cũng đã được xử lý: `engineScheduler` reset bot guard khi global turn thực sự thay đổi, khớp kết quả replay.

## Kiểm tra

[Báo cáo implementation](evidence/task14/implementation-report.md) chứa mapping TU01–TU12, lệnh chạy và phạm vi từng artifact.

- Kiểm tra tập trung engine/API/scheduler: 23 test qua; audio unit: ba trường hợp.
- Lượt toàn workspace: **565/566 test qua**. Test còn lại giữ kỳ vọng cũ rằng tutorial chưa được hỗ trợ. Sau khi bỏ subassertion đã lỗi thời, cả **6/6 test** của file đó qua; kiểm tra receipt bị hỏng vẫn được giữ. Không tuyên bố đã chạy lại toàn suite.
- Production M4: **12/13 case qua**. Case còn lại phát hiện thông báo “chưa lưu” sau khi bộ bài đã được lưu thành công. Bản sửa so sánh draft với committed base và trạng thái pending để chọn thông báo đúng.
- Cùng lượt sửa cuối, nút pause được gắn focus target riêng; thêm nút cài đặt không còn làm focus quay về nhầm control.
- Sau một build web cần thiết cho ba file runtime UI thay đổi, **4/4 case production liên quan qua trong 10,2 giây**: saved-source flow, draft chưa lưu, receipt/revision recovery và audio/pause focus. API và engine không đổi sau lượt M4 đầu.
- Typecheck, lint và build đã qua. Controller đối chiếu độc lập **368 source hash và 2.288 artifact hash**, không lệch, trước khi cập nhật tài liệu này. [Biên bản đối chiếu](evidence/task14/controller-verification.json) ghi thời điểm kiểm tra.

Các luồng M4 đã được phủ qua các lần chạy được ghi rõ: Home → hero/deck → trận hai phe → result/history, claim và gia hạn phiên trong pause, tutorial hai nhánh, settings và audio. Không coi 13 case là một lượt chạy mới trên artifact cuối. Lỗi ban đầu được giữ trong [log workspace](evidence/task14/workspace-test.log) và [log browser](evidence/task14/m4-production-browser.log); [log kiểm lại](evidence/task14/m4-production-followup.log) ghi kết quả cuối.

Log trong thư mục evidence chỉ được chuẩn hóa khoảng trắng cuối dòng và dòng trống cuối file khi đóng gói; kết quả, lỗi và lệnh được giữ nguyên. Bản raw vẫn nằm trong workspace kiểm thử; checksum của các bản xuất bản ở `evidence-sha256.json`.

Cảnh báo môi trường màu `NO_COLOR`/`FORCE_COLOR` vẫn được theo dõi ở Task 18. Các lỗi mạng chủ đích trong case offline được phân biệt với lỗi ứng dụng; page errors ghi nhận rỗng.

## Bản sửa sau review

Nhấn Esc khi mở Cài đặt bên trong Tạm dừng trước đây làm sự kiện cancel truyền lên dialog cha và gửi RESUME. Child dialog nay chặn propagation; dialog cha cũng kiểm tra event thuộc chính nó. Regression xác nhận đóng Cài đặt vẫn giữ trận PAUSED, audio suspended và focus ở nút mở Cài đặt; thao tác Resume/Escape trực tiếp trên dialog Tạm dừng vẫn tiếp tục trận bình thường.

Kiểm tra tương thích ban đầu chỉ round-trip một state được tạo bởi mã hiện tại. Bản sửa giữ fixture từ commit `f2dbfac`, với bốn journal entry, 27 event và hash paused/resumed do phiên bản cũ tính. Test nhập các record đó vào database kiểm thử, replay bằng mã mới, đọc qua API rồi RESUME từ revision 4 lên 5, so với hash cũ và xác nhận initialization không đổi. Controller đối chiếu cả 48 source input của bộ tạo fixture với Git blob tại commit cũ, [không lệch](evidence/task14/fix1-controller-baseline-verification.json). Fixture dùng seed test công khai; không lấy dữ liệu người dùng.

Kết quả E02 cũng dùng tên “Kỵ Sĩ Lá” thay cho mã nội bộ. [Regression lịch sử](evidence/task14/fix1-legacy.log) qua một test, bốn test khác được chủ động bỏ chọn. [Hai case production liên quan](evidence/task14/fix1-production-browser.log) qua trong 23,2 giây sau một build web, cùng typecheck/lint. Không chạy lại toàn bộ suite hoặc build API vì runtime API không đổi. [Đối chiếu cuối](evidence/task14/fix1-controller-verification.json) xác nhận 370 source/2.288 artifact hash khớp trước khi hoàn thiện docs.

Lượt lint đầu của bản sửa quét cả source archive dùng tạo fixture và báo lỗi cấu hình lồng nhau. Archive được chuyển ra thư mục scratch ngoài repo; lint cuối qua. Bằng chứng lỗi ban đầu được ghi trong report, không được coi là lượt chạy thành công.

## Bằng chứng giao diện

- Tutorial: [desktop](evidence/task14/tutorial-desktop.png), [tablet](evidence/task14/tutorial-tablet.png), [mobile fallback](evidence/task14/tutorial-mobile.png), [block response](evidence/task14/tutorial-block.png), [giá bài và năng lượng G02](evidence/task14/tutorial-energy.png).
- Cài đặt: [desktop](evidence/task14/settings-desktop.png), [tablet](evidence/task14/settings-tablet.png), [mobile](evidence/task14/settings-mobile.png).
- [Web Audio thực trên Chromium](evidence/task14/audio-browser.json): context cũ đóng khi điều hướng, context mới chạy sau gesture, âm lượng hai bus độc lập, pause/resume và khôi phục cài đặt.

Ảnh tutorial thuộc artifact M4 đầu; ảnh cài đặt/audio được ghi lại trong lượt kiểm cuối sau review. Các thay đổi UI giữa các artifact được ghi rõ trong report. Chiều cao battle/tutorial ở viewport thấp còn thuộc Task 16; ảnh toàn trang không phải bằng chứng mọi control nằm trong viewport.

## Chạy và kiểm tra local

Test browser dùng UI `http://localhost:3200`, API `http://127.0.0.1:3101`, database `oathfront_verification_test`. Có thể chọn cổng UI bằng `OATHFRONT_E2E_PORT`; fixture API nhận cùng origin qua `OATHFRONT_E2E_ORIGIN`. Dev test dùng `OATHFRONT_TEST_DEV=1` và `.next-e2e`; production test dùng `OATHFRONT_E2E_PRODUCTION=1` và artifact `.next`.

Next bake rewrite khi build, vì vậy bản dùng để test phải được build với `API_ORIGIN=http://127.0.0.1:3101`. Origin của launcher chơi thử vẫn là 3000/3001. Phiên người dùng, database chơi thử và ứng dụng khác ở cổng 3100 được giữ nguyên.

Khi muốn khởi động lại bản local có tutorial, dừng launcher cũ bằng Ctrl+C rồi chạy:

```sh
cd /home/bia/Works/Coding/oath-front-tcg
pnpm build:api
node scripts/prepare-auth-db.mjs
node scripts/local-auth.mjs
```

Bước chuẩn bị áp dụng forward migrations vào database chơi thử hiện có và giữ tài khoản/dữ liệu. [Hướng dẫn cấu hình local](../AUTH.md) mô tả các file môi trường cần có. Controller chưa chạy bước nâng cấp này thay người dùng.

## Giới hạn còn lại

Final art/audio thuộc Task 15; bố cục theo viewport, accessibility và đo hiệu năng thuộc Task 16. Chưa xác nhận Safari/iOS autoplay, touch/thiết bị âm thanh thật hoặc đánh giá nghe trực tiếp. Google callback development đã được người dùng xác nhận trong Task 13; các identity fixture tự động không được coi là bằng chứng provider thật.
