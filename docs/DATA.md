# Schema Neon và persistence

App schema do Drizzle migrations quản lý; `neon_auth` do Neon Auth quản lý, không sửa qua app migrations. ID app là UUID. Thời gian UTC timestamptz chỉ cho vận hành, không tác động deterministic rules.

## Bảng và constraints

| Bảng | Cột chính | Constraint / index |
|---|---|---|
| principals | id UUID, kind GUEST/ACCOUNT, auth_subject text nullable, display_name text, created_at, expires_at nullable | auth_subject unique khi khác null; name1–32 ký tự; kind ACCOUNT yêu cầu auth_subject |
| app_sessions | id UUID, principal_id FK, token_hash bytea, csrf_hash bytea, created_at, expires_at, revoked_at nullable | unique token_hash; index(principal_id,expires_at); không token plaintext |
| content_releases | version text PK, rules_version, location_version, manifest JSONB, sha256 text, published_at | Immutable; checksum trùng package registry; không UPDATE manifest của version đã dùng |
| decks | id UUID, owner_id FK, name, hero_id, current_revision int, created_at, updated_at | index(owner_id,updated_at,id); không sửa owner bằng payload client |
| deck_versions | deck_id FK, revision int, content_version FK, hero_id, entries JSONB, validation_status, created_at | PK(deck_id,revision); count phải được validate server trước playable; immutable |
| matches | id UUID, human_principal_id FK, human_side, mode SKIRMISH/TUTORIAL, status, revision bigint, rules_version, content_version FK, location_version, bot_version, created_at, updated_at, expires_at, ended_at nullable | Partial unique human_principal_id khi status ACTIVE/PAUSED; history index(owner,created_at DESC,id) |
| match_initializations | match_id PK/FK, heroes JSONB, deck_snapshots JSONB, initial_state JSONB, private_seed bytea, rng_algorithm_version | Server-only; initial state gồm ID instances, immutable; seed không trả qua API |
| match_checkpoints | match_id PK/FK, revision bigint, state JSONB, state_hash text, last_event_seq bigint, updated_at | Revision khớp matches; toàn bộ private state + pending continuation; server-only |
| match_events | match_id FK, seq bigint, event_id text, root_id text, kind, visibility, owner_side nullable, payload JSONB, created_at | PK(match_id,seq); unique event_id; visibility PUBLIC/OWNER/SERVER |
| match_action_journal | match_id FK, step_seq bigint, origin HUMAN/BOT/AUTO, command_id UUID nullable, action JSONB, next_bot_random_state JSONB nullable, pre_state_hash, post_state_hash, first_event_seq, last_event_seq, created_at | PK(match_id,step_seq); server-only; accepted intents và automatic-root boundaries theo thứ tự; BOT phải có next_bot_random_state |
| command_receipts | principal_id FK, command_id UUID, request_hash text, resource_id UUID, response JSONB, resulting_revision bigint nullable, created_at, expires_at | PK(principal_id,command_id); response chỉ là DTO của chính principal; không full MatchState |
| auth_claims | source_session_id FK, command_id UUID, source_principal_id FK, target_principal_id FK, auth_subject text, request_hash, result JSONB, last_issued_session_id FK nullable, committed_at, recover_until | PK(source_session_id,command_id); atomically với merge; recovery5 phút cùng identity |
| guest_bootstraps | command_id UUID PK, recovery_secret_hash bytea, principal_id FK, last_issued_session_id FK, expires_at | Recovery5 phút cho response tạo guest bị mất; không lưu secret plaintext |
| match_results | match_id PK/FK, owner_id FK, human_hero_id, bot_hero_id, difficulty, outcome, reason, turns, active_duration_ms, damage_dealt, summary JSONB | Một kết quả/match; index(owner_id,ended_at DESC,match_id), thêm ended_at timestamptz |

Không cần collection/rating/matchmaking table khi tất cả nội dung mở và chỉ PvE. Principal có `tutorial_completed_at` và `evil_tutorial_completed_at` nullable timestamptz; hoàn thành hai bài độc lập, không thêm progression economy.

Matches thêm `scenario_id text nullable` và `tutorial_manifest_sha256 text nullable`: bắt buộc với TUTORIAL, null với SKIRMISH. Manifest tutorial được pin bằng `scenario_id`/`tutorial_manifest_sha256` trên match tới registry riêng phía server có version bất biến; private checkpoint giữ `manifestVersion`. Tạo/read/replay kiểm tra version và checksum; thiếu hoặc lệch phải từ chối, không dùng bản mới nhất ngầm. Giữ registry cũ khi thêm version mới. Không sửa manifest/checksum của content release `core_v1` đã bất biến. Checkpoint `state.tutorial` lưu chapter/step/state/completedStepIds/sceneLoadOrdinal/scriptCursor/branch theo TUTORIAL.md. Journal AUTO hỗ trợ TUTORIAL_LOAD_SCENE; ID/event counters không reset khi đổi scene.

Match results lưu `blocks_used int0..3`; damage_dealt và active_duration_ms có semantics chính xác trong API-CONTRACT. Operational timing dùng metadata server ngoài deterministic state hash. Ghi receipt trùng và GET/poll không cộng thời gian.

`match_results.summary.rematch` lưu owner-only DeckSource (preset hoặc saved deckId/revision), opponentHeroId, difficulty và expectedContentVersion từ create. Giữ đủ180 ngày cùng summary; tutorial để null. Tạo match phải snapshot cả source reference lẫn entries, để result không cần truy lại một deck revision mới đã bị sửa.

## JSONB shape phải validate

- `entries`: array `{cardId:string, quantity:int1..2}`, ID không lặp; tổng30 để PLAYABLE; draft có thể0..30; class và phe từ hero. Tên không dùng HTML.
- `deck_snapshots`: mỗi side `{heroId,contentVersion,entries,deckRevisionRef?}`; không phụ thuộc deck mutable.
- `state`: schema MatchState có stateSchemaVersion, toàn board/deck/hand/reserve/RNG/counters/continuation. Giới hạn payload checkpoint256KB, vượt giới hạn là lỗi được điều tra, không cắt dữ liệu.
- `manifest`: tất cả definition cần cho core + asset reference, không có secret. Server runtime registry kiểm manifest checksum trước nhận match.
- `summary`: card played counts, energy unused, reveal observations, fatigue count, blocks, selected Location IDs; API result chỉ whitelist những trường có thể hiện sau trận. Không tự public toàn summary.

Không dùng SQL CHECK phức tạp để giả vờ đã kiểm class/copy/text DSL; các invariant nhiều bảng nằm trong validator có test. SQL vẫn bảo vệ unique/FK/nonnegative revision/not-null và lifecycle hợp lệ.

## Durability

Transaction command update matches/checkpoint, append action journal và events, insert receipt và result nếu terminal. DB commit là điểm action được chấp nhận; HTTP200 chỉ sau commit. Atomic transaction bảo đảm không có “trừ mana nhưng chưa ra quân”, không cấp power hai lần.

Raw state và event bí mật chỉ truy vấn bởi app role/server. Không endpoint dump seed/snapshot; không đưa vào client source map, log, error tracker hay analytics. App role không DDL; migration role dùng direct URL riêng. Chọn pooled/direct theo [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

State hash dùng canonical JSON serialization có thứ tự key xác định, không gồm timestamp vận hành. Replay nội bộ từ initialization + ordered actions cần cho test/diagnostics; giao diện replay người dùng để sau. Không gửi seed sau trận chỉ để làm replay tiện hơn.

Journal action lưu intent đã validate (card instance, target, pass, mulligan, power choice), actor side và automatic root kind/continuation. Mỗi row BOT còn lưu `BotDecision.nextBotRandomState` đã validate; các origin khác để null. Không lưu raw credentials/request headers. Replay đọc initial_state rồi apply từng row theo step_seq: kiểm pre hash, apply action và khôi phục next_bot_random_state như một bước nguyên tử, rồi kiểm post hash. Không gọi lại bot và không phụ thuộc CPU time của ADVANCE. Nếu bot Thường không tiêu thụ random, row vẫn lưu trạng thái RNG không đổi để hợp đồng thống nhất.

## Quyền sở hữu và session

Mọi query deck/match/history có điều kiện principal lấy từ session; ID UUID không thay thế authorization. Cross-account read/write nhận404. Receipt cũng scope theo principal; không trả receipt của người khác nếu đoán commandId.

Guest dùng app session hết hạn7 ngày. Trước hết hạn có thể đóng tab rồi resume trên cùng browser; clear cookie làm mất khả năng truy cập guest. Account được đồng bộ thiết bị qua identity.

### Claim guest sau Google login

Backend yêu cầu cả guest session còn hiệu lực và Neon JWT đã validate, cùng CSRF. Không nhận guestId từ client như bằng chứng sở hữu.

- Nếu auth_subject chưa có principal: convert guest thành ACCOUNT cùng ID; set expires_at=null, giữ deck/match.
- Nếu account đã có principal: transaction lock hai principal theo UUID tăng dần; chuyển quyền các deck và history guest, giữ tên (thêm hậu tố “từ khách” nếu cần); không overwrite deck account.
- Nếu cả hai có active match: trả409 MERGE_MATCH_CONFLICT với tóm tắt hai trận. Người chơi chọn giữ trận nào; trận còn lại ABANDONED reason ACCOUNT_MERGE, không tính thua.
- Merge idempotent qua commandId; guest sessions cũ bị revoke sau chuyển, phát account session mới. Không thể claim một guest hai lần vào hai account.
- Trận guest chuyển sang account được tính expires_at theo policy account từ thời điểm chuyển. Ghi receipt trong principal account đích và migration record từ guest để retry không tạo bản sao.

`auth_claims` là migration record đó. Nó được insert trong cùng transaction chuyển quyền/revoke, có source session, verified auth subject và target principal. Nếu Set-Cookie response mất, cùng guest cookie cũ + commandId + JWT cùng subject + CSRF có thể recovery completed record trong5 phút; session revoked chỉ có quyền này. Không yêu cầu guest vẫn ACTIVE để đọc completed claim, nhưng claim mới vẫn bắt buộc guest session còn hiệu lực. Auth request hash dùng verified subject và lựa chọn merge, không dùng chuỗi JWT có thể refresh.

## Giữ dữ liệu và xóa

| Dữ liệu | Chính sách v1 |
|---|---|
| Guest principal/session/deck/match chưa claim | 7 ngày tuyệt đối từ tạo guest |
| Account active/paused match | 30 ngày từ last activity; sau đó ABANDONED |
| Initialization/checkpoint/action journal/full events | Giữ khi active; sau terminal giữ30 ngày cho diagnostics |
| Result/history gọn | 180 ngày sau ended_at |
| Receipt match | Trong thời gian active +30 ngày sau terminal; create/deck receipt tối thiểu7 ngày |
| App session hết hạn/revoked | Xóa sau7 ngày |
| Auth claims / guest bootstrap recovery | Quyền recovery5 phút; tombstone audit/dupe guard7 ngày, không giữ plaintext token |
| Content release | Giữ khi bất kỳ checkpoint/event/summary còn tham chiếu; archive sau hết retention |

Cleanup là maintenance command riêng chạy hằng ngày khi vận hành; nhận lock và dùng cutoff UTC. Không cleanup bằng client request tùy ý. Xóa chi tiết không cascade mất result trước180 ngày: giữ matches row tối giản, xóa initialization/checkpoint/events rồi xóa row sau history expiry. Auth provider data tuân lifecycle provider riêng.

Người dùng muốn xóa account: quy trình có xác nhận, revoke session, xóa app-owned data theo dependency và xử lý provider account; chưa tự động thao tác trong giai đoạn này. Không thu thập chat, thanh toán, vị trí hay dữ liệu không cần gameplay.

## Migration và release

Mỗi migration có file SQL do Drizzle quản lý; chạy trên môi trường thử trước, không dùng schema push tùy tiện production. Khi có hạ tầng thật, Neon branch dev/test tách khỏi production; chưa tạo branch ở bước đặc tả.

Expand/contract để app cũ/mới cùng chạy trong rollout. Package registry phải hỗ trợ mọi rulesVersion có active match trước rollout; nếu không, hoãn phát hành hoặc đợi hết retention, không sửa match sang version mới. Budget/backup retention do plan Neon thực tế quyết định; phải test restore trên môi trường thử trước beta.

### T08 operational bot guard

`matches.bot_intents_this_turn` is durable operational metadata, constrained0..64. Forward migration0002 renames the original slot without rewriting0001. HUMAN intents, pause and resume preserve it; a global turn change resets it. Bounded append replay starts from the locked counter, counts BOT rows, and compares the derived count to scheduler metadata before atomically persisting it. Full initialization replay starts0 and also verifies final metadata.

The closed server-only AUTO operation `{kind:"BOT_GUARD_FAULT",turn,botIntents:64}` is allowed only when a further BOT decision is due at count64. It emits the private `BotGuardFault` SERVER diagnostic plus the existing public LifecycleChanged/FAULT event. It never accepts a public PlayerAction or patches a hashed state outside a validated replay operation. Automatic roots and human decisions retain priority at the limit; a legitimate64th intent can yield to human input or the next turn. FAULTED remains an operational terminal result, never a gameplay LOSS. SERVER diagnostic kinds/payloads are excluded from browser projection and event recovery.
