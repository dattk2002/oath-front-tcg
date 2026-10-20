# Tài liệu OathFront

Đây là bộ tài liệu đã thống nhất cho dự án `oath-front-tcg`. Thư mục làm việc chính là `/home/bia/Works/Coding/oath-front-tcg`; repository: [dattk2002/oath-front-tcg](https://github.com/dattk2002/oath-front-tcg).

Bộ tài liệu nguồn từ `five-lane-card-battler` đã được sao chép đầy đủ, gồm Markdown, JSON contract/fixture và mockup SVG/PNG. Tên thế giới “Ngũ Lộ — Bình Minh & Tro Tàn” trong tài liệu thiết kế là nội dung của game; OathFront là tên project mới.

## Đọc trước

1. [Quyết định triển khai mới nhất](OATHFRONT.md): Next.js, monorepo, GitHub và Docker; có ưu tiên cao hơn các lựa chọn Vite/Render trong bản thiết kế ban đầu.
2. [Specification tổng thể](../SPECIFICATION.md): phạm vi game và sáu milestone.
3. [Hosting miễn phí và cấu hình môi trường](HOSTING.md): Vercel Hobby, Neon Free và Docker local.
4. [Kế hoạch triển khai OathFront](superpowers/plans/2026-10-20-oathfront-implementation.md): 18 task theo M1–M6.
5. [Tiến độ implementation và các gate còn lại](implementation/milestones.md): phân biệt phần đã kiểm thử với phần chưa triển khai hoặc còn chờ bằng chứng.

## Gameplay và nội dung

- [Quyết định thiết kế](DECISIONS.md), [luật R01–R22](RULES.md), [hợp đồng hiệu ứng](EFFECTS.md).
- [Hero, class, power, token, Location](CONTENT.md), [60 card](CARDS.md), [sáu deck và policy bot](DECKS.md).
- [Tutorial](TUTORIAL.md), [fixture tutorial](contracts/tutorial-v1.scenarios.json), [kế hoạch balance/playtest](BALANCE.md).

## Kiến trúc, dữ liệu và API

- [Kiến trúc](ARCHITECTURE.md), [database và persistence](DATA.md), [API contract](API-CONTRACT.md).
- [Danh sách contract](contracts/INDEX.md), [JSON Schema](contracts/api-v1.schema.json), [ví dụ request/response](contracts/examples/README.md), [event index](contracts/event-index.json).
- [Compatibility của stack](implementation/compatibility.md), [database local/Neon development](implementation/database-test-environment.md), [HTTP API đã triển khai](implementation/http-api.md).
- [Google login và chạy local](AUTH.md): cấu hình Neon Auth development, database chơi thử riêng và lệnh mở game.

## UI, motion và mockup

- [UI, animation, accessibility và performance budgets](UI-MOTION.md).
- [Màn chọn hero, deck builder, block response và kết quả](SCREENS.md).
- [Battle desktop](design/battle-desktop.png), [battle tablet](design/battle-tablet.png), [cấu trúc card](design/card-anatomy.png).
- [Hero select](design/hero-select-desktop.png), [deck builder](design/deck-builder-desktop.png), [block response](design/block-response-desktop.png), [result](design/result-desktop.png). Mỗi màn có bản tablet và SVG trong `design/`.

## Nghiệm thu và tài liệu gốc

- [Acceptance cases](ACCEPTANCE.md), [tiến độ giai đoạn tài liệu](PROGRESS.md).
- [Kiểm tra tài liệu baseline](VERIFICATION.md), [kiểm tra phụ lục v1.1](VERIFICATION-v1.1.md).
- [Coverage milestone M1 — engine](implementation/m1-engine-coverage.md): acceptance cases, kiểm thử card/skill, replay và giới hạn cần kiểm chứng ở API/trình duyệt.
- [Nền tảng browser — Task 9](implementation/browser-foundation.md): luồng hai phe trên Next standalone/API/PostgreSQL, recovery, ảnh desktop/tablet/fallback và giới hạn kiểm chứng.
- [Motion và renderer — Task 10](implementation/motion-rendering.md): Pixi/GSAP, shared HP beat, cleanup/reduced motion và WebGL dưới CSP; trạng thái review được ghi trong báo cáo.
- [Recovery, block và kết quả — Task 11](implementation/browser-recovery.md): retry trong pause, log phân trang, kết quả/rematch, review và điểm nối sang deck builder.
- [Chọn hero và deck builder — Task 12](implementation/hero-deck-builder.md): draft/revision, lưu trên server, chọn nguồn deck chính xác và recovery qua reload.
- [Tài khoản và lịch sử — Task 13](implementation/auth-sessions.md): claim khách, gia hạn phiên, kiểm chứng Google thực tế và trạng thái review.
- [Tutorial, cài đặt và âm thanh — Task 14](implementation/tutorial-settings-audio.md): scene được lưu/replay, hai nhánh power, settings/audio và kiểm tra product loop M4.
- [Artwork và audio — Task 15](implementation/art-review.md): ảnh gốc, pipeline xuất atlas, audio được biên soạn và bằng chứng kiểm tích hợp.
- [Responsive và accessibility — Task 16](implementation/accessibility.md), [performance và giới hạn đo](implementation/performance.md): bằng chứng viewport, bàn phím, Firefox, GSAP/Pixi và chỉ tiêu p95 còn mở.
- [Nguồn tham khảo PvZ Heroes và công nghệ](REFERENCES.md).
- [Specification v0.1 gốc](reference/SPECIFICATION.v0.1.md), [kế hoạch trước khi chuyển sang Next.js](superpowers/plans/2026-10-20-ngulo-implementation.md).

Các báo cáo kiểm tra tài liệu không phải bằng chứng game đã chạy. Kết quả kiểm thử implementation được ghi riêng trong `implementation/` khi thực hiện; không đánh đồng thiết kế đã duyệt với sản phẩm đã nghiệm thu.
