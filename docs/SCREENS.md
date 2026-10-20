# Màn hình chi tiết — đề xuất v1

Tiếp nối design tokens trong [UI-MOTION](UI-MOTION.md). Bốn màn hình còn thiếu được chốt ở đây: hero select, deck builder, block response và result. Đây là thiết kế/mẫu tĩnh; chưa có UI runtime.

PvZ Heroes giúp định hướng cách gắn hero, class, power và deck thành một lựa chọn chiến thuật. Trailer Strategy Decks chính thức mô tả deck mẫu riêng theo hero; Ngũ Lộ áp dụng cách giới thiệu đó với toàn bộ card mở sẵn. [Strategy Decks — Plants vs. Zombies](https://www.youtube.com/watch?v=L5qlwZscq5U).

Đã đối chiếu ảnh hero/deck UI qua [MobyGames](https://www.mobygames.com/game/81412/plants-vs-zombies-heroes/screenshots/android/867772/) và [WWGDB](https://www.wwgdb.com/games/plants_vs_zombies_heroes). Đây là ảnh tham khảo bố cục từ bên thứ ba, không phải chứng nhận giao diện hiện hành hoặc nguồn asset để dùng lại.

## 1. Quyết định chung

- Giữ Noto Sans, màu GOOD ngọc lam/EVIL cam, nền tối và focus vàng theo UI-MOTION.
- Header gọn có Back, tên màn hình và settings/account. Không đưa bố cục landing page, scroll pin hoặc CTA marketing vào game screens.
- Một CTA chính cho mỗi trạng thái; tên nút mô tả hành động. Card/hero surface chọn hoặc inspect; +/− độc lập, không nested interactive.
- Motion chuyển trạng thái bằng GSAP: chọn hero180ms; panel đổi160ms; thêm/bớt card140ms; response250ms; result600ms. Reduced chuyển opacity≤100ms hoặc hiện ngay; không khóa input chờ cinematic.
- Body16px, secondary14px, title card18–22px; hit targets≥44×44px. Không thu nhỏ chữ để nhét toàn bộ card text.
- Layout desktop1440×900 và tablet1024×768 có mockup riêng. Wireframe dùng silhouette placeholder; minh họa không phải final art.

## 2. Hero select

[Desktop](design/hero-select-desktop.png) · [Tablet](design/hero-select-tablet.png)

**Route:** `/heroes`. Entry từ Home “Chơi với bot” hoặc “Đổi hero”. Không tạo match khi vừa chọn một hero.

**Desktop:** header80px; phần chọn hero bên trái khoảng860px, detail bên phải khoảng460px. Sáu hero theo hai hàng GOOD/EVIL, mỗi hàng3. Mỗi hero tile gồm portrait, tên, hai class, một mô tả chiến thuật và trạng thái “Đã chọn”. Không dùng rarity/lock vì cả sáu mở sẵn.

**Detail:** tên/danh hiệu, class bằng chữ+icon; điểm mạnh/yếu ngắn; bốn power hiện tên/cost/target. Signature có nhãn “Signature”, không chỉ viền màu. Power surface mở full text inspector; không thể cast ở màn hình này.

**CTA:** “Chọn bộ bài” dùng hero đang chọn. Secondary “Học cách chơi”. Mặc định hero đã dùng gần nhất; lần đầu An Nhiên có nhãn “Đề xuất cho người mới”. Không tự bắt đầu match hoặc tự chọn hero bot ở bước này.

**Tablet:** tiles2 cột, panel detail bên phải hẹp hơn hoặc mở drawer cùng viewport; portrait/detail co theo không gian, text không dưới14px. Footer CTA luôn nhìn thấy; grid scroll không che focus. Mockup tablet dùng lưới2 cột bên trái và detail bên phải.

**Keyboard:** một radio group chọn hero; arrow chuyển focus+selection, Enter trên CTA đi tiếp; power inspect là button riêng ngoài radio. Back giữ lựa chọn. Trong loading, tiles giữ kích thước; lỗi catalog có Retry, không hiển thị dữ liệu giả.

| Hero | Deck mẫu hiển thị | Mô tả ngắn |
|---|---|---|
| An Nhiên | Vườn Thành Kiên Cường | Giữ quân bằng Khiên, hồi phục rồi giành bàn |
| Lam Vệ | Phòng Tuyến Pha Lê | Chặn nhịp đối thủ và giữ vị trí tốt |
| Mộc Dao | Đường Mòn Sinh Trưởng | Tăng sức quân, đổi lane để mở đường |
| Hắc Luyện | Tro Tàn Ăn Mòn | Gây damage, kết hợp Độc để bào mòn |
| Dạ Vũ | Đòn Đánh Chạng Vạng | Tấn công nhanh và tạo đòn Xuyên |
| Mặc Ảnh | Màn Sương Độc | Đổi vị trí, đặt Độc và duy trì lợi thế bài |

Mapping theo hero→preset ở DECKS; `strategyKey` theo preset ID lowercase, ví dụ `deck.d_g_bv.strategy`.

## 3. Deck select và builder

[Desktop](design/deck-builder-desktop.png) · [Tablet](design/deck-builder-tablet.png)

**Routes:** `/heroes/:heroId/decks`, `/decks/new?hero=:heroId`, `/decks/:deckId/edit`.

Deck select có “Deck mẫu — đề xuất”, deck cá nhân và “Tạo bộ bài”. Deck mẫu show chiến thuật, curve và30/30; “Dùng bộ bài này” đi opponent setup, “Tùy chỉnh” tạo bản sao local. Chọn card surface mở preview deck, không gửi write.

**Builder desktop:** catalog bên trái khoảng920px, deck list bên phải khoảng432px; cả hai có vùng cuộn riêng trong content. Header có tên deck và hero/class; footer có trạng thái lưu, count và CTA. Catalog mặc định chỉ22 card hợp lệ; không hiện card sai class để người mới phải đoán.

Catalog filter: tìm theo tên/keyword; class “Tất cả / class1 / class2 / Chung”; type “Tất cả / Nhân vật / Trick”; cost “Tất cả / 1 / 2 / 3 / 4 / 5 / 6+”. Kết hợp bằng AND. Sort mặc định cost tăng, tên chuẩn hóa tiếng Việt, ID làm tie; tìm kiếm bỏ dấu/không phân biệt hoa thường nhưng vẫn hiện text gốc.

Mỗi card có cost/name/art/stat hoặc type, quantity0/2–2/2, + và−. Click surface inspect; + thêm một bản,− bớt một. Đã2 bản thì + disabled và có text “Tối đa2 bản”. Đủ30 thì + disabled với lý do “Bộ bài đã đủ30 lá”; vẫn bớt được. Không cần sở hữu/crafting currency.

Deck list sắp cost rồi name; mỗi row có cost, title và quantity. Chọn row mở inspector với quantity controls44px, cùng hành động với +/− trong catalog. Danh sách15 ID có thể cuộn; không ép hàng xuống32px để nhét tất cả. Inspect hỗ trợ full text và tooltip keyword.

**Summary:** tổng30/30, unit/trick counts, curve buckets1/2/3/4/5/6+, cost trung bình. Curve dùng số bản thực, không số ID; tooltip có số lá và bảng text thay thế. Ví dụ D_G_BV:22 UNIT/8 TRICK, cost trung bình2.33; schema manifest là nguồn tính khi implement.

**Save:** explicit “Lưu bộ bài” cho draft0–30 hợp lệ về class/copy. Giữ local draft trong sessionStorage theo deckId/revision, không gọi nó là cloud save. Lưu thành công hiện “Đã lưu”; tên trống hoặc invalid field có inline error + focusable summary.

**Play:** CTA “Lưu và tiếp tục” chỉ enabled khi tổng30, name hợp lệ và không save in-flight. Nếu không có thay đổi thì “Chọn đối thủ”. Save xong mới điều hướng; lỗi giữ draft. Chọn opponent Dễ/Thường sau builder, rồi mới POST match.

**Stale revision409:** dialog “Bộ bài đã thay đổi ở tab khác”; hai lựa chọn “Tải bản mới” và “Lưu thành bản sao”. Không overwrite tự động; local draft không bị xóa trước lựa chọn. Rời màn hình khi dirty: “Lưu / Rời đi / Ở lại”, không discard ngầm.

**Tablet:** catalog3 cột và deck panel mở bằng “Bộ bài · 30/30”; mockup hiển thị panel cùng screen khi đủ1024px, còn inspector dùng overlay. Thanh search/filter wrap; footer không che row cuối. Mobile nhỏ vẫn sửa deck được bằng1–2 cột và list drawer; battle fallback theo UI-MOTION.

## 4. Block response

[Desktop](design/block-response-desktop.png) · [Tablet](design/block-response-tablet.png)

**Route:** vẫn `/matches/:id`; không đổi sang screen khác hoặc thay phase thành GOOD_PLAY. Source duy nhất `view.blockResponse` và legalActions.

**Desktop:** board giữ đủ5 lane, thu vùng log/inspect thành panel quyết định bên phải. Banner “Đã chặn đòn”; meter0/8 và “Còn2 lần chặn”; power mới hiển thị tên, signature, full text, “Miễn phí lúc này”. Các power cũ chỉ inspect, không có nút dùng.

**Hai lựa chọn:**

1. “Dùng ngay · 0” — đề xuất về cách trình bày, không mặc định thay người chơi chọn. Nếu power NONE, gửi USE_BLOCK_POWER sau click. Nếu cần target, chuyển panel sang “Chọn mục tiêu”, highlight legal targets; click/tap/Enter target gửi intent.
2. “Để dành” — gửi KEEP_BLOCK_POWER; power ở reserve giá1 để dùng đúng phase.

Không auto-play, timeout hay nút X đóng như đã chọn KEEP. Esc trong targeting trở về lựa chọn; Esc tại lựa chọn không gửi command. Không đủ target: nút dùng disabled, ghi “Hiện không có mục tiêu hợp lệ”; Để dành vẫn enabled.

Đây là **panel không modal**: focus chuyển tới heading khi mở, sau đó đến hai lựa chọn; người chơi vẫn dùng keyboard inspect board/pause. Khi targeting, focus chuyển tới target đầu tiên; cancel trả về nút dùng. Khi gửi command, chỉ khóa controls có thể gửi lặp, báo “Đang xác nhận…”.

**Tablet:** panel dưới bàn, hand thường thu vào nút “Tay bài”; board vẫn thấy5 lane và stats. Chỉ target được chọn mới nâng highlight; không dùng drag bắt buộc. Không để panel che hero HP hoặc lane5.

**Mất mạng/reload:** giữ label “Đang kết nối lại”; sau snapshot phải còn đúng power miễn phí và continuation. Không dùng local countdown. Response cũ tới sau snapshot mới không mở lại panel. Nếu kết thúc trận trong root trước response, đi Result; không hiển thị lựa chọn vô hiệu.

**Motion:** block flash250ms; power lift180ms; target link≤250ms. UI điều khiển dựa trên server state, có thể fast-forward cosmetic để chọn. Reduced giữ label, cost và focus; không bỏ cửa sổ lựa chọn.

Mockup minh họa scene D/G07: An Nhiên10 HP, mana0, đã block1; S_G_BV vừa cấp; GC02 lane4 là mục tiêu. Hai nhánh dùng/giữ ghi trong TUTORIAL.

## 5. Result

[Desktop](design/result-desktop.png) · [Tablet](design/result-tablet.png)

**Entry:** match terminal snapshot đã commit; overlay trên board dim, sau đó có thể đọc cùng dữ liệu ở `/history/:matchId`. History route dùng GET match summary từ list/cache; nếu cần direct link, GET match phải còn result projection khi detailed checkpoint hết retention, theo quy định bên dưới.

**Desktop:** hero người chơi và trạng thái lớn ở giữa, outcome và lý do bằng text; dưới là turn, thời gian hoạt động, damage lên hero địch, block đã dùng. Chỉ số không có ranking/reward. Board bị dim nhưng không cần phát lại cinematic để xem kết quả.

| Trạng thái | Heading | Copy / CTA |
|---|---|---|
| WIN | Chiến thắng | “Hero đối phương đã bị hạ.” hoặc lý do đúng outcome; “Chơi lại” / “Đổi bộ bài” |
| LOSS HERO_DEFEATED | Thất bại | “Hero của bạn đã bị hạ.”; hai CTA như trên |
| LOSS SURRENDER | Đã đầu hàng | “Trận đấu đã kết thúc.”; không hiện lỗi |
| DRAW SIMULTANEOUS_LETHAL | Hòa | “Hai hero cùng bị hạ trong một chuỗi hiệu ứng.” |
| DRAW TURN_LIMIT | Hòa | “Đã kết thúc lượt20.” |
| ABANDONED | Trận đã đóng | Expiry hoặc merge có copy riêng; không tính thua |
| FAULTED | Trận bị gián đoạn | “Không tính thắng hoặc thua.”; matchId cho hỗ trợ; “Về trang chủ” |
| Tutorial complete | Đã hoàn thành hướng dẫn | “Chơi với bot” / “Học phe Ác” hoặc “Học lại”; không hiển thị WIN |
| Tutorial skip | Đã bỏ qua hướng dẫn | “Bạn có thể học lại trong phần Cài đặt.” |

`activeDurationMs` là xấp xỉ theo API-CONTRACT; label “Thời gian hoạt động”. `damageDealt` chỉ damage vào hero địch, không cộng unit damage. Tooltip giải thích nếu tổng lớn hơn20 vì hero đã hồi máu.

**Rematch:** giữ human hero, deck source/revision, bot hero và difficulty; tạo match mới với commandId/seed mới. Không replay seed cũ. Nếu content/deck không còn hợp lệ, đưa về builder với thông báo, không thay card ngầm. Double click/retry tạo tối đa một trận mới; active-match conflict cho Resume.

Config lấy từ `MatchSummary.rematch`, được giữ cùng result180 ngày để reload/deep link vẫn dùng đúng deck. expectedContentVersion trong create bảo vệ trường hợp catalog đổi sau khi mở result; version lệch yêu cầu xem lại deck. Màn hình không đoán deck từ hero hoặc “deck gần nhất”.

**History sau hết full-log retention:** cần summary endpoint riêng `GET /matches/:id/summary` trả MatchSummary, không dựng PlayerView giả từ summary. Đây là endpoint bổ sung cho deep link; same-owner404 như các route khác. GET full match trả410 MATCH_DETAILS_EXPIRED khi checkpoint đã hết hạn; summary vẫn giữ tới180 ngày. Chi tiết contract phải cập nhật cùng schema.

**Tablet:** kết quả/portrait gọn, stats2×2; CTA full-width hoặc hai cột nếu đủ; nội dung cuộn có footer spacer. Focus vào heading, trap trong result dialog cho tới khi đi route khác; Back đưa history/home, không khôi phục trận terminal.

## 6. Nghiệm thu UI bổ sung

| ID | Điều kiện |
|---|---|
| UX01 | Chọn6 hero đều thấy đúng2 class/4 power; CTA không tạo match sớm |
| UX02 | Deck builder22 eligible cards, curve đếm số bản;0/2→2/2 đúng; không copy3 |
| UX03 | Save/stale/offline giữ draft; error summary dẫn focus tới field lỗi |
| UX04 | Block response đủ hai nhánh, no-target, Esc, keyboard, reload; không auto KEEP |
| UX05 | Result phân biệt WIN/LOSS/DRAW/ABANDONED/FAULTED/tutorial; rematch idempotent |
| UX06 | Cả4 màn hình desktop/tablet không che target/focus; text≥14px, controls44px; reduced motion giữ ý nghĩa |

Review dùng ui-ux-pro-max: focus ring, focus không bị panel che, modal/non-modal đúng vai trò, error summary + inline feedback, contrast, target size và keyboard tương đương pointer. Mockup chứng minh bố cục; behavior phải nghiệm thu T11/T12/T14/T16.
