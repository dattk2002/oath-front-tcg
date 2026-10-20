# Ngũ Lộ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` for inline execution, or `superpowers:subagent-driven-development` if delegated execution is authorized. Steps use checkbox syntax. **Tài liệu này chưa cho phép bắt đầu viết code, tạo hạ tầng, commit hoặc deploy.**

**Goal:** Xây web card battler PvE với hai phe, sáu hero, năm lane, luật xác định, motion rõ và lưu trận bền vững trên Neon.

**Architecture:** Pure TypeScript engine quyết định toàn bộ luật; Fastify giữ private state và ghi checkpoint, action journal, events, receipt trong cùng transaction. React giữ player view và semantic input; PixiJS/GSAP trình diễn event. App và API cùng origin; Neon Auth dùng cho Google, app tự quản lý guest/session.

**Tech Stack:** React, TypeScript strict, Vite, CSS Modules, PixiJS v8, GSAP/@gsap/react, Node LTS, Fastify, JSON Schema/type provider, Neon Postgres, Drizzle/pg, Neon Auth, pnpm, Vitest/fast-check, Playwright.

**Spec:** [SPECIFICATION.md](../../../SPECIFICATION.md); các hợp đồng chi tiết tại [RULES](../../RULES.md), [EFFECTS](../../EFFECTS.md), [CONTENT](../../CONTENT.md), [ARCHITECTURE](../../ARCHITECTURE.md), [DATA](../../DATA.md), [ACCEPTANCE](../../ACCEPTANCE.md).

**Phụ lục đề xuất v1.1:** [API-CONTRACT](../../API-CONTRACT.md), [TUTORIAL](../../TUTORIAL.md), [SCREENS](../../SCREENS.md). JSON Schema là nguồn field/type public; tutorial manifest là nguồn scene fixtures. Các bổ sung vẫn nằm trong18 task hiện có, không mở thêm milestone sản phẩm.

## Global Constraints

- PvE online; tutorial + skirmish; bot Dễ/Thường; người chơi chọn cả hai phe.
- 6 hero; 60 card thường = 38 UNIT + 22 TRICK; 18 power; 8 Location; 3 token.
- Deck 30 lá, tối đa 2 bản/ID; đúng phe và hai class của hero; power/token không vào deck.
- Hero 20 HP; energy `min(turn,10)`; hand cap 10; power reserve riêng.
- Pha: EVIL_DEPLOY → GOOD_PLAY → EVIL_TRICKS → COMBAT; lane 1→5; damage pair nguyên tử, EVIL animation trước.
- Block +2 từ positive COMBAT hero packet, ngưỡng 8, tối đa 3; power mới dùng miễn phí ngay hoặc giữ dùng giá 1 đúng pha.
- Location chỉ lane 1/3/5, reveal turn 1/3/5; không Environment Card.
- UI tiếng Việt; ID ổn định; không đưa luật vào bitmap; GSAP là engine choreography chính.
- Desktop/tablet ngang là phạm vi gameplay; mobile nhỏ có fallback; keyboard và reduced motion bắt buộc.
- Browser không nhận seed, deck order, hidden Location, opponent hand/power IDs.
- Một source schema cho runtime validation và DTO types; không dùng cast để bỏ qua kiểm tra input.
- Dependency stable, Node LTS còn hỗ trợ, lockfile; xác minh compatibility tại T01. Không thêm service/package ngoài stack nếu chưa nêu vấn đề cụ thể.
- Không ghi secret vào repo/log; không provision/commit/push/deploy theo mặc định.
- Mỗi task phải qua kiểm tra trước khi chuyển task sau; M1→M6 tuần tự. Không đánh dấu hoàn tất bằng việc chỉ tạo file.

## Review Focus

1. Response mất sau commit: retry không chơi hai lần, không lùi UI; cả guest bootstrap và guest claim phải khôi phục cookie. Tests T07/T13.
2. Reload ở block response sau Pierce: giữ power miễn phí, RNG và continuation trước Volcano; không cấp lần hai. Tests T04/T07/T11.
3. Replay bot Dễ khi HTTP batches khác nhau: action journal lưu RNG transition; state hash và lựa chọn tiếp theo phải giống. Tests T06/T08.
4. Hidden information bị lộ gián tiếp: legal actions, error, event cursor, preloaded assets và bot preview đều không phân biệt hai state chỉ khác bí mật. Tests T05/T07/T15.
5. Zoom/reduced motion/reconnect giữa animation: không chọn target cũ, mất focus hay đổi kết quả trận; không rò timeline/texture. Tests T10/T11/T16.

## Bản đồ file và hợp đồng chung

Đây là các đường dẫn **sẽ tạo khi triển khai**, không phải code đã tồn tại.

| Package / vùng | Trách nhiệm |
|---|---|
| `packages/contracts/src/` — `@ngulo/contracts` | JSON schemas và kiểu public |
| `packages/game-content/src/` — `@ngulo/game-content` | Manifest, validator, presets |
| `packages/game-engine/src/` — `@ngulo/game-engine` | Luật, RNG, projection, replay |
| `packages/bot/src/` — `@ngulo/bot` | Chấm điểm bằng player view |
| `packages/db/src/`, `migrations/` — `@ngulo/db` | Drizzle schema, connection, migrations |
| `apps/api/src/` — `@ngulo/api` | Ownership, session, command transaction, API |
| `apps/web/src/` — `@ngulo/web` | React shell, board, Pixi, GSAP, screens |
| `tests/fixtures/` | Scenario constructors theo ID AC; server/test only |
| `tests/e2e/` | Browser user journeys |
| `tools/simulation/`, `tools/assets/`, `tools/load/` | Verification utilities |
| `docs/implementation/` | Compatibility, metrics, runbooks, bằng chứng triển khai |

`PlayerId` = `GOOD | EVIL`; `LaneId` = `1 | 2 | 3 | 4 | 5`. `PlayerAction` và `LegalAction` là union/schema theo ARCHITECTURE; `MatchState` chỉ nằm trong engine/server. `TransitionResult` chứa `nextState`, `events`, `waitingForInput`, `terminalOutcome`. `applyAction` trả `TransitionResult | ActionError`; lỗi có `kind: "error", code` và không sửa state.

`CommandEnvelope = {commandId, expectedRevision, action}`; `CommandResponse = {view, revision, latestSeq, events, eventsThroughSeq, needsAdvance}`. Tên field/union đầy đủ trong API-CONTRACT và schema Draft7. `GameEvent` private và `VisibleEvent` public tách riêng. `BotDecision = {action, nextBotRandomState}`.

`PublicPreview` chỉ trả các đại lượng đã biết: damage/heal, board delta, energy spent, net card count, predicted combat, `uncertain` và nguyên nhân. Draw chưa biết dùng placeholder; gặp outcome phụ thuộc hidden power hoặc random chưa công khai thì đánh dấu uncertain, không tự chọn bí mật. Các delta dùng để chấm bot theo DECKS, không hứa chắc outcome cho người chơi.

Fixture DSL ở `tests/fixtures/match-fixture.ts` cung cấp `makeFixture(config): MatchState`, `unit({id,side,lane,atk,hp,...})` và `publicView(state,side)`. Fixture dùng synthetic ability phải ghi rõ, không thêm vào catalog. Assertion bên dưới là mã test dự kiến trong tài liệu, không phải kết quả đã chạy.

## Milestone M1 — Engine và content

**Phụ thuộc:** Bộ đặc tả v1.0 được dùng làm baseline.  
**Gate:** AC01–AC23 đạt; engine/content không phụ thuộc DOM, DB, mạng hoặc wall clock; toàn bộ core card được validate và mỗi ability có coverage.

### T01 — Catalog hợp lệ và workspace kiểm tra được

**Files:** Tạo `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `vitest.config.ts`; package manifests cho contracts/content/engine; `packages/contracts/src/catalog.ts`, `actions.ts`, `views.ts`; `packages/game-content/src/core/{cards,heroes,powers,locations,tokens,decks}.ts`, `catalog.ts`, `validate.ts`; `packages/game-content/tests/catalog.test.ts`; `docs/implementation/compatibility.md`.

**Interfaces:** Xuất `Catalog`, `DeckInput`, `DeckValidation`, `validateCatalog(catalog: Catalog): ValidationIssue[]`, `validateDeck(deck: DeckInput, catalog: Catalog): DeckValidation`, `coreCatalog`. Schema lấy đúng số liệu trong CONTENT/CARDS/DECKS; không tái cân bằng khi nhập dữ liệu.

Nguồn wire schema: `docs/contracts/api-v1.schema.json`. Tạo generated artifact `packages/contracts/schema/api-v1.schema.json` từ nguồn này, cùng `packages/contracts/tests/http-schema.test.ts`; CI kiểm artifact không lệch. Types/request validators/response serializers dùng cùng contract; không chỉnh riêng bản generated.

- [ ] Chọn stable dependency matrix tương thích, pin Node/package manager, thêm scripts `test`, `typecheck`, `lint`, `build`. Cài dependencies khi đã được yêu cầu triển khai.
- [ ] Viết test `core_catalog_and_presets_are_closed` với assertions:
  ```ts
  expect(validateCatalog(coreCatalog)).toEqual([]);
  expect(coreCatalog.cards).toHaveLength(60);
  expect(coreCatalog.cards.filter(c => c.type === "UNIT")).toHaveLength(38);
  expect(coreCatalog.powers).toHaveLength(18);
  expect(new Set(coreCatalog.cards.map(c => c.id)).size).toBe(60);
  ```
  Thêm checks 6 hero, 8 Location, 3 token, 4 power khác nhau/hero; 6 deck 30 lá/copy≤2; 22 eligible card/hero. Mutations copy3, sai phe/class, duplicate ID, unknown effect, thiếu duration phải thất bại.
- [ ] Thêm schema tests từ `docs/contracts/examples`: chấp nhận mẫu hợp lệ, từ chối seed/hidden Location/opponent power ID/unknown field/lane6; không coerce string revision. Semantic invariants của view kiểm ở T05, không gọi schema test là engine test.
- [ ] Chạy `pnpm --filter @ngulo/contracts exec vitest run tests/http-schema.test.ts`; phải PASS cả positive và negative cases trước gate M1.
- [ ] Chạy `pnpm --filter @ngulo/game-content exec vitest run tests/catalog.test.ts`; xác nhận test fail vì manifest/validator chưa có, không phải cấu hình test hỏng.
- [ ] Nhập manifest và viết hai validator trong `validate.ts`; public schema không chứa match-private fields.
- [ ] Chạy lại lệnh trên và `pnpm typecheck`; chỉ chuyển tiếp khi PASS và đối chiếu text VI với CARDS.

### T02 — Seed, setup, mulligan và Location

**Files:** Tạo `packages/game-engine/src/model.ts`, `rng.ts`, `identity.ts`, `setup.ts`, `mulligan.ts`, `locations.ts`; `tests/fixtures/match-fixture.ts`; `packages/game-engine/tests/{setup,mulligan,locations}.test.ts`.

**Interfaces:** `createMatch(config: MatchConfig, random: RandomStreams): MatchState`; `createRandomStreams(seed: Uint8Array): RandomStreams`; `applyMulligan(state, side, instanceIds): TransitionResult | ActionError`. RNG/substreams/opaque instance IDs đúng R20; identity key không vào view.

- [ ] Viết tests AC03–AC06: cùng seed/config cho cùng state; 3 Location khác nhau chỉ ở lane1/3/5 và ít nhất một BUFF/NEUTRAL; hidden không effect; reveal đúng turn; bot stream không làm đổi deck stream.
  ```ts
  expect(createMatch(config, createRandomStreams(seed)))
    .toEqual(createMatch(config, createRandomStreams(seed)));
  expect(replacementInstanceIds).not.toEqual(expect.arrayContaining(removedInstanceIds));
  expect(afterMulligan.players.GOOD.reserve).toHaveLength(1);
  ```
  Test exclusion từng instance, không cấm bản thứ hai cùng definition; lần mulligan thứ hai phải reject.
- [ ] Chạy `pnpm --filter @ngulo/game-engine exec vitest run tests/setup.test.ts tests/mulligan.test.ts tests/locations.test.ts`; xác nhận FAIL đúng behavior thiếu.
- [ ] Implement setup, shuffle, uniform valid Location triples và reveal theo R03/R05; tạo power sau mulligan; snapshot RNG/counters.
- [ ] Chạy lại các test; kiểm 0/4 lá đổi, deck counts và initialization chứa đủ ID cho replay. Không dùng `Math.random()` trong engine.

### T03 — Phase, energy và effect primitives

**Files:** Tạo `packages/game-engine/src/{actions,phases,targets,modifiers}.ts`, `effects/{resolve,damage,triggers}.ts`; `packages/game-engine/tests/{phases,effects,core-abilities}.test.ts`.

**Interfaces:** `getLegalActions(state: MatchState, actor: PlayerId): LegalAction[]`; `applyAction(state: MatchState, action: PlayerAction): TransitionResult | ActionError`; `resolveEffects(state, context, effects): TransitionResult`. Public export chỉ action boundary; resolver dùng nội bộ.

- [ ] Viết tests AC07–AC09/AC13: permission từng phase; energy turn1/10/11 =1/10/10; EVIL giữ phần dư qua pha3; Desert chỉ phụ phí UNIT played; Forest/Frozen chỉ ON_PLAY tại Location đã reveal; move/token không kích entry.
  ```ts
  expect(damage({ raw: 1, armor: 1, shield: true }))
    .toMatchObject({ finalDamage: 0, shieldConsumed: false });
  expect(damage({ raw: 3, armor: 1, shield: true }))
    .toMatchObject({ finalDamage: 0, shieldConsumed: true });
  ```
  `damage` là test adapter của resolver, không thêm API gameplay mới. Data-driven coverage cho mỗi ability ID, target, duration và no-target behavior.
- [ ] Chạy `pnpm --filter @ngulo/game-engine exec vitest run tests/phases.test.ts tests/effects.test.ts tests/core-abilities.test.ts`; xác nhận FAIL theo primitive thiếu.
- [ ] Implement registry đóng trong EFFECTS; UNIT play: trả cost → tạo quân → Location entry → ON_PLAY → settle; resolve root trước nhận intent tiếp.
- [ ] Chạy lại tests; xác nhận card text, legal action và resolver dùng cùng catalog, không hardcode ID ở UI.

### T04 — Combat, block response và continuation

**Files:** Tạo `packages/game-engine/src/{combat,block,powers,automatic}.ts`; `packages/game-engine/tests/{combat,block-response}.test.ts`; thêm fixtures `combat-pierce-volcano.ts`.

**Interfaces:** `advanceAutomatic(state: MatchState, budget: AdvanceBudget): TransitionResult`; pending continuation có lane, stage, pending responder và power ID; `USE_BLOCK_POWER`/`KEEP_BLOCK_POWER` qua `applyAction`. Budget không cắt giữa root.

- [ ] Viết tests AC10–AC12/AC14–AC15/AC18: 3/2 đấu3/2 cùng chết; displayOrder EVIL trước; Stun/Exhaust/ATK0 không đánh nhưng chặn lane; moved unit không đánh hai lần. Với Pierce case trong ACCEPTANCE:
  ```ts
  expect(afterPair.players.GOOD.hp).toBe(20);
  expect(afterPair.players.GOOD.block).toMatchObject({ charge: 0, used: 1 });
  expect(afterPair.board[1].GOOD?.hp).toBe(1);
  expect(afterPair.board[1].EVIL).toBeNull();
  expect(afterPair.pendingBlockResponse?.side).toBe("GOOD");
  ```
  Thêm meter chỉ nhận COMBAT dương; block thứ4 không tồn tại; bốn power nhận không trùng; response chỉ cho dùng power mới.
- [ ] Chạy `pnpm --filter @ngulo/game-engine exec vitest run tests/combat.test.ts tests/block-response.test.ts`; xác nhận FAIL.
- [ ] Implement snapshot attacker pair, damage batch, death cleanup, block window và continuation theo R08–R12. Giữ power rồi mới Volcano; heal trước Volcano có thể cứu quân.
- [ ] Chạy lại tests; serialize/deserialize checkpoint ở response phải cho cùng next state/events; response miễn phí không trừ mana và không thay phase thành GOOD_PLAY.

### T05 — End turn, terminal, projection và deterministic replay

**Files:** Tạo `packages/game-engine/src/{end-turn,terminal,projection,preview,hash,replay}.ts`; `packages/game-engine/tests/{end-turn,invariants,projection,replay,preview}.test.ts`.

**Interfaces:** `projectPlayerView(state, viewer): PlayerView`; `projectEvents(events, viewer): VisibleEvent[]`; `previewPublicAction(view, action): PublicPreview`; `hashState(state): string`; `replayJournal(initialState, entries): ReplayResult`. `JournalEntry` có origin, action, nextBotRandomState, pre/post hashes và event bounds; replay trả final state/events hoặc mismatch tại stepSeq.

- [ ] Viết tests AC17/AC19–AC23: Poison trước Spring; fatigue1/2/3; draw2 đúng thứ tự; cap10 discard; cả hai hero lethal trong cùng root hòa; HP0 không được heal sống lại; end-turn20 hòa.
  ```ts
  expect(hashState(inputAfterRejectedAction)).toBe(hashState(inputBefore));
  expect(projectPlayerView(hiddenVariantA, "GOOD"))
    .toEqual(projectPlayerView(hiddenVariantB, "GOOD"));
  expect(replayJournal(initial, journal).finalState).toEqual(finalState);
  ```
  Property tests ít nhất 1.000 chuỗi legal action có seed báo khi fail: HP/ATK hữu hạn, lane capacity≤1, unique instance, không mutate input, illegal không đổi RNG/seq. Test PublicPreview không đoán unknown draw/power.
- [ ] Chạy `pnpm --filter @ngulo/game-engine exec vitest run tests/end-turn.test.ts tests/invariants.test.ts tests/projection.test.ts tests/replay.test.ts tests/preview.test.ts`; xác nhận FAIL.
- [ ] Implement thứ tự checkpoint/terminal trong RULES; canonical hash không timestamp; visibility whitelist; replay bot row phục hồi RNG đã ghi trước kiểm post hash.
- [ ] Chạy toàn bộ content/engine tests và `pnpm typecheck`; lưu coverage mapping ability→test. **Gate M1:** không còn AC01–AC23 thiếu test, trừ AC16 durability/browser được nghiệm thu M2/M3; không gọi balance đã đạt.

## Milestone M2 — API, Neon, guest và bot

**Phụ thuộc:** M1 PASS.  
**Gate:** Chạy trận qua HTTP với guest, bot, persistence, retry/restart; AC24–AC28 và ownership đạt trên PostgreSQL test thật. Dùng tài nguyên test được xác định khi triển khai, chưa tạo trong giai đoạn thiết kế.

### T06 — Schema và durable transaction

**Files:** Tạo package db; `packages/db/src/{schema,connection}.ts`, `packages/db/migrations/0001_core.sql`, `packages/db/tests/constraints.test.ts`; `apps/api/src/matches/{repository,journal}.ts`, `apps/api/tests/persistence.test.ts`; `docs/implementation/database-test-environment.md`.

**Interfaces:** `createPool(config): Pool`; `withLockedMatch<T>(principalId, matchId, fn: (tx, record) => Promise<T>): Promise<T>`; `persistTransition(tx, transition, journal, receipt): Promise<void>`. `journal` là `JournalEntry[]` từ T05; BOT row bắt buộc RNG sau decision.

- [ ] Xác định database test và quyền migration/runtime riêng; credentials qua environment, không tạo production resource ngầm.
- [ ] Viết tests AC26/AC40 với DB thật: FK/unique; hai create match cạnh tranh chỉ một ACTIVE; fault injection sau append events nhưng trước receipt phải rollback mọi bảng.
  ```ts
  expect(afterFailure.checkpoint).toEqual(before.checkpoint);
  expect(afterFailure.events).toEqual(before.events);
  expect(afterFailure.receipts).toEqual(before.receipts);
  expect(replayed.finalState).toEqual(persisted.state);
  ```
  Thêm Easy-bot row có RNG transition: bỏ field phải validation fail; replay đủ row phải khớp post hash.
- [ ] Chạy `pnpm --filter @ngulo/db exec vitest run tests/constraints.test.ts` và `pnpm --filter @ngulo/api exec vitest run tests/persistence.test.ts`; xác nhận FAIL do thiếu behavior/schema.
- [ ] Implement mọi bảng/constraint/retention fields trong DATA; pool max5, runtime pooled URL, migration direct URL. Initialization/deck snapshots/content versions bất biến.
- [ ] Chạy lại tests trên migration database trống; kiểm restart process đọc lại pending continuation. Lưu log kiểm chứng đã redact.

### T07 — Guest, command API, receipts và recovery log

**Files:** Tạo `apps/api/src/app.ts`, `auth/{guest,sessions,csrf}.ts`, `matches/{routes,service,commands,events}.ts`, `content/registry.ts`; `packages/contracts/src/{http,session}.ts`; `apps/api/tests/{guest,commands,authorization,event-recovery}.test.ts`.

**Interfaces:** `buildApp(deps): FastifyInstance`; `executeCommand(principal, matchId, envelope: CommandEnvelope): Promise<CommandResponse>`; `readMatchView(principal, matchId): Promise<CommandResponse>`; `readVisibleEvents(principal, matchId, query): Promise<EventPage>`. `EventPage={events,nextCursor,scannedThroughSeq,hasMore}`; snapshot `latestSeq` là upper bound cố định cho log recovery.

Thêm `readMatchSummary(principal, matchId): Promise<MatchSummary>` tại `apps/api/src/matches/summary.ts`; route `/matches/:id/summary`; tests `apps/api/tests/match-summary.test.ts`. Full details hết retention410, summary còn180 ngày và chứa owner-only rematch config. POST create kiểm expectedContentVersion; version lệch409, không tạo match.

- [ ] Viết tests AC16/AC22/AC24–AC26/AC34: retry cùng ID/body nhận cùng receipt; khác body409; cùng expectedRevision chỉ một action commit; 404 cross-owner; CSRF/Origin sai bị reject; block reload giữ power0mana và lane.
  ```ts
  expect(second.body).toEqual(first.body);
  expect(receiptCount).toBe(1);
  expect(stale.statusCode).toBe(409);
  expect(otherOwner.statusCode).toBe(404);
  expect(privateOnlyPage.scannedThroughSeq).toBeGreaterThan(cursor);
  ```
  Thêm bootstrap mất Set-Cookie: cùng recoverySecret+ID khôi phục cùng principal trong5 phút; sai secret không lấy được session; expiry không tạo quyền recovery. Hidden event page không lộ payload/kind; log hết retention410.
- [ ] Thêm assertions summary sau xóa details giữ deckId/revision hoặc preset, opponent/difficulty/content guard; wrong-owner404. Command hơn100 visible event có eventsThroughSeq và log recovery đầy đủ; GET snapshot không làm mất log cursor cũ.
- [ ] Chạy `pnpm --filter @ngulo/api exec vitest run tests/match-summary.test.ts tests/event-recovery.test.ts`; phải PASS trên DB test và không bỏ qua retention/rematch case.
- [ ] Chạy `pnpm --filter @ngulo/api exec vitest run tests/guest.test.ts tests/commands.test.ts tests/authorization.test.ts tests/event-recovery.test.ts`; xác nhận FAIL.
- [ ] Implement transaction order trong ARCHITECTURE: auth → row lock → receipt → revision → transition → atomic persist → redact response. Không gọi provider/network khi lock. Thêm routes catalog, presets, match create/get/list/commands, session và health.
- [ ] Chạy lại tests; kill/restart API sau committed response bị drop và retry cùng ID. Kiểm JSON/error/access logs không chứa private fixture canaries, seed hoặc raw token. **Gate:** test thuần Fastify injection chưa thay thế DB integration.

### T08 — Bot và automatic batches

**Files:** Tạo `packages/bot/src/{model,evaluate,mulligan,policy}.ts`, `packages/bot/tests/{policy,fairness}.test.ts`; `apps/api/src/matches/advance.ts`, `apps/api/tests/advance.test.ts`.

**Interfaces:** `chooseBotAction(view: PlayerView, legal: LegalAction[], context: BotContext): BotDecision`; `BotContext` gồm difficulty, bot RNG state, public observation memory, không raw MatchState. `advanceMatch(tx, record, budget: AdvanceBudget): Promise<CommittedBatch>` gọi engine và bot, persist ordered journal.

- [ ] Viết tests AC27/AC28: same view/legal/context → same decision; state ẩn khác không ảnh hưởng; mọi action legal; không surrender; policy tie và score đúng DECKS. Dễ dùng `bot:easy`, không sửa stream khác.
  ```ts
  expect(legal).toContainEqual(decision.action);
  expect(normalDecisionA).toEqual(normalDecisionB);
  expect(runWithBatchLimit(1).stateHash).toBe(runWithBatchLimit(8).stateHash);
  expect(replayedEasy.nextDecision).toEqual(originalEasy.nextDecision);
  ```
  Kiểm pause không advance; mỗi batch tối đa8 action, CPU250ms chỉ cắt giữa root; guard64 intents/lượt FAULTED thay vì softlock.
- [ ] Chạy `pnpm --filter @ngulo/bot exec vitest run` và `pnpm --filter @ngulo/api exec vitest run tests/advance.test.ts`; xác nhận FAIL.
- [ ] Implement score/tie/mulligan đúng DECKS; persist cả action và nextBotRandomState. Dùng đồng hồ monotonic được inject chỉ cho server batch budget, không trong game rules.
- [ ] Chạy lại tests; HTTP integration chơi tới terminal cho cả human side GOOD/EVIL bằng scripted legal actions, có pause/restart giữa batch. **Gate M2:** không mất state, không leak, journal replay khớp.

## Milestone M3 — Trận PvE hoàn chỉnh trong browser

**Phụ thuộc:** M2 PASS.  
**Gate:** Người chơi hoàn thành trận bằng click/tap/keyboard; đầy đủ block response và recovery. Motion nền chạy trên event; asset placeholder có nhãn được chấp nhận ở mốc này.

### T09 — React shell, view store và input thống nhất

**Files:** Tạo package web, `apps/web/{index.html,vite.config.ts}`; `src/app/{App,router}.tsx`, `src/styles/tokens.css`, `src/features/match/{MatchScreen,Board,Hand,HeroPanel,PhaseControl}.tsx`, `{view-store,intent-controller,api-client}.ts`; `tests/{view-store,intent-controller}.test.ts`; `tests/e2e/match-foundation.spec.ts`.

**Interfaces:** `createMatchViewStore(initial): MatchViewStore` với `subscribe/getSnapshot/acceptResponse`; `submitIntent(action: PlayerAction): Promise<void>`; `selectCard(instanceId)` và `selectTarget(target)` dùng chung cho click/drag/keyboard. Store giữ authoritative revision, presentation cursor, pending command và selection; không import engine-private modules.

- [ ] Viết unit tests AC25/AC30: receipt revision8 đến sau snapshot9 không lùi UI; pending request giữ cùng ID khi retry; stale409 không tự reapply; target invalid không gửi request.
  ```ts
  store.acceptResponse(response9);
  store.acceptResponse(response8);
  expect(store.getSnapshot().revision).toBe(9);
  expect(apiSend).not.toHaveBeenCalled();
  ```
  E2E dùng fixture server riêng: guest → preset → mulligan → chơi UNIT → pass; mana/board và phase label đúng cả hai phe.
- [ ] Chạy `pnpm --filter @ngulo/web exec vitest run tests/view-store.test.ts tests/intent-controller.test.ts` và `pnpm exec playwright test tests/e2e/match-foundation.spec.ts`; xác nhận FAIL.
- [ ] Implement semantic DOM theo UI-MOTION, fonts Việt, 5 lane cố định; Vite dev proxy cùng origin; same-origin static serving và SPA fallback trong API. Không dùng optimistic gameplay mutation.
- [ ] Chạy lại tests và browser kiểm flow thật qua API/DB; inspect console/network. Xác nhận refresh route trả app, `/api` không bị SPA fallback.

### T10 — Pixi scene và GSAP presentation

**Files:** Tạo `apps/web/src/features/match/rendering/{scene,sprites,assets}.ts`, `motion/{presentation-controller,event-timeline,reduced-motion}.ts`, `BattleScene.tsx`; `apps/web/tests/presentation.test.ts`; `tests/e2e/motion.spec.ts`.

**Interfaces:** `createBattleScene(canvas, assets): BattleScene` với `applyView`, `dispose`; `createPresentationController(scene, options): PresentationController` với `enqueue(events)`, `fastForward(view)`, `pause`, `resume`, `dispose`. Controller không gửi gameplay action từ timeline completion.

- [ ] Viết tests AC31/Review Focus5: shared damage beat cập nhật hai HP; event sequence không đảo; dispose/unmount/reconnect dọn timeline, listeners và textures; reduced mode kết quả/log giống normal.
  ```ts
  expect(committedDamageBatchIds).toEqual([pair.batchId]);
  expect(gameplayCommandsFromTimeline).toHaveLength(0);
  expect(controller.disposedResourceCount).toBe(createdResourceCount);
  ```
  Counts là instrumented test doubles, không thêm telemetry vào UI. E2E ngắt scene giữa signature rồi remount: không error/canvas trùng.
- [ ] Chạy `pnpm --filter @ngulo/web exec vitest run tests/presentation.test.ts` và `pnpm exec playwright test tests/e2e/motion.spec.ts`; xác nhận FAIL.
- [ ] Implement Pixi WebGL lazy-load, GSAP scoped cleanup, tất cả event families/timings trong UI-MOTION; HP authoritative không lấy từ va chạm sprite. Asset placeholder dùng cùng anchor/bounds như asset cuối.
- [ ] Chạy lại tests, xem combat5 lane và reduced mode thực tế. Log bất kỳ chênh lệch timing; chưa gọi FPS đạt nếu chưa profile T16.

### T11 — Response window, reconnect và trọn trận

**Files:** Tạo `apps/web/src/features/match/{BlockResponse,PauseDialog,BattleLog,ResultDialog}.tsx`, `{recovery,keyboard,drag}.ts`; `tests/e2e/{full-match,block-recovery,input-parity}.spec.ts`.

**Interfaces:** `recoverMatch(matchId, cursor): Promise<RecoveredMatch>` lấy snapshotN rồi event pages tới N; `RecoveredMatch={response,logEvents,logExpired}`. Drag threshold6px; keyboard và pointer gọi intent controller T09.

Block/result theo SCREENS: panel block không modal, Esc hủy target không KEEP; no-target vẫn Keep; result lấy summary để rematch sau reload. Thêm E2E rematch từ history sau details expiry, version drift đưa về deck review, không đoán deck từ hero.

- [ ] Viết E2E AC16/AC29/AC30/Review Focus2/5: reload tại block; mất response; mất mạng giữa tween; two tabs; fullmatch→result→rematch; keyboard/drag cùng intent.
  ```ts
  await expect(page.getByText("Miễn phí lúc này")).toBeVisible();
  await expect(page.getByRole("button", { name: "Để dành" })).toBeEnabled();
  expect(afterReconnect.blockPowerGrantCount).toBe(1);
  expect(afterReconnect.continuationLane).toBe(1);
  ```
  Snapshot assertions lấy qua fixture test server, không thêm production debug endpoint. Test giữ power rồi Volcano giết quân và dùng heal trước Volcano quân sống.
- [ ] Chạy `pnpm exec playwright test tests/e2e/full-match.spec.ts tests/e2e/block-recovery.spec.ts tests/e2e/input-parity.spec.ts`; xác nhận FAIL.
- [ ] Implement recovery dedup/cursor, fast-forward khi backlog>2s, focus restore, no-timeout response, pause/surrender confirmation. Ẩn tab dừng idle/polling; background stale tab lấy view mỗi5s chỉ khi nhìn trận.
- [ ] Chạy lại E2E trên browser mục tiêu; tự chơi một trận mỗi phe. **Gate M3:** không còn blocker input/state/log/reconnect; screenshot và console logs lưu làm bằng chứng.

## Milestone M4 — Vòng sử dụng sản phẩm đầy đủ

**Phụ thuộc:** M3 PASS.  
**Gate:** Hero/deck selection, Google/guest merge, tutorial, settings/history hoạt động qua server và database; nội dung core mở đầy đủ.

### T12 — Hero select và deck builder

**Files:** Tạo `apps/web/src/features/hero/{HeroSelect,HeroInspect}.tsx`, `features/deck/{DeckList,DeckBuilder,CardCollection,ManaCurve}.tsx`; `apps/api/src/decks/{routes,service}.ts`; `apps/api/tests/decks.test.ts`; `tests/e2e/deck-builder.spec.ts`.

**Interfaces:** `saveDeck(principal, input, expectedRevision?, commandId): Promise<DeckDTO>`; `DeckDTO` chứa id/name/hero/contentVersion/entries/revision/validation. UI dùng `validateDeck` từ T01 để feedback; server luôn kiểm lại.

Hero/deck layouts và exact control states theo SCREENS/UX01–UX03; D_G_BV phải hiện22 UNIT/8 TRICK, curve `[8,12,6,2,0,2]`, cost trung bình2.33. Bổ sung assertion curve đếm copies, không distinct IDs.

- [ ] Viết tests AC02/AC32: draft dưới30 lưu được nhưng không Play; 30 hợp lệ Play; thêm copy3 bị chặn; sai class/phe reject; stale deck revision409; deck edit không đổi match snapshot.
  ```ts
  expect(savedDraft.validation.playable).toBe(false);
  expect(validDeck.validation.playable).toBe(true);
  expect(matchAfterDeckEdit.deckSnapshot).toEqual(matchBefore.deckSnapshot);
  ```
  E2E kiểm 6 hero, mỗi hero hiển thị đúng4 power và signature; filter/search/curve thống nhất với collection.
- [ ] Chạy `pnpm --filter @ngulo/api exec vitest run tests/decks.test.ts` và `pnpm exec playwright test tests/e2e/deck-builder.spec.ts`; xác nhận FAIL.
- [ ] Implement item surface chọn/inspect với semantic controls và +/− độc lập; copy preset thành deck người dùng; immutable deck_versions và ownership.
- [ ] Chạy lại tests; tự kiểm tiếng Việt dài, keyboard và empty/error/draft states. Không thêm rarity/shop/unlock.

### T13 — Google login, claim guest và lịch sử

**Files:** Tạo `apps/api/src/auth/{neon-jwt,exchange,claim,logout}.ts`, `apps/api/tests/{auth-claim,session-renewal}.test.ts`; `apps/web/src/features/auth/{AuthPanel,MergeConflictDialog}.tsx`, `neon-client.ts`; `features/history/HistoryScreen.tsx`; `tests/e2e/auth-claim.spec.ts`.

**Interfaces:** `verifyNeonJwt(token): Promise<VerifiedIdentity>`; `claimGuest(sourceSession, identity, commandId, choice?): Promise<ClaimResult>`; `exchangeIdentity(identity, commandId): Promise<AppSessionResult>`. ClaimResult là success hoặc MERGE_MATCH_CONFLICT; không lấy guestId làm bằng chứng sở hữu.

- [ ] Xác định Neon Auth project/origin/OAuth test app được phép dùng; kiểm issuer/JWKS hiện hành bằng tài liệu chính thức và token test đã redact. Không dùng account production ngầm.
- [ ] Viết tests AC33/AC34/Review Focus1: convert guest; merge account có sẵn; hai active match cần chọn; guest không claim sang hai account; expired/forged/wrong issuer JWT reject; logout cookie cũ không vào API.
  ```ts
  expect(retry.targetPrincipalId).toBe(first.targetPrincipalId);
  expect(deckCopiesAfterRetry).toBe(deckCopiesAfterFirstClaim);
  expect(revokedGuestGameplay.statusCode).toBe(401);
  expect(recoveredClaim.statusCode).toBe(200);
  ```
  Recovery sau commit mất Set-Cookie: cùng revoked source cookie+ID+subject+CSRF trong5 phút chỉ phục hồi completed claim; không merge lại; khác subject/sai secret/quá hạn reject. Sau5 phút login exchange vào account đã có dữ liệu.
- [ ] Chạy `pnpm --filter @ngulo/api exec vitest run tests/auth-claim.test.ts tests/session-renewal.test.ts` và `pnpm exec playwright test tests/e2e/auth-claim.spec.ts`; xác nhận FAIL.
- [ ] Implement claim trước exchange khi có guest; app-session ≤15 phút và không vượt verified JWT expiry; CSRF/Origin/HttpOnly cookie; history20/trang; preserve match/decks sau login.
- [ ] Chạy lại tests; kiểm một Google OAuth callback thật trong test environment. Mock JWT tests không đủ để đánh dấu integration OAuth đạt. Nếu tài khoản test chưa có, ghi task còn chờ, không giả PASS.

### T14 — Tutorial, settings và audio

**Files:** Tạo `packages/game-content/src/tutorial/tutorial-v1.ts`; `apps/api/src/matches/tutorial.ts`; `apps/web/src/features/tutorial/{TutorialOverlay,tutorial-controller}.tsx`, `features/settings/{SettingsDialog,audio-manager}.tsx`; `apps/web/tests/audio.test.ts`; `tests/e2e/tutorial-settings.spec.ts`.

**Interfaces:** `createTutorialConfig(side: PlayerId): MatchConfig`; `getTutorialStep(view, progress): TutorialStep`; `createAudioManager(): AudioManager` có `unlockFromGesture`, `setMusicVolume`, `setSfxVolume`, `setMuted`, `dispose`. Persistent settings versioned trong localStorage; tutorial completion trên principal.

Source fixtures `docs/contracts/tutorial-v1.scenarios.json`, behavior/lời hướng dẫn/allowlist/predicates ở TUTORIAL. Implement G01–G08 và E01–E02; scene load journaled AUTO, event/instance counters không reset. Server progress không phụ thuộc tween completion. Thêm `packages/game-engine/tests/tutorial-scenarios.test.ts` cho TU01–TU12; seed/board override chỉ server tutorial registry.

- [ ] Viết tests AC35: 8 bước đúng R19, skip/replay, bổ sung EVIL, reload giữ bước từ server state; tutorial không tính balance/history win rate. Audio không phát trước user gesture; mute/volume music và SFX độc lập.
- [ ] Chạy cả hai nhánh G07: dùng signature cho GOOD12 HP/quân2/5 Khiên, hoặc keep giữ10 HP/quân2/3; cả hai tới turn5 mở Spring, EVIL18 HP. E01 giữ2 mana sang EVIL_TRICKS; E02 giết GC01 lane5. Các số lấy từ TU01–TU12, không tự điều chỉnh để test pass.
- [ ] Chạy `pnpm --filter @ngulo/game-engine exec vitest run tests/tutorial-scenarios.test.ts`; TU01–TU12 phải PASS, bao gồm reload/restart và hai nhánh power.
  ```ts
  expect(playBeforeGesture).not.toHaveBeenCalled();
  expect(settings.musicVolume).toBe(0);
  expect(settings.sfxVolume).toBe(0.6);
  expect(skirmishConfig.seed).toBeUndefined();
  ```
  Assertion seed áp dụng public create input; seed thật sinh trên server. Tutorial public script không cho client override skirmish.
- [ ] Chạy `pnpm --filter @ngulo/web exec vitest run tests/audio.test.ts` và `pnpm exec playwright test tests/e2e/tutorial-settings.spec.ts`; xác nhận FAIL.
- [ ] Implement guided overlay không chặn keyboard/inspect; audio family map, pause/hidden-tab behavior, settings restore và error fallback.
- [ ] Chạy lại tests; tự chơi tutorial từ tài khoản mới và replay. **Gate M4:** hành trình Home→hero/deck→trận→result/history→login/resume thông suốt.

## Milestone M5 — Asset, trải nghiệm và balance

**Phụ thuộc:** M4 PASS.  
**Gate:** Artwork/audio đủ manifest; UI accessible và đo performance thật; 900 trận baseline cùng stress scenarios; playtest người thật có ghi nhận. Gate không đồng nghĩa mọi matchup chắc chắn 50/50.

### T15 — Asset pipeline và bộ hình/âm thanh

**Files:** Tạo `assets/source/manifest.json`, `tools/assets/{validate,build-atlas}.ts`, `apps/web/public/assets/core-v1/`, `apps/web/src/features/match/rendering/asset-manifest.ts`; `tools/assets/tests/manifest.test.ts`; `tests/e2e/asset-fallback.spec.ts`; `docs/implementation/art-review.md`.

**Interfaces:** `AssetManifest` chứa ID/version/source/provenance/license/bounds/anchor/size/atlasGroup; `loadBattleAssets(catalogVersion, quality): Promise<AssetBundle>`. Không load terrain theo hidden assignment; cả8 terrain thuộc cùng pool.

- [ ] Làm mẫu 1 hero, 2 unit, 1 terrain theo art direction đã duyệt; review consistency, silhouette/contrast và crop ở đúng cỡ. Đánh dấu art review riêng, không tự coi wireframe là final art.
- [ ] Viết tests AC36/Review Focus4: mọi artKey có fallback/tên; atlas≤2048²; asset hash tồn tại; không chữ luật trong image; hai match chỉ khác hidden Location có cùng preload request set.
  ```ts
  expect(preloadsForHiddenA).toEqual(preloadsForHiddenB);
  expect(missingAsset.fallbackLabel).toBe(card.nameVi);
  expect(manifestIssues).toEqual([]);
  ```
- [ ] Chạy `pnpm exec vitest run tools/assets/tests/manifest.test.ts` và `pnpm exec playwright test tests/e2e/asset-fallback.spec.ts`; xác nhận FAIL.
- [ ] Sản xuất đủ nhóm trong UI-MOTION: 6 hero,60 card/38 unit cutout,18 power,3 token,8 terrain,7 VFX families,12–20 SFX và2 music loops. Export thumb256/inspect512 WebP, alpha cutouts, shared atlases; ghi nguồn/quyền sử dụng.
- [ ] Chạy validator/build atlas và E2E; thử404/slow asset/retry; xem tất cả art trong contact sheet và trong board. Không đánh dấu hoàn thành khi vẫn có placeholder trong core ngoài fallback có chủ đích.

### T16 — Responsive, accessibility và performance

**Files:** Chỉnh `apps/web/src/styles/`, các screen và rendering adapters theo findings; tạo `tests/e2e/{responsive,accessibility,performance}.spec.ts`, `docs/implementation/{accessibility,performance}.md`.

**Interfaces:** Giữ public contracts; thêm settings `motion: "system" | "reduced"` và `quality: "auto" | "low" | "standard"` nếu chưa có; quality chỉ thay rendering, không game rules.

- [ ] Viết checks AC37/AC38: desktop1366×768/1440×900, tablet1024×768,375px fallback; zoom200%; 10-card hand; glyph Việt; dialogs/focus/keyboard; contrast≥4.5:1 cho text thường; hit area mục tiêu44px.
  ```ts
  await expect(page.getByRole("button", { name: "Kết thúc hành động" })).toBeInViewport();
  expect(documentHasHorizontalOverflow).toBe(false);
  expect(criticalAccessibilityViolations).toEqual([]);
  ```
  375px dùng fallback, không ép assertion combat control visible. Thêm reconnect giữa tween, reduced motion và texture disposal measurements.
- [ ] Chạy `pnpm exec playwright test tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts`; ghi FAIL cụ thể trước sửa. Nếu đã pass, không tạo lỗi giả; giữ baseline và làm manual review.
- [ ] Dùng `gpt-taste` cho chỉnh sửa visual và `ui-ux-pro-max` review; sửa objective findings. Tối ưu bundle/atlas/particle tại nơi profile chỉ ra.
- [ ] Chọn thiết bị benchmark thật, ghi model/CPU/RAM/GPU/browser/renderer/network. Đo ít nhất3 lần ×60 giây scene10 quân/full hand/mass effect; report median/p95/p99, long tasks, heap/texture sau20 mount/unmount.
- [ ] Chạy performance fixture và đối chiếu UI-MOTION: frame16.7/20/33.3ms; shell≤300KB gzip, battle≤900KB, preload≤12MB, textures≤128MB, particles≤500 hoặc200 low, CLS≤0.1. Kiểm Chrome/Edge/Firefox/Safari stable trong phạm vi thiết bị có thể dùng; thiếu browser ghi rõ chưa kiểm. Manual screen-reader/keyboard/touch bắt buộc, scanner không thay thế.

### T17 — Simulation và playtest balance

**Files:** Tạo `tools/simulation/{run,metrics,seed-list}.ts`, `tools/simulation/tests/determinism.test.ts`, `docs/implementation/balance/core-v1/`; chỉnh manifest version mới nếu dữ liệu yêu cầu.

**Interfaces:** `simulateMatch(config, seed): SimulationResult`; `runMatrix(matrix, seedList, versions): BalanceReport`. Report có version/hash/seed list, outcome/turns/hero/location/card usage/block/fatigue/fault metrics; raw full-state logs chỉ test/private.

- [ ] Viết test AC39: report9 matchup×100seed=900; rerun cùng inputs cho cùng metrics; không trộn content/bot version; seed regression cố định ít nhất20.
  ```ts
  expect(report.matches).toHaveLength(900);
  expect(report.matchupCount).toBe(9);
  expect(report.faultCount).toBe(0);
  expect(rerun.metrics).toEqual(report.metrics);
  ```
- [ ] Chạy `pnpm exec vitest run tools/simulation/tests/determinism.test.ts`; xác nhận FAIL.
- [ ] Implement runner qua engine/bot thật; chạy `pnpm exec tsx tools/simulation/run.ts --matrix core-v1 --seeds-per-matchup 100` và100seed cho mỗi stress scenario trong BALANCE.
- [ ] Phân tích ngưỡng40–60%, turn-limit>5%, trướcturn5>40%; sửa luật/UX hoặc bot trước cân card. Nếu đổi content, tăng version, chạy lại impacted regression và baseline; không ghi đè match version cũ.
- [ ] Tổ chức tối thiểu5 người×2 trận sau tutorial, ghi lỗi hiểu phase/cost/target và thời lượng; mục tiêu beta30 trận phản hồi. Đây là phụ thuộc người tham gia thật; không thay bằng tự mô phỏng hay bịa feedback.
- [ ] **Gate M5:** không fault/leak/illegal accepted; findings nghiêm trọng đã sửa, tất cả ngưỡng lệch có phân tích và quyết định; báo số mẫu và giới hạn thay vì khẳng định cân bằng tuyệt đối.

## Milestone M6 — Sẵn sàng phát hành

**Phụ thuộc:** M5 PASS.  
**Gate:** Build tái lập, test DB migration/restore/retention, load20 trận đồng thời, runbook và release checklist đủ bằng chứng. Actual production deploy là bước riêng cần yêu cầu rõ của người dùng.

### T18 — CI, vận hành và release candidate

**Files:** Tạo `.github/workflows/ci.yml` nếu repository GitHub được chọn, `apps/api/src/maintenance/retention.ts`, `apps/api/tests/{retention,release-safety}.test.ts`, `tools/load/pve.ts`, `docs/implementation/{release-runbook,restore-drill,release-checklist}.md`. Thêm hosting config chỉ sau khi account/plan/region được xác định.

**Interfaces:** `runRetention(db, cutoff: Date): Promise<RetentionReport>`; `checkSupportedVersions(registry, activeMatches): VersionSupportReport`; health endpoints từ T07. CI không dispatch/deploy tự động chỉ vì có file workflow.

- [ ] Viết tests AC38/AC40: expired guest7 ngày; account inactivity30 ngày; active details không bị xóa; terminal details30 ngày, results180 ngày; receipts/claim tombstones đúng DATA; unsupported active rulesVersion chặn rollout.
  ```ts
  expect(activeCheckpointAfterCleanup).toEqual(activeCheckpointBefore);
  expect(day31TerminalEvents).toHaveLength(0);
  expect(day31Result).toBeDefined();
  expect(unsupportedVersionReport.canRelease).toBe(false);
  ```
  Thêm security assertions: no-store API, secret redaction, rate/body bounds, wrong-owner404, session expiry, same-origin CSRF.
- [ ] Chạy `pnpm --filter @ngulo/api exec vitest run tests/retention.test.ts tests/release-safety.test.ts`; xác nhận FAIL.
- [ ] Implement cleanup có lock/cutoff; CI frozen lockfile/typecheck/lint/unit/integration/build/E2E; logs/request IDs; health/readiness; graceful shutdown chờ transaction kết thúc trong deadline.
- [ ] Chạy migration từ DB trống và version trước trên test environment; restore một snapshot rồi resume trận đang BLOCK_RESPONSE. Ghi recovery time/data loss thực đo, không suy ra từ quảng cáo backup.
- [ ] Chạy `pnpm exec tsx tools/load/pve.ts --concurrency 20`; đo action warm p95≤500ms, auto batch target≤1s wall; cold start báo riêng. Không dùng stress test vào production chưa được cho phép.
- [ ] Chạy `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` và toàn bộ E2E trong môi trường thích hợp. Lưu command/exit status/artifacts, liệt kê skipped checks.
- [ ] Kiểm ngân sách/gói/region, OAuth callback, runtime/migration roles, secret management, supported versions, rollback expand/contract; hoàn thiện release candidate. Không tự tạo branch/commit/PR hoặc deploy.

## Theo dõi và chuyển giao

Mọi checkbox trong M1–M6 hiện để trống vì chưa implement. Khi bắt đầu, task có trạng thái `not_started → in_progress → verified`; lỗi gate đưa task về in_progress, không mở milestone sau. Với dependency tài khoản/thiết bị/playtester còn thiếu, ghi rõ `awaiting_external_input`, kết quả kiểm có thể làm độc lập vẫn tiếp tục trong milestone hiện hành.

Tự thực hiện tuần tự trong cùng session là **đề xuất** cho lần triển khai đầu vì engine/API/UI dùng nhiều hợp đồng chung. Chỉ dùng workflow delegated khi được cho phép; mọi hình thức đều giữ nguyên gates. Không cần quyết định phương thức thực thi trong giai đoạn chỉ định nghĩa này.

Không ước lượng ngày giao khi chưa biết nhân lực, ngân sách art, thiết bị và lịch playtest. Mỗi milestone có đầu ra nghiệm thu độc lập: M1 engine, M2 durable API, M3 trận browser, M4 product loop, M5 chất lượng có đo, M6 release candidate.

## Tự kiểm kế hoạch

- Coverage: RULES/EFFECTS → T01–T05; CONTENT/CARDS/DECKS → T01/T08/T12/T17; ARCHITECTURE/DATA → T06–T08/T13/T18; UI-MOTION → T09–T16; BALANCE → T17; AC01–AC40 có task.
- Interfaces: engine/result/journal dùng chung; HTTP revision khác event sequence; bot RNG được persist/replay; mọi input UI đi qua intent controller.
- Review Focus: cả5 tình huống đã có owner và assertions; chưa khẳng định test đã chạy.
- Phạm vi: không PvP/campaign/shop/LLM; không hạ tầng hoặc code được tạo bởi việc viết kế hoạch.
- Quy trình: không thêm bước commit/deploy tự động vì người dùng chưa yêu cầu các side effect đó.


