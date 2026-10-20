# Kiểm chứng ba phụ lục đề xuất v1.1

Ngày2026-10-20. Đây là kiểm tra tài liệu/schema/fixture/mockup; **không có code game hoặc runtime gameplay được triển khai**.

## Kết quả kiểm tra tĩnh

| Hạng mục | Kết quả thực hiện |
|---|---|
| JSON Schema | Draft7 meta-schema hợp lệ;79 definitions;266 `$ref` nội bộ giải quyết được |
| Ví dụ JSON | 9/9 mẫu qua schema với format checking |
| Mẫu lỗi | 11/11 bị từ chối đúng kỳ vọng |
| Tutorial fixtures | 5 scene ×2 phe =10 bộ kiểm: mỗi bên đúng30 bản card, không trùng handle, không quá2 bản/ID |
| Deck mẫu trên UI | D_G_BV:22 UNIT/8 TRICK; curve8/12/6/2/0/2; cost trung bình2.33 |
| Hình | 8 SVG mới parse/render thành PNG; đã xem4 màn hình ở desktop và tablet; tổng11 cặp SVG/PNG cùng baseline |
| Nguồn | SHA-256 file Downloads giữ nguyên; bản reference byte-identical |
| Phạm vi file | Chỉ Markdown, JSON đặc tả, SVG và PNG; không app/package/runtime code |

Validator thực dùng `jsonschema 4.26.0` qua môi trường uv tạm, không thêm dependency/lockfile vào dự án game. Validate JSON Schema chỉ chứng minh shape/enum/range, không chứng minh ownership, actor legality, replay hoặc transaction.

Các negative cases: lane6; client tự gửi damage; revision sai kiểu; UUID sai; seed trong view; definitionId trên hidden Location; power ID trên opponent block response; phase BLOCK_RESPONSE không tồn tại; target sai shape; thiếu expectedContentVersion; SERVER event lọt vào response.

Ví dụ JSON nằm trong [contracts/examples](contracts/examples/README.md), schema trong [api-v1.schema.json](contracts/api-v1.schema.json), scene setup trong [tutorial-v1.scenarios.json](contracts/tutorial-v1.scenarios.json).

## Kiểm tra tutorial

Đã đối chiếu thủ công arithmetic/card text cho G01–G08 và E01–E02: paired damage, mana giữ giữa hai phase EVIL, Forest không hồi tố, block charge6→0, signature dùng miễn phí/giữ và reveal turn5.

Đã kiểm tự động conservation của card instances/deck và membership ID. **Chưa chạy** toàn bộ chuỗi hành động qua engine vì chưa có engine. TU01–TU12 là expected cases cho T14, không được tính là runtime tests đã PASS.

## Review độc lập và UI

Reviewer đọc ba phụ lục/schema/fixture cùng core rules; phát hiện thiếu dữ liệu để rematch sau reload. Đã bổ sung owner-only RematchConfig trong MatchSummary, lưu180 ngày và expectedContentVersion guard. Reviewer đọc lại fix và không còn phát hiện câu hỏi quan trọng trong phạm vi này.

Review theo ui-ux-pro-max tập trung focus, touch targets, error summary, target selection không phụ thuộc drag và panel block không modal. Sau xem ảnh, đã sửa số liệu deck/curve và khoảng cách footnote trên result tablet; hero power có giá1 và nhãn Signature bằng chữ.

Mockup là wireframe tĩnh; chưa kiểm bằng browser về focus, keyboard, touch, screen reader, console hoặc motion. Không coi ảnh PNG là bằng chứng các behavior đó đã chạy.

## Điều đã được cụ thể hóa

- API/action/target/view/event/error và route summary/rematch có tên field chính xác, schema và ví dụ.
- Tutorial có board/hand/deck/power order, bot script, copy, allowed intent, completion/restart/skip và expected outcomes.
- Hero/deck/block/result có flow, layout desktop/tablet, control states, lỗi/recovery, keyboard và motion contract.
- Task T01/T05/T07/T09/T11/T12/T14/T16 được nối tới phụ lục;18 task và6 milestone sản phẩm vẫn chưa bắt đầu.

Các đề xuất đã đủ cụ thể để đưa vào vòng implementation theo milestone. Balance, FPS, chất lượng art và sự dễ hiểu với người mới còn cần prototype/playtest theo kế hoạch; không có xác suất95% được đo từ lượt kiểm tài liệu này.
