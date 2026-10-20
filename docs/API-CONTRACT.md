# API và dữ liệu truyền qua mạng — đề xuất v1

Đề xuất bổ sung ngày 2026-10-20, giữ luật/stack đã chốt. Đây là hợp đồng thiết kế; chưa có API được triển khai. [Schema máy đọc](contracts/api-v1.schema.json) và [danh sách kiểu](contracts/INDEX.md) quy định tên field, kiểu, required/null, enum và giới hạn. Không thêm field ngoài schema. RULES/EFFECTS quyết định tính hợp lệ gameplay; schema không thay engine validation.

PvZ Heroes được tham khảo ở trải nghiệm hero/deck/block. Không có bằng chứng về API nội bộ của họ; toàn bộ contract dưới đây là thiết kế riêng cho Ngũ Lộ.

## 1. Quy ước thống nhất

| Mục | Quy định |
|---|---|
| Version | URL `/api/v1`; `PlayerView.schemaVersion="api_v1"`; version gameplay pin theo trận |
| JSON Schema | Draft7; `definitions/<TypeName>`; object đóng, mọi field required trừ khi schema nói khác |
| ID | Resource/command/request ID: UUID; instance: 32 ký tự hex; definition ID theo catalog |
| Số | Integer hữu hạn trong safe-integer JS; revision/sequence không âm; DB bigint chuyển có kiểm tra |
| Null/absent | Field nullable phải gửi `null`; không bỏ field tùy hứng; không nhận unknown properties |
| Thời gian | ISO8601 UTC; chỉ vận hành, không quyết định luật |
| Text | UI tiếng Việt lấy từ `messageKey/copyKey` hoặc catalog; tên deck1–40 ký tự sau trim/NFC; tên principal1–32 |
| Auth | App-session cookie; mutation đã có session cần `X-CSRF-Token` + Origin cùng app |
| Cookie/CSRF | `csrfToken` được phép trả cho browser chủ session; app-session token chỉ Set-Cookie HttpOnly |
| Size | Request body≤32KB; event page≤100; history/deck page≤20 |
| Transport | HTTPS; private responses no-store; catalog bất biến được cache theo version/checksum |

Schema có `additionalProperties:false` để từ chối field ngoài hợp đồng. Khi ghép union, mỗi nhánh khai báo đầy đủ field được phép. [JSON Schema — object và additional properties](https://json-schema.org/understanding-json-schema/reference/object).

Chọn Draft7 theo baseline tài liệu Fastify để giảm adapter; không cần keyword mới hơn cho contract này. Khi implement, body validation đặt `removeAdditional:false`, `coerceTypes:false`, `useDefaults:false`; không âm thầm xóa field hoặc đổi kiểu. Query có parser riêng đổi decimal string sang integer trước validate ListQuery/EventQuery. Response chỉ serialize DTO đã project và kiểm schema, không serialize raw state để hy vọng tự ẩn. [Fastify validation và serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

**Ràng buộc liên-field cần semantic validator:** board đúng lane1–5 không trùng; unit owner/lane khớp ô; self.side là viewer; counts khớp zones nhìn thấy; power đúng hero; normal/reveal terrain đúng lane/lượt; deck không lặp ID; sum quantity; result/winner/lifecycle nhất quán. Không tuyên bố JSON Schema tự chứng minh các điều này.

## 2. Lệnh gửi lên

`CommandEnvelope` chỉ có `commandId`, `expectedRevision`, `action`. Actor do server suy từ membership/session; client không gửi actor, amount damage, cost, nextState hay seed.

| `action.kind` | Field bổ sung | Khi hợp lệ |
|---|---|---|
| MULLIGAN | cardInstanceIds: 0–4 ID duy nhất | Chủ tay chưa mulligan |
| PLAY_UNIT | cardInstanceId, laneId | UNIT từ tay, đúng phase, lane trống, đủ mana |
| PLAY_TRICK | cardInstanceId, target | TRICK từ tay, đúng phase |
| USE_POWER | powerInstanceId, target | Reserve của mình, GOOD_PLAY/EVIL_TRICKS, giá1 |
| USE_BLOCK_POWER | powerInstanceId, target | Đúng power vừa cấp trong response, giá0 |
| PASS_PHASE | Không | Actor đang giữ một trong ba phase chơi |
| KEEP_BLOCK_POWER | Không | Actor đang giữ block response |
| ADVANCE | Không | Có automatic work; không pause hoặc đang chờ input/tutorial |
| PAUSE / RESUME | Không | Lifecycle ACTIVE/PAUSED tương ứng |
| SURRENDER | Không | Trận chưa terminal; UI xác nhận trước gửi |
| TUTORIAL_CONTINUE | stepId | Bước hướng dẫn hiện hành đủ điều kiện |
| TUTORIAL_RESTART | chapterId | Tutorial chưa terminal; chỉ chapter hiện tại |
| TUTORIAL_SKIP | Không | Tutorial chưa terminal |

Các lệnh tutorial không tồn tại trong legal actions của SKIRMISH. User intent, bot intent và script tutorial đều qua cùng engine legality; lớp tutorial chỉ thu hẹp lựa chọn cho bài học.

`Target` là một union, không dùng `targets:any[]`:

| kind | Field | Dùng cho |
|---|---|---|
| NONE | Không | Rút bài, effect toàn bàn, heal hero mặc định |
| UNIT | instanceId | Damage/heal/buff/choáng quân |
| HERO | side | Card cho phép chọn hero, ví dụ F06 |
| LANE | laneId | Triệu hồi vào lane trống |
| UNIT_AND_LANE | instanceId, laneId | Move: chọn quân và ô đích |

V08 dùng LANE; P_F1/F06 dùng UNIT hoặc HERO; S_E_FX/S_E_XS/P_V2 dùng NONE. Card có đối tượng “hero của bạn” cố định không gửi HERO để tránh nhập nhằng giữa selector và target do người chơi chọn.

Ví dụ hợp lệ về **cấu trúc**; ID minh họa không phải resource thật:

```json
{
  "commandId": "11111111-1111-4111-8111-111111111111",
  "expectedRevision": 12,
  "action": {
    "kind": "PLAY_UNIT",
    "cardInstanceId": "00000000000000000000000000000001",
    "laneId": 3
  }
}
```

```json
{
  "commandId": "22222222-2222-4222-8222-222222222222",
  "expectedRevision": 28,
  "action": {
    "kind": "USE_BLOCK_POWER",
    "powerInstanceId": "00000000000000000000000000000002",
    "target": {
      "kind": "UNIT",
      "instanceId": "00000000000000000000000000000003"
    }
  }
}
```

`legalActions` liệt kê intent đầy đủ, gồm từng target khả dụng, chỉ cho viewer. Mulligan liệt kê tối đa16 tập con. UI dùng danh sách đó cho highlight; server vẫn validate lại lúc nhận lệnh. Target bị từ chối dùng lỗi tổng quát, không tiết lộ entity bí mật có tồn tại hay không. Sorting ổn định theo DECKS; không trả pending action của bot.

## 3. PlayerView: whitelist duy nhất ra browser

| Field | Nội dung |
|---|---|
| schemaVersion, matchId, mode, lifecycle | Định danh và trạng thái vận hành |
| humanSide, turn, phase, activeSide | Phe người chơi, lượt và ai đang giữ quyết định |
| versions | rules/content/locations/bot bất biến |
| players.GOOD / players.EVIL | Hero ID, HP, energy, block, counts, discard thường, power đã dùng, fatigue |
| board | Đúng5 LaneView; mỗi lane có location, good unit/null, evil unit/null |
| self | Side viewer, hand, reserve và mulliganCommitted |
| legalActions | Chỉ intent hợp lệ cho viewer và lifecycle hiện tại |
| blockResponse | null hoặc OWN/OPPONENT theo bảng dưới |
| combat | null hoặc lane/stage hiện tại; không private continuation/RNG |
| outcome | null trước terminal; sau đó result/winner/reason |
| tutorial | null ở skirmish; tiến độ/copyKey/focusTargets ở tutorial |

TutorialView chỉ trả cho human viewer; bot projection để null để không lộ handle card đang được hướng dẫn trên tay người. `Outcome.result` tính theo humanSide; bot đánh giá thắng từ winner/own side, không dùng nhãn WIN/LOSS của người chơi.

`activeSide` = phe giữ phase hoặc responder đang chọn block. COMBAT tự động/TURN_START/TURN_END/GAME_OVER → null; MULLIGAN → humanSide cho tới khi xác nhận. Sau human mulligan, bot/setup có thể cần ADVANCE trước phase đầu. PAUSED giữ phase/activeSide cũ, nhưng legal actions chỉ RESUME/SURRENDER và tutorial skip khi áp dụng.

`UnitView`: instance/definition/owner/lane; printed/current stats; sáu status flags; modifiers công khai; lastRegularAttackTurn. Printed stats không đổi; current HP trên board luôn>0. `Stats` dùng chung event có thể chứa HP≤0 tại damage beat; chết phải được cleanup trước checkpoint công khai.

`HeroView.block = {charge,used,active}`: charge∈0/2/4/6; used0–3; active bằng used<3. HP hero có thể≤0 tại terminal. Power đã dùng nằm ở `usedPowers`, không trộn với discard lá thường.

`LocationView`:

- NORMAL: chỉ state; chỉ lane2/4.
- HIDDEN: state và revealTurn số1/3/5; không definitionId, artKey, group hoặc effect.
- REVEALED: state, definitionId, revealTurn; UI tra public catalog.

`blockResponse`:

- OWN: visibility, side, laneId, powerInstanceId, costNow=0; ID phải tồn tại trong self.reserve.
- OPPONENT: visibility, side, laneId; không power ID, class hay signature flag.
- null: không có response đang mở. Public `phase` vẫn COMBAT trong cửa sổ này.

**Không có** opponent hand/power IDs, deck order, seed, bot score, private identityKey, server trigger queue hoặc auth data trong view. Catalog của cả hai phe là công khai; assignment của trận vẫn riêng.

## 4. Response và cursor

`CommandResponse` dùng cho create/get/command match:

| Field | Nghĩa |
|---|---|
| view | PlayerView sau checkpoint đã commit |
| revision | Revision checkpoint, không phải event sequence |
| latestSeq | Event cuối trong checkpoint |
| events | Tối đa100 visible events sau checkpoint trước command |
| eventsThroughSeq | Seq cuối server đã scan để tạo events, kể cả event bị ẩn |
| needsAdvance | Có công việc tự động tiếp theo và hiện được phép chạy |

GET snapshot trả events=[] và eventsThroughSeq=latestSeq; client đang phục hồi log vẫn dùng **cursor đã lưu**, không coi eventsThroughSeq của GET là đã đọc hết log. Create có thể trả events ban đầu. Command events bị giới hạn100: tải phần còn lại qua endpoint events tới latestSeq, không bỏ log.

Event pagination: `afterSeq`≥0, `throughSeq`≥afterSeq và ≤latestSeq, limit mặc định100/tối đa100. Page scan tối đa100 persisted rows hoặc thu đủ limit visible events, chọn giới hạn trước. Trả nextCursor=scannedThroughSeq; hasMore=(scannedThroughSeq<throughSeq). Page rỗng vẫn có thể hasMore nếu vừa scan rows riêng. Không chạy truy vấn vô hạn để tìm đủ visible rows.

SnapshotN rồi tải log tới N. Response mớiN+K đến giữa lúc đó vẫn được nhận; log merge bằng eventId và cursor liên tục, snapshot mới không bị receipt cũ ghi đè. Khi events bị hổng, UI fast-forward scene tới snapshot mới, fetch log riêng; không phát VFX theo event chưa có thứ tự đầy đủ.

## 5. Event payload đóng

Envelope luôn có eventId=`matchId:seq`, sequence, rootId=`matchId:rootSeq`, kind, visibility, ownerSide và payload. `PUBLIC` có ownerSide=null; `OWNER` chỉ trả khi ownerSide=viewer. Không truyền SERVER event.

| kind | Payload chính | Visibility |
|---|---|---|
| MatchStarted | mode, heroes{GOOD,EVIL}, versions | PUBLIC |
| MulliganCommitted | side, replacedCount | OWNER |
| TurnStarted | turn | PUBLIC |
| LocationRevealed | laneId, definitionId | PUBLIC |
| EnergyRefilled | side, before, after, max | PUBLIC |
| CardDrawn | side, card{instanceId,definitionId}, handCount, deckCount | OWNER |
| HandCountChanged | side, handCount, deckCount | PUBLIC |
| CardDiscarded | side, definitionId, reason, discardQuantity | PUBLIC |
| CardPlayed | side, cardInstanceId, definitionId, target, energySpent | PUBLIC |
| UnitCreated | unit: UnitView, cause PLAY/SUMMON | PUBLIC |
| UnitMoved | instanceId, side, fromLane, toLane | PUBLIC |
| StatsChanged | instanceId, before/after Stats, modifiers | PUBLIC |
| StatusChanged | instanceId, before/after Statuses | PUBLIC |
| AttackDeclared | batchId, attacks[sourceUnitId,side,laneId,attack,targets,displayOrder] | PUBLIC |
| DamageBatchResolved | batchId, packets[], hpChanges[] | PUBLIC |
| HeroHealed | side, amount thực hồi, before, after | PUBLIC |
| UnitDestroyed | instanceId, definitionId, owner, laneId, isToken | PUBLIC |
| BlockMeterChanged | side, chargeBefore, chargeAfter, blocksUsed | PUBLIC |
| BlockOccurred | side, preventedDamage, blocksUsed | PUBLIC |
| PowerGranted | side, power: ReservePower, reason INITIAL/BLOCK | OWNER |
| ReserveCountChanged | side, reserveCount | PUBLIC |
| BlockResponseOpened | side, laneId, powerInstanceId | OWNER |
| BlockResponseClosed | side, choice USED/KEPT | PUBLIC |
| PowerUsed | side, powerInstanceId, definitionId, target, energySpent | PUBLIC |
| PhaseChanged | from, to, turn | PUBLIC |
| MatchEnded | outcome, turn | PUBLIC |
| LifecycleChanged | from, to, reason | PUBLIC |
| TutorialAdvanced | tutorial: TutorialView | OWNER |

`DamagePacket`: source EntityRef/null, target EntityRef, damageType, rawDamage, mitigatedDamage, finalDamage, blocked, shieldConsumed, displayOrder. `mitigatedDamage` là **lượng đã ngăn**, nên rawDamage = mitigatedDamage + finalDamage. Một HP target chỉ có một hpChanges entry/batch; delta bằng tổng finalDamage vào target. Block/Shield không làm xuất hiện damage âm.

Damage order: AttackDeclared → DamageBatchResolved dùng shared HP beat → Stats/Status/BlockMeter deltas cần thiết → UnitDestroyed/death cascade → grant/reserve events → response open nếu trận còn sống → continuation Location. Các deltas mô tả lại state cho presentation, không áp damage lần hai. Grant nằm trong root damage; response chỉ mở sau lethal checkpoint. BlockOccurred có thể có dù cascade chấm dứt trận; khi đó không mở response.

Event replay VFX không được gọi `applyAction`; log dùng sequence, state dùng snapshot. BatchId ổn định từ root+ordinal, không timestamp. Tutorial load scene không giả CardPlayed cho những quân được đặt sẵn; TutorialAdvanced + snapshot là ranh giới fast-forward.

## 6. Endpoint và kiểu trả về

| Method/path | Request | Success |
|---|---|---|
| POST /guest | GuestRequest | 201 SessionResponse + Set-Cookie |
| GET /session | Cookie | 200 SessionResponse |
| POST /auth/exchange | AuthExchangeRequest | 200 SessionResponse + Set-Cookie |
| POST /auth/claim-guest | ClaimGuestRequest | 200 SessionResponse + Set-Cookie |
| POST /auth/logout | Body `{}`, CSRF | 204, xóa cookie |
| GET /catalog/:version | Version trong path | 200 PublicCatalog |
| GET /decks | cursor?, limit1–20 mặc định20 | 200 DeckList |
| POST /decks | SaveDeckRequest | 201 DeckDTO |
| PUT /decks/:id | UpdateDeckRequest | 200 DeckDTO |
| POST /matches | CreateMatchRequest | 201 CommandResponse |
| GET /matches/:id | Cookie | 200 CommandResponse |
| GET /matches/:id/summary | Cookie | 200 MatchSummary; vẫn có khi full details hết retention |
| GET /matches/:id/events | afterSeq, throughSeq, limit? | 200 EventPage |
| POST /matches/:id/commands | CommandEnvelope | 200 CommandResponse |
| GET /matches | cursor?, limit1–20 mặc định20 | 200 MatchList |
| GET /health/live | Ngoài `/api/v1` | 200 HealthLive |
| GET /health/ready | Ngoài `/api/v1` | 200/503 HealthReady |

URL health thực tế `/health/live` và `/health/ready`. Cursor history/deck là opaque base64url tuple sort key+ID, server validate syntax/ownership; không dùng cursor như bằng chứng authorization.

ListQuery/EventQuery/MatchParams/DeckParams/CatalogParams và EmptyBody có schema riêng. GET /matches chỉ liệt kê SKIRMISH trong v1; active tutorial lấy từ session.activeMatchId và Home resume. Tutorial terminal dùng completion flags, không cộng vào lịch sử thắng/thua.

Catalog payload là **presentation DTO**: card name/stats/text, hero/power/location/token/preset metadata. Full executable effect definitions nằm trong content package versioned được build cùng engine/public-preview module; browser không parse luật từ text VI. `PublicCatalog.sha256` là hash canonical JSON của DTO bỏ field sha256, khác checksum full manifest trong DB; build registry lưu và kiểm cả hai.

Create skirmish nhận deck PRESET hoặc SAVED+revision, hero bot, difficulty và expectedContentVersion; faction người suy từ deck, bot phải phe đối diện. expectedContentVersion là guard cho nội dung người chơi đã xem, không cho client chọn version tùy ý: server so với current release, lệch trả409 VERSION_UNSUPPORTED. Server pin versions/seed; tutorial nhận scenarioId duy nhất, không override hand/board/script.

Deck draft chỉ chấp nhận0–30 bản, ID duy nhất, đúng phe/class/copy; total<30 trả validation.playable=false và TOTAL_NOT_30. Vượt30, sai class hoặc copy bị reject, không lưu “draft lỗi” tùy ý. Structural schema fail→400; semantic deck fail→422. Preset luôn6, không phân trang; items chỉ deck của principal.

Claim `keepMatchId=null` ở lần đầu; conflict409 trả hai tóm tắt để chọn. Lựa chọn gửi với **commandId mới**, vì payload thay đổi; retry cùng lựa chọn dùng lại ID đó. Account có sẵn nhưng không conflict thì keepMatchId phải null. Recovery source cookie và hạn5 phút theo DATA; không cấp quyền gameplay từ cookie revoked.

`MatchSummary.damageDealt`: tổng final damage do side người chơi gây lên hero địch qua COMBAT/EFFECT; không tính Poison/Location/Fatigue hoặc damage vào unit, không giảm vì heal sau đó. `blocksUsed` là số block hero người chơi đã dùng. Duration active do server cộng interval giữa các command hợp lệ, cap mỗi interval60s; PAUSED/offline dài không tính toàn bộ. Duplicate receipt, GET/polling và thời gian từ PAUSE tới RESUME không tăng duration. Đây là số liệu xấp xỉ gắn nhãn “Thời gian hoạt động”, không tuyên bố đo thời gian suy nghĩ chính xác.

`MatchSummary.rematch` = null cho tutorial; với skirmish gồm deck source/revision gốc, opponentHeroId, difficulty và expectedContentVersion gốc. Dữ liệu này chỉ owner được đọc, lưu trong result summary đủ180 ngày, không phụ thuộc checkpoint còn hay mất. Client lấy summary trước hiển thị CTA Chơi lại sau reload. Trước POST mới, so catalog hiện hành với expectedContentVersion; nếu đổi thì đưa qua deck review, không âm thầm dùng preset/balance khác. Không đưa rematch config chứa danh tính deck riêng vào event PUBLIC.

## 7. Error contract

Envelope cố định `{error:{code,messageKey,requestId,retryable,details}}`. Không raw stack, SQL, JWT, target/card private trong message. UI không hiển thị nguyên văn error từ provider.

| HTTP/code | details | Xử lý client |
|---|---|---|
| 400 VALIDATION_FAILED | issues[path,rule] | Sửa input; không retry tự động |
| 401 SESSION_EXPIRED | `{}` | Renew/login; giữ pending ID và lựa chọn |
| 403 CSRF / FORBIDDEN | `{}` | Lấy session mới hoặc dừng action |
| 404 NOT_FOUND | `{}` | Bỏ resource hiện tại; cùng lỗi cho không tồn tại/sai owner |
| 409 STALE_REVISION | snapshot: CommandResponse | Resync, yêu cầu chọn lại; không tự áp intent cũ |
| 409 STALE_DECK_REVISION | deck: DeckDTO | Giữ local draft, cho tải bản mới hoặc lưu bản sao |
| 409 IDEMPOTENCY_CONFLICT | `{}` | Lỗi client đổi body của ID cũ; không tự thử ID mới để chơi lại |
| 409 ACTIVE_MATCH_EXISTS | matchId | Cho tiếp tục trận |
| 409 MERGE_MATCH_CONFLICT | guestMatch, accountMatch | Dialog chọn trận giữ |
| 409 VERSION_UNSUPPORTED | `{}` | Dừng/refresh app; không migrate trận ngầm |
| 410 LOG_EXPIRED | earliestAvailableSeq | Hiện nhãn log đã hết hạn, vẫn đọc result |
| 410 MATCH_DETAILS_EXPIRED | summaryAvailable=true | Lấy endpoint summary, không dựng lại board từ dữ liệu thiếu |
| 422 INVALID_DECK | validation: DeckValidation | Inline errors + summary; giữ draft |
| 422 ILLEGAL_ACTION | reason, field/null | Làm mới targets/view; không tiết lộ hidden entity |
| 429 RATE_LIMITED | retryAfterSeconds | Chờ Retry-After rồi retry ID cũ khi phù hợp |
| 503 TEMPORARILY_UNAVAILABLE | `{}` | Cho retry cùng ID; không tuyên bố action chưa commit |
| 500 INTERNAL | `{}` | Hiện requestId, retry/resync cùng ID |

retryable=true chỉ cho429/503/500; 401 cần recovery identity trước retry. Timeout/network error không có JSON vẫn coi kết quả chưa biết. Receipt check trước revision; chỉ lưu successful accepted mutation receipt, không lưu validation/409 thành success receipt. Request hash gồm method+canonical path+validated body; JWT auth hash thay identityToken bằng verified subject theo DATA.

## 8. Nghiệm thu bổ sung

- Schema chấp nhận các mẫu trong `contracts/examples`; từ chối unknown fields, wrong target shape, phase ngoài enum và private state gắn vào view.
- Cùng block snapshot project cho responder có powerId; project cho bên kia không có. Event OWNER không xuất hiện trong response bên kia.
- Event batch raw = mitigated + final; một HP beat/pair; event page toàn private vẫn tiến cursor.
- GET snapshot không đánh dấu log cũ đã đọc. Response hơn100 event được phục hồi đủ log, không phát animation sai thứ tự.
- Tutorial control bị từ chối trong skirmish, payload tự gắn seed/state bị schema reject.
- Test runtime T01/T05/T07/T09/T11/T13 phải đọc contract này; kiểm schema tĩnh không thay các test đó.
