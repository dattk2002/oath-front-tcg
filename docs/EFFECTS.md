# Hợp đồng hiệu ứng

Tài liệu này định nghĩa ngữ nghĩa để tác giả card, engine và UI dùng cùng một nghĩa. Đây là đặc tả dữ liệu, không phải mã triển khai.

## Vocabulary

`UNIT` = card nhân vật trong deck; `TRICK` = card tức thời trong deck; `SUPERPOWER` = trick đặc biệt trong reserve; `TOKEN` = instance tạo qua effect, không có trong deck.

Hook được hỗ trợ ở core: `ON_PLAY`, `BEFORE_COMBAT_HERE`, `ON_DAMAGED`, `ON_DESTROYED`, `ON_TURN_END`. Location có `ON_UNIT_PLAYED`, `BEFORE_ATTACK`, `AFTER_LANE_COMBAT`, `END_TURN`, `COST_MODIFIER`. Không đồng thời dùng từ onSummon/onAttack/onDeath cho cùng hook.

“Khi ra sân” trên card nghĩa `ON_PLAY`, chỉ khi chơi UNIT từ tay. “Đầu giao tranh tại đây” nghĩa BEFORE_COMBAT_HERE, trước snapshot pair. “Khi bị thương” chỉ khi còn sống sau positive damage. “Khi bị hạ” dùng corpse source snapshot. “Cuối lượt” chạy trước heal Location và expiry.

## Target reference

| Target | Ngữ nghĩa |
|---|---|
| SELF | Source instance; không hợp lệ sau chết trừ đọc snapshot. |
| ALLY_UNIT / ENEMY_UNIT / ANY_UNIT | Một instance đang sống; đối chiếu owner của source. |
| ALLY_HERO / ENEMY_HERO | Hero của source owner hoặc đối thủ. |
| ENEMY_CHARACTER | Một quân địch đang sống hoặc hero địch đang sống. |
| ALLY_UNIT_HERE / ENEMY_UNIT_HERE | Quân sống tại source lane lúc effect thực thi. |
| ALLY_ADJACENT / ENEMY_ADJACENT | Quân tại lane source−1 và source+1, biên 1/5 không vòng qua. |
| ALL_ALLY_UNITS / ALL_ENEMY_UNITS | Snapshot tập mục tiêu ở đầu primitive, theo lane; effect multi-target đồng thời. |
| EMPTY_ALLY_LANE | Target lane 1–5 trống phía source owner. |
| EMPTY_UNIT_OWNER_LANE | Target lane khác, trống phía chủ quân được chọn; dùng cho move quân địch. |
| SELECTED_UNIT / SELECTED_LANE | Target đã validate của action; không tự retarget. |

Death source giữ owner/lane/printed stats/creationSeq, không nhận buff/heal sau chết. Trigger không chọn target tương tác: target phải là selector xác định; chỉ card/power do người chơi kích hoạt mới yêu cầu lựa chọn. Không tăng thêm prompt cho mỗi trigger.

## Primitive v1

| Primitive | Payload đặc tả | Ngữ nghĩa |
|---|---|---|
| DAMAGE | targets, amount, kind | Amount integer≥0; multi-target một batch; giảm damage và block theo RULES. |
| HEAL | targets, amount | Living only; clamp maxHP; không xóa Poison. |
| MODIFY_STATS | targets, attackDelta, healthDelta, duration | `PERMANENT`/`TURN_END`; healthDelta chỉ ≥0 trong core; ATK floor0. |
| GRANT_SHIELD | targets | Cấp một shield, không stack. |
| GRANT_ARMOR | targets | Armor=1 tối đa, không stack, permanent. |
| APPLY_POISON | targets | Poisoned=true, tối đa một; tick1 ở end-turn. |
| APPLY_STUN | targets | Stunned tới TURN_END hiện tại. |
| GRANT_PIERCE | targets, duration | Trait tới TURN_END hoặc PERMANENT; không stack. |
| MOVE_UNIT | targetUnit, targetLane | Không onPlay/entry; giữ instance; phải còn sống và đích trống khi execute. |
| SUMMON_TOKEN | tokenId, laneSelector | Source owner; không onPlay/entry. Chỗ không còn trống → no-op, không thay quân. |
| DRAW | owner, count | Lần lượt theo R14; có fatigue/overdraw. |

Không `eval`, script tùy ý, truy vấn DB hay callback JS trong content. Trigger condition chỉ dùng predicate đóng: `SELF_ALIVE`, `SELF_DAMAGED`, `ENEMY_PRESENT_HERE`, `EMPTY_LANE_HERE`, `FIRST_TIME_THIS_TURN`. Không dùng dữ liệu private của đối phương.

## Modifier và counter

Mỗi modifier có sourceDefinitionId, sourceInstanceId, sourceLaneAtCreation, createdEventSeq, duration, expiryTurn. Buff permanent trên target còn tồn tại khi source chết; core không có aura liên kết source, ngoài Location modifier được tính tại combat.

Printed stats bất biến. CurrentATK=max(0, printedATK + permanent modifiers + temporary modifiers + active attack modifier). MaxHP=printedHP + health modifiers. Cấm integer float/NaN/Infinity. ATK/HP dùng safe integer; không đặt cap game tùy ý, validator giới hạn từng effect, engine guard overflow chuyển FAULTED.

Trigger `ON_DAMAGED` giới hạn một lần/global turn cho từng ability trong core. Trigger `BEFORE_COMBAT_HERE` giới hạn một lần/global turn/instance, kể cả quân bị move. Các giới hạn ghi trong text card và counter key, reset ở TURN_START.

## Presentation event contract

Event có `eventId`, `sequence`, `rootId`, `kind`, `visibility`, `payload`. Damage batch có `batchId`, các packet với source/target IDs, rawDamage, mitigatedDamage, finalDamage, blocked/shieldConsumed và displayOrder. View theo chủ thể không chứa hidden data.

Nhóm event cần thiết: MatchStarted, MulliganCommitted, TurnStarted, LocationRevealed, EnergyRefilled, CardDrawn(owner/private), HandCountChanged(public), CardPlayed, UnitCreated, UnitMoved, StatsChanged, StatusChanged, AttackDeclared, DamageBatchResolved, UnitDestroyed, PowerGranted(owner/private), BlockOccurred(public), BlockResponseOpened(owner/private), PowerUsed(public), PhaseChanged, MatchEnded.

Chỉ emit tên/cardId bí mật vào event owner-private. Event public `PowerGranted` nếu có chỉ chứa owner/reserveCount, không powerId. Một view được redact trước serialization/logging, không tải toàn event rồi ẩn bằng CSS.

Client không suy luận damage từ sprite collision. GSAP chỉ trình diễn event đã được server chấp nhận. Reconnect dùng view snapshot mới + event cursor, không tính lại luật từ animation.

## Schema authoring và kiểm định

Mỗi card phải có ID duy nhất, contentVersion, faction, class hoặc COMMON, nameVi, type, cost, printed stats nếu UNIT, keyword list, abilities, exactTextVi, artKey, sfxFamily, vfxFamily. Mỗi ability có hook, condition, selectors, ordered primitives, limits, duration và text khớp primitive.

Mỗi power có type=SUPERPOWER, baseCost=1, class/signatureOwner, validPhase từ phe, effects, targeting, text. Mọi hero tham chiếu đúng 4 ID khác nhau, signature của chính hero. Các Location thuộc manifest riêng.

Validator từ chối ENVIRONMENT, target không tồn tại, hook ngoài registry, power tham chiếu sai phe/class, card vào deck không hợp lệ, modifier không duration, token không definition, random effect không hỗ trợ.

## Ví dụ diễn giải

“Khi ra sân: gây 1 sát thương lên quân địch tại đây” → ON_PLAY, ENEMY_UNIT_HERE, DAMAGE(1,EFFECT); không có quân thì no-op; hero không nhận thay.

“Dịch chuyển một quân đồng minh; quân đó +1/+1” → action chọn unitId+emptyLaneId; MOVE trước, MODIFY_STATS permanent sau; nếu unit chết trước primitive tiếp thì buff no-op. Không kích Forest/Frozen Lake.

“Gây 1 lên tất cả quân địch” → snapshot tất cả target rồi damage đồng thời; cleanup tất cả trước death triggers. Không resolve lane1 chết rồi mới tính target lane2.
