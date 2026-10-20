# Tiến độ triển khai OathFront

Cập nhật ngày 2026-10-21. Đây là tiến độ implementation; các báo cáo trong giai đoạn thiết kế không thay thế kiểm thử sản phẩm.

| Milestone | Task | Trạng thái | Kết quả |
|---|---|---|---|
| M1 — Content và engine | 1–5 | Đã kiểm thử và review | Catalog đầy đủ, luật/hiệu ứng/combat, projection, public preview và replay deterministic |
| M2 — Persistence, API và bot | 6–8 | Đã kiểm thử và review | PostgreSQL thật, guest/CSRF, receipt, log recovery, bot Dễ/Thường và hai phe chơi hết trận qua HTTP |
| M3 — Trận chơi trên browser | 9–11 | Đạt gate kỹ thuật và review | Trận hai phe, Pixi/GSAP, block, recovery, pause, kết quả và rematch; gate thiết bị thật vẫn được theo dõi |
| M4 — Product loop | 12–14 | Đạt gate kỹ thuật và review | Hero/deck, tài khoản/history, tutorial hai phe và settings/audio; Google login thật đã xác nhận; âm thanh hoàn chỉnh thuộc M5 |
| M5 — Art và chất lượng | 15–17 | Đã review kỹ thuật; còn gate nghiệm thu | Artwork/audio, UI và simulation đã kiểm chứng; p95, balance và playtest người thật còn mở |
| M6 — Release candidate | 18 | Chưa bắt đầu | CI, retention, restore/load test, ba Docker image, runbook và push GitHub |

## Bằng chứng đã có

- [M1 engine coverage](m1-engine-coverage.md): mapping acceptance, 1.000 seed với tối đa 100 transition hợp lệ mỗi chuỗi, không `FAULTED`; parity của preview và giới hạn thông tin công khai.
- [Database local và Neon development](database-test-environment.md): constraints, rollback nguyên transaction, khôi phục checkpoint bằng tiến trình Node riêng, runtime role hạn chế quyền.
- [HTTP API](http-api.md): session/CSRF, owner scoping, retry trước revision, hidden-event cursor, retention summary, deadline và kết quả transaction chưa biết.
- Gate M2: **37 file / 462 test qua**; sau đó ổn định fixture rate limit của test PvE và kiểm lại hai test, sửa forecast lane đã giải quyết trong block response qua **33 test tập trung**, typecheck/lint/build và scoped review.
- [Nền tảng browser — Task 9](browser-foundation.md): baseline toàn workspace tại Task 9 **42 file / 493 test qua**; các sửa cuối được kiểm bằng **17 test web**, **28 test contract**, typecheck/lint/build và **4/4 browser case trên standalone**. Không tuyên bố đã chạy lại toàn suite sau các sửa nhỏ cuối. Có ảnh hai phe ở desktop/tablet/375px và bằng chứng hash source/artifact.
- [Motion và renderer — Task 10](motion-rendering.md): baseline **44 file / 507 test qua**, sau sửa dim cuối trận có **29 test web**, typecheck/lint/build và **9/9 browser case production** qua. WebGL thật chạy với CSP cấm `unsafe-eval`; 231 source hash và 41 artifact hash khớp. Review độc lập đã duyệt, không có finding chặn; một cải thiện nhỏ về giữ tween hover/focus được giao Task 16.
- [Recovery, block và kết quả — Task 11](browser-recovery.md): baseline 518 test; sau sửa cuối có 38 test web/static/build. Browser phủ 29 case qua các lần chạy, rồi 5/5 case production tập trung cho bản sửa pause; review đã đóng finding chặn. Ba nhận xét Task 9 đã xử lý. Cảnh báo rematch khi storage lỗi và nối review deck đúng nguồn được giao Task 12.
- [Hero/deck builder — Task 12](hero-deck-builder.md): API 26 test và web/catalog 79 test; standalone chức năng 11/11, UI cuối 3/3. Review tìm hai lỗi recovery; bản sửa qua 13/13 case tập trung và review lại, 237 source/184 artifact hash khớp. Cảnh báo storage trong save/setup được giao Task 13; cảnh báo màu runner giao Task 18.
- [Tài khoản/lịch sử — Task 13](auth-sessions.md): 61 test được phủ qua các lần chạy tập trung; bảy browser case có bằng chứng qua trên hai artifact được ghi rõ. Người dùng xác nhận Google login thật, database local riêng xác nhận account/claim/phiên có thời hạn. Sau review, ba lỗi UI/storage được sửa và qua 3/3 case production cùng review lại; 267 source/2.227 artifact hash khớp. Cảnh báo storage của Task 12 đã đóng; peer warning SDK được theo dõi ở Task 18.
- [Tutorial/settings/audio — Task 14](tutorial-settings-audio.md): lượt workspace 565/566, kỳ vọng tutorial cũ được sửa rồi nhóm liên quan qua 6/6. Production M4 12/13, lỗi thông báo saved draft được sửa; 4/4 case liên quan qua trên bản build mới. Sau review, lỗi Esc, fixture tương thích và tên bài đã được xử lý, qua hai case production và một regression API rồi review lại. 370 source/2.288 artifact hash cuối khớp; bot guard Task 8 đã đóng.
- [Artwork/audio — Task 15](art-review.md): 96 ảnh gốc, 47 cutout alpha, bảy nhóm VFX, 18 SFX và hai bản nhạc nền đã tích hợp. Tám test tập trung, validator, typecheck và lint qua. Các ca browser có bằng chứng qua trên các bản build được phân biệt rõ trong báo cáo; controller đối chiếu 60 hash khớp. Review tìm lỗi fallback cắt nút retry; bản sửa có RED thực tế, dev 1/1 và production 1/1 qua, tám hash bản sửa khớp, review lại đóng finding. Dung lượng pool cố định khoảng 4 MB ở chất lượng cao; kết quả benchmark tổng thể được ghi riêng ở Task 16.
- [Responsive/accessibility](accessibility.md) và [performance — Task 16](performance.md): 54 test web, static/build, các ca browser tập trung; bản đo performance có 9/9 case bố cục/motion và Firefox 1/1 qua. Controller đối chiếu 27 source, 72 artifact và 54 evidence hash khớp. Review tìm ba điểm nhỏ (gap, tên trạng thái bị lặp và collector lỗi); đã sửa, qua dev 9/9, production 9 pass/1 lỗi fixture rồi 2/2 case liên quan qua trên cùng bản sửa. Review lại đóng cả ba finding; 5 source, 51 artifact và 29 evidence hash của bản sửa khớp. p95 21,4/21,7/22,5 ms chưa đạt mục tiêu 20 ms trên bản build trước sửa CSS/ARIA; không chạy lại benchmark hoặc gán số đo đó cho bản mới. Các ngân sách dung lượng và 20 lần cleanup texture đạt riêng.
- [Simulation/balance — Task 17](balance/core-v1/README.md): 900 trận baseline và 400 stress hoàn tất, không ghi nhận fault/leak/illegal accepted trong phạm vi kiểm. Baseline phe Thiện thắng 80%, mọi cặp hero vượt ngưỡng điều tra; ba vấn đề balance được giữ OPEN, chưa nghiệm thu M5. Có 7 test tập trung, rồi 5 test guard sau review; chỉ chạy lại chín trận chẩn đoán, dữ liệu 900/400 giữ nguyên. Hai finding về provenance và vòng chẩn đoán đã đóng qua review lại; 4 artifact và 4 dependency hash được controller đối chiếu. [Phiếu playtest](balance/core-v1/playtest-vi.md) còn trống, cần năm người × hai trận thật.
- Hai trận HTTP kiểm chứng cuối dùng server Node đã build, có pause rồi SIGKILL/restart, tiếp tục tới `COMPLETED/HERO_DEFEATED` và audit toàn journal từ initialization bất biến. Phe Thiện gặp bot Dễ: thua ở lượt 12; phe Ác gặp bot Thường: thắng ở lượt 11. Không surrender, ép terminal hay `FAULTED`. Đây là bằng chứng tích hợp, chưa phải kết luận balance.
- Test chơi tự động chạy nhanh nên chỉ reset bucket `COMMAND` của principal fixture giữa các request khi cần. Gameplay, checkpoint, journal và giới hạn production không bị sửa; giới hạn 120 command/phút và 10 create/giờ đã được kiểm độc lập bằng API/PostgreSQL.

## Phần chưa được xác nhận

- M3/M4 đạt gate kỹ thuật trên Chromium/Next standalone/API/PostgreSQL. Artwork/audio đã tích hợp và review ở Task 15; cảm nhận âm thanh và các gate thiết bị/người chơi bên ngoài vẫn cần bằng chứng riêng. Benchmark Task 16 đã đo bằng Chrome trên GPU Intel thật; PERF-P95-01 chưa đạt, không tuyên bố toàn bộ performance đã đạt.
- Migrations `0002_bot_guard.sql` và `0003_tutorial_result.sql` đã kiểm trên PostgreSQL test; Neon development đang chờ cập nhật. Database chơi thử của người dùng chưa nhận migration 0003. Production chưa được migrate hoặc deploy.
- Google callback → app claim development đã được kiểm chứng. OAuth/trusted origins production chưa cấu hình; Safari/thiết bị thật và năm người playtest vẫn cần bằng chứng bên ngoài. Các biến thể logout/merge với provider thật chưa được người dùng kiểm riêng, không đánh đồng với kiểm tự động.
- Checkpoint `683a533` đã được push lên GitHub theo yêu cầu; người dùng sau đó yêu cầu tiếp tục triển khai. Các milestone còn lại chưa được nghiệm thu; chưa publish image hoặc deploy production.

## Checkpoint tạm dừng — 2026-10-20

Tại checkpoint tạm dừng, Task 10 có mã WIP cho Pixi WebGL, GSAP presentation queue, HP theo damage batch, reduced motion và cleanup/fast-forward. Checkpoint này đã được push trước khi tiếp tục triển khai theo yêu cầu mới. Các kết quả dưới đây mô tả thời điểm tạm dừng, chưa phải nghiệm thu Task 10.

Tại thời điểm báo dừng: 8 test tập trung qua, typecheck qua; lint từng báo một biến không dùng đã chỉnh nhưng chưa kiểm lại. Browser motion từng có 2 case qua và 1 case timeout khi tải cold scene cho signature. Khi tiếp tục, kiểm tra log lưu lại xác nhận lần chạy sau đã hoàn tất 3/3 trong 27,5 giây sau ranh giới dừng. Checkpoint WIP chưa có production CSP gate hoặc review độc lập; kết quả Task 9 không thay thế nghiệm thu motion.

Kế hoạch chi tiết: [18 task theo M1–M6](../superpowers/plans/2026-10-20-oathfront-implementation.md). Quyết định triển khai mới nhất: [OathFront](../OATHFRONT.md).
