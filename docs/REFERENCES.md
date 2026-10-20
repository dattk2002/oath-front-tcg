# Cơ sở lựa chọn và nguồn tham khảo

Đối chiếu ngày 2026-10-20. Nguồn giúp chọn thiết kế; RULES mới là luật có thẩm quyền của Ngũ Lộ. Các lựa chọn dưới đây đều là **đề xuất đã được chấp thuận** qua yêu cầu “tất cả làm theo đề xuất”.

## Áp dụng từ PvZ Heroes

EA mô tả PvZ Heroes là card game cho phép chọn hero của cả hai phe, có superpower và xây đội bài. Đó là cơ sở tham khảo cho bản sắc hero và quyền chọn phe. [Trang game chính thức EA](https://www.ea.com/games/plants-vs-zombies/plants-vs-zombies-heroes).

Nguồn cộng đồng mô tả thứ tự Zombie Play → Plant Play → Zombie Tricks → Fight. Ngũ Lộ giữ cấu trúc này theo yêu cầu của người dùng, đổi thành thiện–ác và bỏ Environment Card. [PvZ Heroes — gameplay](https://plantsvszombies.fandom.com/wiki/Plants_vs._Zombies_Heroes).

Super-Block của PvZ Heroes có meter8, mức tăng ngẫu nhiên1–3, tối đa3 block và power dùng ngay miễn phí hoặc giữ; khả năng nhận power liên quan chỗ trống trên tay. Ngũ Lộ chủ động đổi sang tăng cố định2 và khay power riêng để người chơi tính trước dễ hơn. Chỉ COMBAT charge là luật riêng trong RULES, không phải khẳng định sao chép mọi ngoại lệ của game tham khảo. [Super-Block Meter — wiki cộng đồng](https://plantsvszombies.wiki.gg/wiki/Super-Block_Meter).

| Giữ làm nền | Điều chỉnh riêng cho Ngũ Lộ |
|---|---|
| Hai phe và phase bất đối xứng | GOOD/EVIL, nội dung và art mới |
| Hero có bộ power riêng | 6 hero, 18 định nghĩa power, 4 slot/hero |
| Bàn lane và giao tranh theo thứ tự | 5 lane; paired damage, animation EVIL trước |
| Power đầu trận và block response | Fixed-charge block; reserve tách hand |
| Deck theo class hero | 30 lá, tối đa2 bản;22 ID hợp lệ/hero |
| Lựa chọn placement có ý nghĩa | 3 Location cố định, reveal turn1/3/5 từ spec gốc |

Không lấy meta, giá trị balance hoặc toàn bộ mechanics hiện hành của PvZ Heroes làm chuẩn nghiệm thu cho game mới.

## So sánh frontend

Đây là đánh giá kiến trúc cho phạm vi đã chốt, không phải benchmark giữa framework.

| Phương án | Đánh giá |
|---|---|
| **React + Vite + PixiJS + GSAP — đề xuất** | React phù hợp màn hình, card text, form, keyboard; Pixi giữ phần sprite/VFX; GSAP điều phối motion. Pure engine độc lập giúp test và server dùng chung luật. |
| React + DOM + GSAP | Ít lớp rendering hơn, tốt cho prototype card thuần DOM. Với yêu cầu nhân vật2D/terrain/particles rõ ràng, chọn Pixi từ đầu nhưng lazy-load battle. |
| Phaser + lớp UI DOM | Hợp khi cần nhiều game-scene facilities; scope hiện không cần physics/camera/game loop quyết định luật. Có thể dùng, nhưng thêm framework scene trong khi GSAP và React đã có trách nhiệm rõ. |
| Next.js cho toàn app | Có ích khi app cần server rendering/content routes sâu. Core này là interactive SPA và API turn-based; Vite/Fastify giúp ranh giới engine/presentation dễ nhìn. Không có yêu cầu SEO cho battle. |

React nêu Vite trong các build tool để tạo app; Pixi tập trung 2D renderer; Phaser cung cấp game framework; GSAP có tích hợp lifecycle React. Các mô tả capability dựa trên tài liệu chính thức: [React](https://react.dev/learn/build-a-react-app-from-scratch), [PixiJS](https://pixijs.com/8.x/guides/getting-started/intro), [Phaser](https://docs.phaser.io/), [GSAP React](https://gsap.com/resources/React/).

Quyết định chọn không bảo đảm 60 FPS. Ranh giới DOM/Pixi, kích thước texture, số particle và lifecycle timeline phải được profile theo UI-MOTION/T16.

## Backend và Neon

Neon Postgres là yêu cầu người dùng. Đề xuất Drizzle/pg, connection pool dùng lại và transaction row lock để mỗi lệnh lưu state/events/receipt nguyên tử; migrations dùng direct URL. Nguồn kỹ thuật: [Drizzle + Neon](https://orm.drizzle.team/docs/connect-neon), [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

Google login qua Neon Auth; app quản lý guest và session cookie riêng. Production OAuth phải cấu hình application/origin phù hợp; JWT verify dùng hợp đồng provider, không suy ra issuer từ URL tùy ý. [Neon OAuth](https://neon.com/docs/auth/guides/setup-oauth), [Neon JWT](https://neon.com/docs/auth/guides/plugins/jwt).

Chọn một service phục vụ static app và API cùng origin để đơn giản session/cookie. Singapore là mục tiêu vùng cho Render và Neon, cần kiểm availability/gói thực tế trước provision. [Render regions](https://render.com/docs/regions), [Neon regions](https://neon.com/docs/introduction/regions).

Các phiên bản dependency, giá và account/resource cụ thể chưa được khóa bằng việc viết spec. T01 xác minh compatibility; T18 kiểm ngân sách và điều kiện phát hành.

## Bổ sung cho API, tutorial và screen

Trailer chính thức giới thiệu Strategy Decks như các deck mẫu gắn với từng hero, giúp người mới tiếp cận deck building. Ngũ Lộ chọn cách trình bày hero→bốn power→deck mẫu, với toàn bộ nội dung mở sẵn. Chỉ phần mô tả/index của trailer được truy cập ở lượt này; không khẳng định đã xem toàn video. [Strategy Decks Walkthrough Trailer](https://www.youtube.com/watch?v=L5qlwZscq5U).

Ảnh tham khảo hero/deck UI được xem qua kết quả tìm kiếm hình ảnh; không tải vào asset game: [MobyGames](https://www.mobygames.com/game/81412/plants-vs-zombies-heroes/screenshots/android/867772/), [WWGDB](https://www.wwgdb.com/games/plants_vs_zombies_heroes).

Không tìm thấy API nội bộ chính thức để dùng làm chuẩn; contract Ngũ Lộ là thiết kế riêng. Draft7 được chọn theo baseline ví dụ của Fastify; object đóng bằng additionalProperties. [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), [JSON Schema object](https://json-schema.org/understanding-json-schema/reference/object).
