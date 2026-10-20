# Chọn hero và xây bộ bài — Task 12

Triển khai tại `c3649f1` và `3a7b166`, từ base `9b5351f`. [Review ban đầu](evidence/task12/review.md) yêu cầu sửa hai lỗi về key draft sau đổi revision và nguồn deck sau create bị từ chối. Bản sửa `179e51e` đã được [review lại](evidence/task12/rereview.md) và đóng cả hai finding chặn. Task 12 đạt gate kỹ thuật; M4 còn Task 13–14 và các kiểm chứng bên ngoài.

## Hành vi đã triển khai

- Sáu hero, hai class và bốn power mỗi hero; signature có nhãn riêng. Chọn hero chưa tạo trận. Deck mẫu, deck cá nhân và bước chọn đối thủ tách rõ.
- Collection mặc định có 22 card hợp lệ cho hero; tìm không phân biệt dấu/hoa thường và lọc class/type/cost kết hợp. Card mở inspect; nút +/− hoạt động độc lập, chặn bản thứ ba và lá thứ 31.
- Curve và thống kê đếm số bản thực: preset D_G_BV có 22 UNIT/8 TRICK, curve `[8,12,6,2,0,2]`, cost trung bình 2,33.
- Lưu draft 0–30 lá; chỉ deck 30 lá hợp lệ được tiếp tục vào trận. Lỗi mạng giữ draft và request đang chờ; sửa ở tab khác cho tải bản mới hoặc lưu bản sao. Rời màn hình khi chưa lưu có lựa chọn rõ ràng. Mobile có panel danh sách deck riêng.
- API lưu theo owner, receipt và revision; lịch sử `deck_versions` bất biến. Sửa deck không sửa snapshot của trận đã tạo. `GET /decks/:id?revision=N` đọc đúng revision, không thay bằng bản mới nhất khi không tìm thấy.
- Result/history mở review đúng PRESET hoặc SAVED ID/revision cũ nếu content version đổi. Chỉ sau xác nhận mới tạo trận; giữ đối thủ/độ khó. Nhận xét Task 1 về catalog sai shape và Task 11 về cảnh báo storage lỗi đã được sửa.

## Kiểm chứng

| Phạm vi | Kết quả |
|---|---|
| API deck/command/persistence/summary | [26/26](evidence/task12/api-tests.log), PostgreSQL thật |
| Web/catalog/source parity | [79/79](evidence/task12/web-catalog-tests.log) |
| Static/build | [Typecheck](evidence/task12/typecheck.log), [lint](evidence/task12/lint.log), build qua |
| Standalone chức năng | [11/11](evidence/task12/standalone-browser.log), gồm 10 case Task 12 và recovery PRESET cũ |
| Sau sửa giao diện cuối | [3/3](evidence/task12/drawer-browser.log) trên [build mới](evidence/task12/build-drawer.log), phủ hero, builder/drawer và Back/mobile |

Ba file thay đổi sau lần 11/11 là DeckBuilder, CSS deck và assertion browser; [delta](evidence/task12/functional-to-final-source-delta.json) ghi rõ. Không tuyên bố lần 11/11 chạy trên source sau cùng. API/contracts/gameplay không đổi ở bước sửa giao diện; các suite đó không chạy lặp lại.

[Manifest cuối](evidence/task12/after-drawer.json) và [đối chiếu](evidence/task12/integrity-summary.json): controller kiểm lại 236 source file và 184 artifact, đều khớp. Runtime route cache được tách khỏi compiled artifacts; [lần chức năng](evidence/task12/functional-integrity-summary.json) chỉ thêm 12 cache file. Console không có lỗi ngoài các tình huống mạng/409 được chủ động tiêm. Node có cảnh báo biến màu NO_COLOR/FORCE_COLOR của runner, không phải lỗi runtime browser.

Build browser dùng `API_ORIGIN=http://127.0.0.1:3101`; Next cố định rewrite lúc build. Một lần chạy dùng artifact mặc định cổng 3001 đã dừng sớm và bị loại khỏi bằng chứng nghiệm thu. Các lỗi fixture/import/selector và lần có fixture chồng lấn cũng không được tính là RED nghiệp vụ hoặc kết quả đạt. Log công khai chỉ chuẩn hóa whitespace; không đưa raw browser trace/cookie vào Git.

## Bản sửa hai luồng recovery

Tại `179e51e`, draft lưu cả base và pending request chính xác, có pointer theo resource để reload tìm đúng bản nháp khi revision server đã tiến. Chỉ save được xác nhận hoặc lựa chọn “Tải bản mới” mới chuyển baseline/draft cùng nhau. Receipt cũ không cho phép ghi đè revision mới hơn. Create bị từ chối dứt khoát cho “Chọn bộ bài khác” qua màn sở hữu lựa chọn; 429 và kết quả chưa biết giữ nguyên request để retry.

Năm regression tái hiện được lỗi trước sửa. Sau sửa, [13/13 case production tập trung](evidence/task12/fix-round1-browser.log) qua trong 16,7 giây; typecheck/lint và [build mới](evidence/task12/fix-round1-build.log) qua. Không đổi API/contracts/engine. [Manifest](evidence/task12/fix-round1-after-browser.json) và [đối chiếu](evidence/task12/fix-round1-integrity-summary.json) được controller kiểm lại: 237 source và 184 artifact khớp, không có lỗi console ngoài fault injection. Review lại đã xác nhận cả hai finding được xử lý, không có lỗi mới trong phạm vi bản sửa.

Ảnh recovery tạo trận: [desktop](evidence/task12/fix-round1-create-rejection-desktop.png), [tablet](evidence/task12/fix-round1-create-rejection-tablet.png), [mobile](evidence/task12/fix-round1-create-rejection-mobile.png).

Nhận xét về giữ cảnh báo không reload khi storage và request save/setup cùng lỗi đã được xử lý ở [Task 13](auth-sessions.md). Task 18 còn dọn cảnh báo môi trường màu của runner; không chạy lại acceptance chỉ để xóa cảnh báo màu.

## Hình ảnh và giới hạn

Hero: [desktop](evidence/task12/heroes-desktop.png), [tablet](evidence/task12/heroes-tablet.png), [mobile](evidence/task12/heroes-mobile.png). Builder: [desktop](evidence/task12/builder-desktop.png), [tablet](evidence/task12/builder-tablet.png), [mobile](evidence/task12/builder-mobile.png), [panel deck mobile](evidence/task12/builder-mobile-drawer.png). [Review SAVED revision cũ](evidence/task12/review-saved.png).

Minh họa vẫn là placeholder có chủ đích trước Task 15. Kiểm tự động dùng Chromium, không thay Safari/thiết bị thật hoặc screen reader. Nhánh fallback Back của browser cũ chưa được kiểm riêng. Trong test version drift, chỉ expectedContentVersion của summary response được giả lập thành core_old; đọc revision cũ, lưu và tạo trận dùng API/database thật. Registry hiện chỉ có release core_v1.

Task 13 nối auth/claim/history và bảo vệ local draft qua thay đổi danh tính. Task 14 đóng hành trình M4 với tutorial/settings; các gate bên ngoài vẫn được ghi riêng.
