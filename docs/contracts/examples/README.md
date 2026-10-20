# Ví dụ contract

Tất cả UUID/instance IDs là fixture tổng hợp, không phải dữ liệu hoặc credentials thật. `index.json` ánh xạ từng file sang schema definition.

- block-owner.response: GOOD ở tutorial G07 sau block; signature miễn phí, target GC02 lane4.
- block-opponent.view: projection nội bộ cho EVIL, không phải spectator API; không có power ID của GOOD hoặc tutorial focus private.
- events-private-page.response: viewer EVIL, afterSeq98/throughSeq101, scan row99 PowerGranted riêng của GOOD; page rỗng vẫn tiến99.
- match-summary.response: một trận minh họa khác với block fixture; sau retention vẫn đủ rematch saved deck revision3. Không phải kết quả chơi thật.
- play-unit.request minh họa cấu trúc; không khẳng định target hợp lệ cho block snapshot.

Expected VALID chỉ có nghĩa qua JSON Schema; engine/session/ownership validation vẫn bắt buộc.
