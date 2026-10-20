# Hosting và môi trường OathFront

Quyết định ngày 2026-10-20, theo lựa chọn đã được người dùng chấp thuận. Tài liệu này cập nhật phần hosting của kiến trúc cũ chọn Render.

## Đề xuất đã chọn: Vercel Hobby + Neon Free

- Frontend: Next.js App Router ở `apps/web`, gồm semantic React UI và client renderer PixiJS/GSAP.
- Backend: Fastify ở `apps/api`, deploy riêng với Vercel Functions; frontend chuyển `/api/*` tới backend để giữ cùng origin cho cookie/CSRF.
- Database: PostgreSQL trên Neon. Không đưa connection string vào browser hoặc biến `NEXT_PUBLIC_*`.
- Cả hai app nằm trong cùng pnpm monorepo, dùng chung contracts/content và các package theo phạm vi phù hợp. Private engine state chỉ có ở backend.

Vercel hỗ trợ [Next.js](https://nextjs.org/docs/app/getting-started/deploying), [Fastify](https://vercel.com/docs/frameworks/backend/fastify) và [monorepo](https://vercel.com/docs/monorepos). Cấu hình deploy phải được build/kiểm tra khi đến milestone đóng gói; không coi tài liệu này là bằng chứng đã deploy.

## Điều kiện 0đ

[Vercel Hobby](https://vercel.com/docs/plans/hobby) có giá $0 và dành cho dự án cá nhân, phi thương mại. Hạn mức được kiểm tra gồm 100 GB Fast Data Transfer, một triệu Function invocations và bốn giờ active CPU mỗi tháng. Vượt hạn mức có thể khiến tính năng tạm ngừng; cần xem lại gói khi thương mại hóa.

[Neon Free](https://neon.com/pricing) hiện gồm 1 GB database/project, 100 CU-hours/tháng/project và 5 GB public network transfer/project. Đây là hạn mức sử dụng, không phải cam kết miễn phí mọi quy mô. Không suy ra số người chơi đồng thời từ bảng giá.

Dùng subdomain của nền tảng để tránh chi phí tên miền riêng. Artwork, thiết bị benchmark hoặc dịch vụ bên ngoài khác không được tính là tự động miễn phí bởi gói hosting.

## Neon đã tạo qua MCP

Người dùng chọn workspace Kim và yêu cầu tạo project mới:

| Thuộc tính | Giá trị đã kiểm tra |
|---|---|
| Organization | Kim, `org-solitary-pine-15582991`, plan Free |
| Project | OathFront, `round-darkness-78734677` |
| Region | AWS Singapore, `aws-ap-southeast-1` |
| PostgreSQL | 17 |
| Branch production | `br-old-boat-a1irt1i9` |
| Branch development | `br-odd-pine-a1pw77e9` |
| Auth development | Managed Better Auth; shared Google provider đã có |

[Mở project trong Neon Console](https://console.neon.tech/app/projects/round-darkness-78734677).

Connection string development được lưu trong `.env.neon.local`, quyền file 0600 và được Git bỏ qua. Migrations dùng direct connection; app runtime dùng role hạn chế và pooled connection sau khi setup schema. Không ghi credentials trong tài liệu.

Việc đã provision Auth không chứng minh luồng Google OAuth của game đã hoạt động; callback, session, guest claim và hồi phục phải được kiểm thử trong milestone tương ứng. API hiện trả `suspend_timeout_seconds=0`; yêu cầu đặt 300 giây bị gói tài khoản từ chối. Không khẳng định đã cấu hình được thời gian sleep năm phút.

## Docker local và self-host

Yêu cầu ba image được đóng thành một Docker Compose stack với ba container:

| Service | Image | Trách nhiệm |
|---|---|---|
| UI | `oath-front-ui` | Next.js standalone |
| API | `oath-front-api` | Fastify, engine, bot |
| DB | `oath-front-db` | PostgreSQL 17 local, persistent volume |

Một container chạy từ một image. Compose quản lý ba service thành một ứng dụng, kết nối chúng bằng network và volume riêng; xem [Docker Compose application model](https://docs.docker.com/compose/intro/compose-application-model/).

Profile Vercel dùng Neon thay cho container DB. Không mô tả Vercel Hobby là nơi chạy toàn bộ Docker Compose. Build Docker, smoke test, database restart/resume và tài liệu vận hành thuộc Task 18.

Người dùng đã cho phép commit và push GitHub sau khi hoàn thiện; chưa yêu cầu deploy production hoặc publish image lên container registry.
