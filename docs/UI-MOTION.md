# UI, art direction và motion

> **Current runtime presentation (2026-10-21):** the approved [Rivals redesign](superpowers/specs/2026-10-21-oathfront-rivals-redesign.md) and [implementation](implementation/rivals-redesign.md) supersede the historical visual proposals below. Runtime copy is English; historical source names/mockups remain provenance, not current UI copy. The current theme uses black/paper/yellow, Barlow Condensed display and Noto Sans body, six original heroes, a shared Fivefold arena, unclipped focus and 44px controls. Game rules and stable IDs are unchanged.

The current home headline is **FIVE LANES. ONE OATH.** Hero selection is a compact six-portrait roster plus a large paper character stage and four-power rail; its footer is in document flow. Collection uses paper card anatomy with independent quantity controls. Setup reuses hero portraits; battle preserves five lanes and the complete hidden-terrain asset pool. Supported visual checks are 375px fallback, 1024×640 and 1440×900; reflow remains available at 200%. Settings/history/auth/results share these tokens. Major new GSAP choreography is tracked separately in the redesign plan.

---


Tham khảo bố cục đã render: [desktop](design/battle-desktop.png), [tablet](design/battle-tablet.png), [card anatomy](design/card-anatomy.png). SVG cùng tên là nguồn chỉnh sửa. Đây là **wireframe tĩnh**, không phải artwork hoàn thiện hoặc bằng chứng animation chạy mượt.

Bốn màn hình còn lại và tám mockup desktop/tablet ở [SCREENS](SCREENS.md); lời hướng dẫn/gameplay gates ở [TUTORIAL](TUTORIAL.md). SCREENS cụ thể hóa flow hero/deck/block/result mà không thay design tokens dưới đây.

## Nguyên tắc

Đọc board trước, nhận biết lựa chọn hợp lệ tiếp theo, rồi mới thưởng thức effect. Vùng lane có tương phản ổn định, cảnh nền không cạnh tranh với chỉ số. Giao diện chiến đấu dùng bố cục bàn chơi cố định; các mẫu landing page/scroll-pinning/AIDA không áp dụng cho battle HUD.

Thiết kế có chiều sâu 2D: nền vẽ tay, nhân vật cutout nhiều lớp, khung card có chất liệu nhẹ, VFX ngắn. Không bắt buộc model 3D, physics engine hay skeleton rig từng nhân vật.

## Design tokens

| Token | Giá trị / quy tắc |
|---|---|
| Background | `#101923` |
| Surface | `#1B2A38` |
| Raised surface | `#283E49` |
| Text | `#F4EBDD` |
| Muted text | `#B8C8D4` |
| GOOD accent | `#76D9C4` |
| EVIL accent | `#FFB078` |
| Primary/focus | `#F4CB76`, chữ trên nút dùng background |
| Error | `#FFB4AB` + icon và text |
| Spacing | 4/8/12/16/24/32/48 CSS px |
| Radius | Card 16; control 10; badge 6 |
| Font | Noto Sans cho tiếng Việt; Geist cho tiêu đề/numerals nếu glyph Việt đã kiểm tra, fallback Noto Sans |
| Typography | Body16/24; secondary14/20; card title18–22; stat20–24, tabular numbers |
| Control | Hit area≥44×44 CSS px mục tiêu sản phẩm; focus ring3px; gap≥8px |
| Layer | scene0, sprites10, DOM HUD20, selected-card30, popover40, blocking dialog50 |

Không dùng emoji làm icon. Symbol có hình và nhãn để không dựa riêng vào màu. Không đặt chữ luật trong bitmap. Các thông số 11–13px ở wireframe chỉ là annotation thu nhỏ; UI thật phải áp dụng mức typography bên trên, panel cần thiết thì mở rộng/inspect.

## Màn hình và hành trình

| Màn hình | Nội dung / hành động | Loading, empty và error |
|---|---|---|
| Home | Chơi với bot; tiếp tục trận nếu có; tutorial; bộ bài; settings; guest/account | Loading skeleton giữ kích thước; lỗi tải có retry; không tạo trận mới âm thầm khi đang có trận |
| Hero select | 6 hero theo 2 phe; card surface chọn hero; xem class, 4 power, điểm mạnh/yếu | Hero đã chọn có text “Đã chọn”; asset thiếu dùng silhouette có tên |
| Deck select/builder | Deck mẫu/cá nhân; tìm tên/keyword; lọc class, cost, loại; hiển thị 30/30, copy count và mana curve | Save draft dưới30 được; nút Play yêu cầu valid; 2→3 copies bị ngăn và giải thích |
| Opponent setup | Hero bot, Dễ/Thường; mặc định chọn hero phe đối diện theo vòng tuần tự trong danh sách | Không cho cùng phe; deck bot gắn preset; giữ lựa chọn nếu create match lỗi |
| Mulligan | 4 card, chọn lá cần đổi, nút Xác nhận; không lộ power đầu trước khi xác nhận | Chống double submit; refresh giữ pending/committed đúng trạng thái |
| Battle | 5 lanes, hero HP/mana/block, hand, reserve, phase, log, inspect, pause | Pending intent có feedback; offline giữ board nhưng action disabled; retry/resume rõ ràng |
| Block response | Banner “Đã chặn đòn”; power mới mở; Dùng ngay/Để dành | Không auto-play; chọn target như trick; không legal target thì giải thích và cho giữ |
| Pause | Tiếp tục, âm lượng, giảm motion/VFX, đầu hàng | Focus trap; Esc tiếp tục; surrender có xác nhận riêng |
| Result | Thắng/thua/hòa, lý do, lượt, thời lượng active, damage, rematch/đổi deck | Write kết quả idempotent; không cộng số trận hai lần khi reload |
| History/profile | 20 trận/trang; result/time/hero; resume trận đang dở; đăng nhập để đồng bộ | Empty state có CTA chơi; chưa có replay button ở v1 |

Card collection: click surface chọn/inspect bằng label link/button thật; không thêm nút “Open” lặp cho từng card. Các nút +/− deck độc lập, không kích parent; không lồng button trong button.

## Bố cục battle

- Desktop ≥1280×720: board trung tâm 5 cột; log và inspect hai cạnh; opponent trên, người chơi dưới; reserve cạnh hero; hand chân màn hình. Với màn hình cao thấp khác nhau, log/inspect collapse trước khi giảm kích thước stat.
- Tablet ngang ≥1024×640: vẫn thấy cả 5 lane; log/inspect chuyển drawer; reserve mở từ control cạnh hero; hand ưu tiên chọn/inspect thay vì ép mọi text lên thumbnail.
- 10 lá trong tay: xếp quạt với vùng chọn tối thiểu44px mỗi lá, title/cost luôn hiện; focus/tap nâng lá và mở preview cố định. Có chế độ danh sách card trong drawer cho touch/keyboard. Không tràn ngang toàn trang.
- <1024 chiều rộng hoặc <640 chiều cao: shell vẫn đọc được, cho quản lý deck/settings và thông báo “Xoay ngang hoặc dùng màn hình lớn để vào trận”; trận đang có vẫn giữ, không tự surrender. Mobile đầy đủ ngoài scope.
- Zoom200%: dùng layout đọc dạng vùng cuộn và danh sách lane có nhãn, không chặn zoom; inspect text đầy đủ. Battle bằng keyboard cần không phụ thuộc chính xác tọa độ sprite.
- Lane 1→5 giữ cùng thứ tự trên mọi thiết bị. GOOD/EVIL không đảo lane theo góc nhìn.

## Card anatomy

UNIT: cost trên trái, tên tối đa2 dòng, phe/class bằng icon+label, art ở giữa, keyword dưới art, text hiệu ứng, ATK dưới trái/HP dưới phải. Stat gốc và stat hiện tại phân biệt bằng dấu +/− và nguồn khi inspect, không chỉ màu.

TRICK: cost/tên/class/art/text/target; không có ATK/HP giả. SUPERPOWER: dấu signature nếu có, giá bình thường1; trong response hiện “Miễn phí lúc này”. LOCATION: revealTurn/lane/effect timing, không hiển thị mana cost.

On-board unit: silhouette hoặc sprite + stat capsule + status tối đa3 biểu tượng; nhiều status hơn mở disclosure “+n”. Token có nhãn “Triệu hồi”. Inspect hiển thị printed stats, modifiers, duration, source và diễn giải keyword.

Hidden Location hiển thị `? · Mở lượt 5` ở vùng terrain, không giống một quân úp bài. Lane thường ghi “Thường”. Không preload asset dựa theo assignment bí mật; preload cả 8 terrain cùng pool.

## Input và accessibility

Click/tap card → legal targets; chọn UNIT thì lane trống; move thì chọn quân rồi lane đích; click nền/Esc hủy trước gửi. Drag có threshold6px và dùng cùng intent path. Drop ngoài target hợp lệ trả card về tay, không gửi action.

Tab đến hand/board/reserve/phase controls; arrow di chuyển trong nhóm; Enter chọn/xác nhận; Esc hủy/đóng inspect và trả focus nơi mở. Các phím không chiếm shortcut trình duyệt. Target có accessible name gồm lane, quân, stats và lý do hợp lệ.

DOM semantic controls phủ/đồng bộ tọa độ với Pixi; canvas decorative khi đã có semantic layer tương đương. Battle log và live region chỉ thông báo thay đổi quan trọng theo batch, không đọc từng frame/particle. Tất cả popover có click/tap/focus path, không hover-only.

Giảm motion theo OS là mặc định, setting trong game có thể tăng mức giảm. Keyboard, contrast, giảm motion là yêu cầu sản phẩm; kiểm tra thủ công trước beta, không chỉ chạy scanner.

## Motion contract

GSAP là engine choreography chính, dùng scoped `@gsap/react` context, cleanup khi unmount/reconnect/đổi scene. CSS transition chỉ hover/focus/pressed đơn giản. Pixi ticker render, không là đồng hồ luật chơi. Không state game trong onComplete của tween.

| Event | Storyboard | Budget mặc định / reduced |
|---|---|---|
| Select/hover card | Nâng nhẹ, viền focus; không rung layout | 100–140ms / viền ngay |
| Draw | Card từ deck về đúng slot; opponent chỉ tăng count/card back | 220ms / 60ms fade |
| Play unit | Card tới lane, dissolve frame thành sprite; stat hiện ở điểm hạ | 300ms / 80ms fade |
| Trick | Source glow → target link → effect + số liệu | 250–400ms / số liệu + icon |
| Combat pair | Ác wind-up trước; thiện offset80ms; shared impact beat áp dụng cả hai HP; death sau | 420–550ms/lane có giao tranh / 80–120ms |
| Shield/Armor | Shield pop hoặc chip nhỏ; hiện “Chặn”/“Giáp −1” | 120–180ms / text |
| Unit death | Dissolve/collapse theo phe; remove sprite sau damage beat | 180ms / 60ms fade |
| Location reveal | Veil mở, icon/tên/effect hiện; không kéo camera khỏi board | 600ms / 100ms |
| Superpower signature | Portrait accent + rune ngắn, rồi primitive target | tổng≤900ms / icon và effect≤150ms |
| Block | Shield hero flash, meter reset, mở lựa chọn | 250ms / label ngay |
| Win/loss | Board dim và result overlay | 600ms / 120ms fade |

Đây là budget thiết kế, không tiêu chuẩn chung cho mọi animation. Playtest được phép điều chỉnh trong cùng ngôn ngữ. Không shake màn hình mặc định; có tùy chọn effect thấp. Idle chỉ chuyển động nhỏ, dừng khi tab ẩn, pause, reduced motion.

## State và presentation queue

Client giữ hai lớp: `authoritativeView` mới nhất và `presentationCursor`. Events được trình diễn đúng sequence; nhiều packet cùng batch chia sẻ HP commit beat. Animation không tự sinh event luật.

Chỉ gửi intent dựa trên authoritative revision. Trong playback vẫn inspect/pause/settings được. Nếu người chơi muốn hành động khi visual cursor còn cũ, fast-forward về checkpoint mới nhất, cập nhật board/targets rồi yêu cầu chọn lại nếu target thay đổi; không gửi thao tác vào một quân đã mất. Không kéo dài khóa input chỉ để chạy cinematic.

Reconnect hoặc backlog>2 giây: bỏ cosmetic tween, đặt view mới nhất, hủy selection lỗi thời, không replay tất cả VFX đã bỏ lỡ. Không bỏ event logic trong log. Reduced mode giữ nguyên response window/targeting. Game result không phụ thuộc xem animation đầy đủ.

## Asset pipeline

| Nhóm | Số lượng / đầu ra |
|---|---|
| Hero | 6 portrait + bust cutout + accent motif; 1 ảnh đầy đủ/hero |
| Regular cards | 60 illustrations; 38 UNIT có cutout 2D dùng trên bàn |
| Power | 18 icon/illustration, trong đó6 signature có accent riêng |
| Token | 3 cutout; TK_G_LANTERN tutorial-only |
| Terrain | 8 scene strips + icon; nền board dùng chung |
| VFX | 7 family tái sử dụng; không 60 hệ particle riêng |
| Sound | 12–20 SFX family, 2 loop nhạc; nguồn/giấy phép ghi manifest |

Mỗi asset có ID, version, source/prompt, license/provenance, crop-safe bounds, atlas group và kích thước. Không có chữ luật/logo trong generated art. Tạo mẫu hero, 2 unit và 1 terrain trước, duyệt consistency rồi mới sản xuất cả bộ. AI chỉ hỗ trợ art; không dùng LLM để quyết định luật/bot.

Card art source1024px; export thumb256px và inspect512px WebP; unit cutout source512px với alpha và anchor chân; atlas tối đa2048². Cutout 3–6 lớp là tùy chọn cho hero/đơn vị nổi bật; baseline có GSAP transform + mesh/sprite đơn giản đủ idle/attack/hit/death.

## Performance budget và review

Máy chuẩn tạm trong DECISIONS phải thay bằng thiết bị thật trước nghiệm thu. Target: median frame≤16.7ms, p95≤20ms, p99≤33.3ms trong scene10 quân + full hand + mass effect; báo duration đo và renderer. Main-thread task không thường xuyên>50ms.

Initial shell JS gzip≤300KB; battle lazy chunk JS gzip≤900KB; assets cần để vào trận≤12MB; atlas textures active≤128MB; particles≤500 desktop/200 low mode. Đây là budget cần profile, không là kết quả hiện có. Asset loading có progress/error/retry; UI giữ kích thước, CLS target≤0.1.

Review bằng ui-ux-pro-max: contrast, glyph Việt, focus/keyboard, hit area, click thay drag, status không chỉ màu, hidden information, responsive, interruption/cleanup, reduced motion. Wireframe đã kiểm tra hình tĩnh desktop/tablet/card; gameplay, touch, screen reader, FPS và console cần app thật ở milestone triển khai.
