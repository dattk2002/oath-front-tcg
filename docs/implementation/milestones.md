# Tiến độ triển khai OathFront

Cập nhật ngày 2026-10-20. Đây là tiến độ implementation; các báo cáo trong giai đoạn thiết kế không thay thế kiểm thử sản phẩm.

| Milestone | Task | Trạng thái | Kết quả |
|---|---|---|---|
| M1 — Content và engine | 1–5 | Đã kiểm thử và review | Catalog đầy đủ, luật/hiệu ứng/combat, projection, public preview và replay deterministic |
| M2 — Persistence, API và bot | 6–8 | Đã kiểm thử và review | PostgreSQL thật, guest/CSRF, receipt, log recovery, bot Dễ/Thường và hai phe chơi hết trận qua HTTP |
| M3 — Trận chơi trên browser | 9–11 | Đang triển khai | Task 9 đã kiểm thử/review; tiếp tục PixiJS/GSAP và recovery, chưa nghiệm thu milestone |
| M4 — Product loop | 12–14 | Chưa bắt đầu | Hero/deck builder, Google login/claim, history, tutorial và settings |
| M5 — Art và chất lượng | 15–17 | Chưa bắt đầu | Asset hoàn chỉnh, responsive/accessibility/performance, simulation và playtest |
| M6 — Release candidate | 18 | Chưa bắt đầu | CI, retention, restore/load test, ba Docker image, runbook và push GitHub |

## Bằng chứng đã có

- [M1 engine coverage](m1-engine-coverage.md): mapping acceptance, 1.000 seed với tối đa 100 transition hợp lệ mỗi chuỗi, không `FAULTED`; parity của preview và giới hạn thông tin công khai.
- [Database local và Neon development](database-test-environment.md): constraints, rollback nguyên transaction, khôi phục checkpoint bằng tiến trình Node riêng, runtime role hạn chế quyền.
- [HTTP API](http-api.md): session/CSRF, owner scoping, retry trước revision, hidden-event cursor, retention summary, deadline và kết quả transaction chưa biết.
- Gate M2: **37 file / 462 test qua**; sau đó ổn định fixture rate limit của test PvE và kiểm lại hai test, sửa forecast lane đã giải quyết trong block response qua **33 test tập trung**, typecheck/lint/build và scoped review.
- [Nền tảng browser — Task 9](browser-foundation.md): baseline toàn workspace mới nhất **42 file / 493 test qua**; các sửa cuối được kiểm bằng **17 test web**, **28 test contract**, typecheck/lint/build và **4/4 browser case trên standalone**. Không tuyên bố đã chạy lại toàn suite sau các sửa nhỏ cuối. Có ảnh hai phe ở desktop/tablet/375px và bằng chứng hash source/artifact.
- Hai trận HTTP kiểm chứng cuối dùng server Node đã build, có pause rồi SIGKILL/restart, tiếp tục tới `COMPLETED/HERO_DEFEATED` và audit toàn journal từ initialization bất biến. Phe Thiện gặp bot Dễ: thua ở lượt 12; phe Ác gặp bot Thường: thắng ở lượt 11. Không surrender, ép terminal hay `FAULTED`. Đây là bằng chứng tích hợp, chưa phải kết luận balance.
- Test chơi tự động chạy nhanh nên chỉ reset bucket `COMMAND` của principal fixture giữa các request khi cần. Gameplay, checkpoint, journal và giới hạn production không bị sửa; giới hạn 120 command/phút và 10 create/giờ đã được kiểm độc lập bằng API/PostgreSQL.

## Phần chưa được xác nhận

- Nền tảng browser đã được kiểm; motion, recovery đầy đủ và luồng sản phẩm chưa được nghiệm thu. Ba nhận xét nhỏ của review Task 9 về preview hero, nhãn TRICK và lỗi browser storage được giao Task 11 trước gate M3.
- Migration `0002_bot_guard.sql` đã kiểm trên PostgreSQL local; Neon development đang chờ áp dụng migration này. Production chưa được migrate hoặc deploy.
- Google OAuth callback thật, Safari/thiết bị thật và năm người playtest vẫn là các gate cần bằng chứng bên ngoài.
- Chưa push GitHub, publish image hoặc deploy production. Push sẽ thực hiện sau các milestone và review tích hợp cuối.

Kế hoạch chi tiết: [18 task theo M1–M6](../superpowers/plans/2026-10-20-oathfront-implementation.md). Quyết định triển khai mới nhất: [OathFront](../OATHFRONT.md).
