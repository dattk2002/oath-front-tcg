# Kế hoạch kiểm chứng balance

Không có kết quả mô phỏng hay người chơi thật trong bộ tài liệu này. Các ngưỡng dưới đây là tiêu chí điều tra, không phải kết luận v1 đã cân bằng.

## Mục tiêu trải nghiệm

- Đa số trận hoàn thành trong 5–10 phút ở tốc độ mặc định, không tính pause/mất mạng.
- Người mới sau tutorial có thể chơi một trận mà không cần đọc tài liệu ngoài.
- Mỗi hero có phương án giành bàn, xử lý quân, hồi phục/bảo vệ hoặc kết thúc trận; điểm yếu được giải thích trong hero inspect.
- Location turn5 cần ảnh hưởng đủ số trận để có ý nghĩa; không ép trận kéo dài chỉ để show reveal.
- Bộ card không yêu cầu asset/effect phức tạp vượt scope để thể hiện chính xác.

## Ma trận mô phỏng

3 hero GOOD × 3 hero EVIL = 9 matchup. Với mỗi matchup: 100 seed cố định ở bot Thường-vs-Thường; tổng **900 trận** cho baseline. Thêm 100 seed cho từng scenario stress: full board, late draw, block response+move, mass poison/armor. Chạy sau khi engine và bot có thật.

Một run pin phiên bản engine, content, bot và seed list. Không ghép kết quả nhiều version. Giữ ít nhất 20 seed regression bất biến qua các bản sau. Logs test được phép có full state trong môi trường tin cậy; không đưa fixture seed live vào client.

## Chỉ số và ngưỡng điều tra

| Chỉ số | Ngưỡng cần xem lại |
|---|---|
| Win rate phe/hero | Ngoài 40–60% trong baseline; luôn báo sample size, không dùng như kiểm định chắc chắn |
| Kết thúc bằng turn limit | >5% |
| Kết thúc trước turn5 | >40%, cần xem reveal lane5 có thường bị bỏ qua |
| Tỷ lệ block được dùng trong trận | Quá thấp hoặc cả ba block phổ biến trước turn6 |
| Card không bao giờ được bot chơi | Kiểm tra legality/heuristic trước khi gọi card yếu |
| Card “bắt buộc” trong deck người chơi | >80% trong mẫu đủ đa dạng; kiểm tra pool class nhỏ |
| Tỷ lệ quit vì chờ/không hiểu | Thu thập từ beta, hỏi đúng khoảnh khắc gây khó hiểu |
| Location làm đổi kết quả | Phân tích theo matchup, lane reveal và pre-reveal deployment |
| Fault/illegal accepted/private leak | 0; blocker phát hành |

Các matchup dùng cùng seed có kiểm soát nhưng không đổi vai phe của hero. Không kết luận “phe ác lợi thế vì đánh trước” từ animation; damage pair theo luật.

## Kiểm tra nội dung đặc biệt

F06 damage hero bypass block; F04/P05/S05 Pierce; Poison với Armor; hồi máu V05 + Healing Spring; Khóa Gương so với Frozen Lake; S_E_FS ở response lane sớm; death damage cùng lethal; power chưa dùng tới cuối trận.

## Thử với người

Tối thiểu 5 người, mỗi người 2 trận sau tutorial, ghi các lần không hiểu cost/phase/target và nhận xét về cảm giác đánh. Beta đầu hướng tới 30 trận có phản hồi, không cần dữ liệu nhạy cảm. Phân biệt thời gian suy nghĩ với thời gian animation.

Thứ tự sửa: lỗi luật/UX → bot sai đánh giá → con số từng card → giới hạn nội dung. Không buff/nerf bằng cách thay kết quả ngẫu nhiên giữa trận.

## Phát hành version

Content manifest immutable theo version và checksum. Match đang chơi dùng đúng version cũ đến khi xong/hết hạn. Version mới chỉ cho trận mới. Có changelog nêu ID, trước/sau và lý do từ dữ liệu. Deck cũ phải validate lại khi dùng version mới; không tự thay card mà không báo.
