# Fivefold motion — current presentation (2026-10-21)

The Rivals redesign adds an owned GSAP DOM motion hook for the home assembly (480ms), hero art/name (300ms, powers staggered by 25ms), panels/dialogs (240ms), and phase acknowledgement (180ms). Selection and controls remain immediate. Hero reveals wait for image decode; a changed selection, motion preference, hidden document or unmount cancels the old image listeners and timeline. Hidden home views settle and remove parallax listeners; fine-pointer parallax uses fixed reusable tweens with at most 5px foreground movement. OS and game reduction both restore static content.

Native dialog open, focus, Escape, close and focus restoration retain their existing semantics. Dismissal immediately kills/reverts the entrance; there is no delayed close or duplicate exit dialog. Hand feedback keeps one reversible GSAP context/tween per live card, combines focus and hover, and resets on OS reduction or document hide. The existing game-setting scene teardown also reverts feedback.

Pixi renders seven distinct bounded silhouettes: directional kinetic wedge/speed lines, faceted shield, curved growth leaves/seed, triangular prism shards/rays, tapered ember fragments, broken ink seal/tethers, and paired veil crescents. `effectPalette` mirrors the named `--fx-*` presentation tokens. Immutable content-family mappings are unchanged. Draw/deploy use angular card traces, move uses an afterimage, attack uses local anticipation, damage adds a local burst and outlined number, death adds four bounded fragments, and signature powers frame the hero portrait. Effects use the actual portrait/scene-art/slot anchors, with one cached geometry resolution per selector per draw. Numbers are bounded per active packet and disposed on effect clear or scene teardown. No idle effect ticker or particle loop was added; low-quality renderer allocation remains in force.

`createEventTimeline`, `eventDuration`, `BattleScene.present`, controller cursors and transport boundaries are preserved. Cue progress is linear so travel arrival, local impact and numbers share the existing damage commit at 40% of the event. EVIL anticipation still starts first; GOOD starts 80ms later. All event duration budgets remain unchanged, including the 550ms signature. Reduced effects have a static footprint and opacity acknowledgement, without travel, parallax, zoom or jitter. Pause/hidden suspension, reconnect/fast-forward and >2s backlog handling remain owned by the existing controller.

Focused evidence covers the 40% beat, simultaneous HP/order, normal/reduced state equivalence, pause/dispose/backlog/transport isolation, renderer and number resource cleanup, seven reduced geometry bounds, real Chromium/WebGL effects, rapid hero selection, delayed first-load art, native dismissal, hover/focus reduction and synthetic hidden-document interruption. The intermediate signature and damage screenshots are captured through the real visibility-pause path, not by extending event clocks. Full production build/end-to-end and physical/human acceptance remain separate gates; this work makes no physical frame-time claim.

---

# Historical motion implementation — Task 10

Task 10 tiếp tục từ checkpoint WIP `683a533`, với base review `00fad0e` và commit triển khai `1fc53ca`. Gate production và [review độc lập](evidence/task10/review.md) đã qua. Milestone M3 còn Task 11.

## Phạm vi

Pixi WebGL được tải khi vào trận. GSAP trình bày các event công khai theo sequence; authoritative snapshot và legal actions vẫn do server quyết định. Timeline không gửi gameplay command và không tính damage từ va chạm sprite.

HP trong DOM và canvas dùng cùng nhịp của `DamageBatch`. Trình bày có thể bỏ qua animation để bắt kịp snapshot mới; việc này không được làm mất nhật ký. Task 11 hoàn thiện phân trang log và khôi phục cursor.

Scene sở hữu canvas, texture, observer và timeline; phải dọn tài nguyên khi unmount, ngắt khởi tạo hoặc lỗi renderer. Khi WebGL không dùng được, lớp DOM vẫn giữ tên, chỉ số và điều khiển trận. Chế độ giảm chuyển động giữ nguyên thông tin và lựa chọn của người chơi.

## Kiểm chứng

- Sau khi tiếp tục, 5 case browser development qua: ngắt/remount signature, combat 5 lane ở hai chế độ motion, lỗi renderer và các nhóm hiệu ứng.
- [Baseline toàn workspace](evidence/task10/final-full-test.log): 44 file, 507 test qua trong 137,12 giây.
- Tự review sau baseline phát hiện dim cuối trận bị mất khi cue kết thúc. Regression cho `COMPLETED` và `ABANDONED` thất bại trước sửa; [29 test web cuối](evidence/task10/final-web-test.log) qua sau sửa. Không chạy lại toàn baseline cho thay đổi hiển thị nhỏ này.
- Typecheck, lint và [build cuối](evidence/task10/final-build.log) qua trên source đã chốt.
- [9/9 case production browser qua trong 35,4 giây](evidence/task10/final-production-e2e.log): 5 case motion và 4 case dùng API/PostgreSQL thật. Các fixture DTO của motion chỉ kiểm presentation; không dùng chúng làm bằng chứng engine/API.
- [Bằng chứng lifecycle](evidence/task10/lifecycle.json) ghi renderer WebGL 2.0 thực sự ready, pixel trước/trong signature khác nhau và không có console/page error. CSP cấm `unsafe-eval`; không chấp nhận fallback DOM thay cho gate renderer.
- Combat 5 lane ở [chế độ thường](evidence/task10/combat5-normal.json) và [giảm chuyển động](evidence/task10/combat5-reduced.json) giữ cùng end state/log; các cặp HP cập nhật chung nhịp. [Các nhóm hiệu ứng khác](evidence/task10/effect-families.json) cũng không có lỗi.
- Đối chiếu độc lập [231 source hash](evidence/task10/build-inputs.sha256), 38 chunk JavaScript và 3 artifact trong [manifest build](evidence/task10/bundle-and-artifact.json): không có thay đổi giữa build và kiểm browser.

Ảnh cuối: [desktop](evidence/task10/desktop.png), [tablet](evidence/task10/tablet.png), [fallback 375px](evidence/task10/mobile.png), [signature](evidence/task10/signature.png), [dim cuối trận](evidence/task10/result-dim.png). Các ảnh này dùng nội dung fixture có chủ đích để kiểm presentation.

Bản log đưa vào Git chỉ chuẩn hóa khoảng trắng cuối dòng, ký tự carriage return và dòng trống cuối file; nội dung kết quả giữ nguyên. Log thô vẫn được giữ trong workspace kiểm chứng. Hash ảnh, source và artifact build không bị thay đổi.

## Điểm nối Task 11

`use-match` tiếp tục sở hữu một store, intent controller và ADVANCE pump. Recovery phải nhận response đã validate qua store, giữ revision tăng đơn điệu, rồi fast-forward scene tới snapshot được chấp nhận và bỏ selection cũ.

Cursor trình bày không phải cursor đã đọc log. Khi mount, scene bỏ các hiệu ứng lịch sử; những event đến muộn vẫn phải bổ sung nhật ký mà không phát lại cosmetic đã bỏ qua. Reconnect trong Task 10 chỉ fast-forward checkpoint đã có tại client; Task 11 bổ sung fetch snapshot mới và phân trang nhật ký.

## Review và giới hạn

Review xác nhận đáp ứng spec và chất lượng được duyệt, không có finding chặn. Một finding nhỏ được giao Task 16: context hover/focus còn giữ các tween đã thay thế cho tới khi scene teardown. Cleanup cuối vòng đời hoạt động; cần giới hạn số tween được giữ khi tương tác nhiều trong một trận.


Hình khối hiện tại là placeholder của Task 10. Bộ art cuối thuộc Task 15; không gọi các hình tạm là artwork hoàn chỉnh.

Task 16 đo hiệu năng, viewport, zoom, keyboard và khả năng tiếp cận rộng hơn. Chưa có kết luận FPS hoặc kiểm chứng Safari/thiết bị thật từ các test Chromium này.

CSP production đầy đủ thuộc Task 18. Gate Task 10 kiểm renderer với chính sách cấm `unsafe-eval`; việc có fallback DOM không đủ để kết luận WebGL tương thích CSP.
