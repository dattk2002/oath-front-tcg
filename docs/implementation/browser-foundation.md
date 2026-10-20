# Nền tảng browser — Task 9

Ngày kiểm: 2026-10-20. Source: commit `6974e99`. Implementation đã qua kiểm thử và review độc lập về spec/code quality, không có finding chặn. Đây chưa phải gate hoàn tất M3.

## Phạm vi đã kiểm

Next.js App Router có trang chủ, chọn hero/deck mẫu và route trận đấu. Browser chỉ giữ `PlayerView` cùng event công khai; không nhận private match state. API game đi qua `/api/v1/*`; `/api/auth/*` được dành cho Neon Auth ở Task 13.

Luồng thực tế của cả hai phe: guest → chọn hero/preset/đối thủ → mulligan → chơi UNIT → cập nhật năng lượng/bàn → pass/advance → reload trực tiếp route trận. Kiểm thử chạy với Next standalone, API Node đã build, scheduler bot mặc định và PostgreSQL riêng. Journal được đọc lại để đối chiếu hành động và revision.

Lệnh gặp lỗi mạng hoặc 503 giữ nguyên body và command ID để retry. Response cũ không làm revision lùi; 409 không tự áp lại hành động. Kiểm thử mất response tạo trận xác nhận lựa chọn được phục hồi sau reload, kể cả khi lần tải deck đầu bị lỗi; retry dùng đúng request ban đầu.

## Kết quả và giới hạn của bằng chứng

| Kiểm tra | Kết quả |
|---|---|
| Baseline toàn workspace | 42 file / 493 test qua, 153,90 giây |
| Regression web sau các sửa cuối | 5 file / 17 test qua |
| Contract Node/browser | 2 file / 28 test qua |
| Typecheck, lint, production build cuối | Qua |
| Browser trên artifact standalone cuối | 4/4 qua, 15,3 giây |
| Hash source sau build và E2E | 143 input khớp, không có thay đổi |
| Console trong hai luồng phe | Không có lỗi ngoài dự kiến |

Baseline toàn workspace chạy trước các sửa cuối về pending-create và endpoint deck. Sau đó đã chạy các regression liên quan, static checks, build và toàn bộ bốn browser case; không tuyên bố chạy lại 493 test sau các sửa nhỏ này.

Browser case áp CSP cấm `unsafe-eval`, vẫn cho phép inline hydration của Next. Đây là bằng chứng mã browser không cần biên dịch động, chưa phải nghiệm thu chính sách CSP/nonce production. Generated validators lấy từ cùng JSON Schema với backend; kiểm tra parity, drift và browser import graph không thấy runtime Ajv compiler, Node crypto hoặc engine riêng tư.

Ước tính tổng gzip các script được Home HTML tham chiếu là 227.245 byte, gồm framework và nomodule polyfill. Đây là tổng nén từng file, chưa phải số transfer đo từ trình duyệt hoặc kết quả benchmark M5.

## Ảnh từ bản production đã kiểm

Viewport: desktop 1440×900, tablet 1024×768 và mobile 375×812; ảnh chụp toàn trang. Hình khối minh họa còn là placeholder có nhãn, artwork cuối thuộc Task 15.

| Phe | Desktop | Tablet | Mobile fallback |
|---|---|---|---|
| Thiện | [Ảnh desktop](evidence/task09/good-desktop.png) | [Ảnh tablet](evidence/task09/good-tablet.png) | [Ảnh fallback](evidence/task09/good-mobile.png) |
| Ác | [Ảnh desktop](evidence/task09/evil-desktop.png) | [Ảnh tablet](evidence/task09/evil-tablet.png) | [Ảnh fallback](evidence/task09/evil-mobile.png) |

[Kết quả và hash artifact](evidence/task09/final-verification.json), [bundle/source metadata](evidence/task09/bundle-and-source.json), [manifest source](evidence/task09/build-inputs.sha256), [network Thiện](evidence/task09/good-network.json), [network Ác](evidence/task09/evil-network.json). Network chỉ lưu path/status và thông tin trận fixture, không lưu cookie, token hoặc recovery secret.

## Chạy lại và phần tiếp theo

```bash
pnpm typecheck
pnpm lint
pnpm --filter @oathfront/web exec vitest run
API_ORIGIN=http://127.0.0.1:3101 pnpm build
env -u NO_COLOR OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/match-foundation.spec.ts
```

Dùng database fixture riêng theo [hướng dẫn database](database-test-environment.md); không chạy E2E đồng thời với suite reset database. `API_ORIGIN` được ghi vào rewrite khi build, nên đổi API target cần rebuild. Next dùng Webpack đã kiểm với import NodeNext giữa các package.

Task 10 tiếp tục PixiJS/GSAP; Task 11 tiếp tục block response, result, event-history recovery và multi-tab. Auth/deck builder/tutorial/audio, artwork cuối, screen reader/thiết bị thật/Safari, performance và playtest chưa được nghiệm thu ở đây. License font OFL được giữ nguyên từ upstream, gồm một khoảng trắng cuối dòng; không có lỗi whitespace trong code.

Review có ba nhận xét nhỏ được giao Task 11 trước gate M3: preview cập nhật khi focus/hover hero target, nhãn playability của TRICK và xử lý lỗi browser storage khi lưu pending command. Review đã đối chiếu code, ảnh và hash artifact; không chạy lại suite và không được tính là một lượt E2E thứ hai.
