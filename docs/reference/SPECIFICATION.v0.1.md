# Five-Lane Card Battler — Product & Technical Specification

**Status:** Draft v0.1 (implementation-ready MVP baseline)  
**Date:** 2026-10-20  
**Working title:** Five-Lane Card Battler (replace with original IP/brand name)  
**Primary platform:** Desktop web, responsive for tablets/mobile later  
**Audience:** Human developers and coding agents (including Codex CLI)

> **Product vision:** Build an original 1v1 browser collectible card battler whose core battle flow and lane combat are inspired by *Plants vs. Zombies Heroes*, with a key modification: there are **no Environment Cards**. Instead, **only lanes 1, 3 and 5** have server-selected, randomized Locations. Those Locations are revealed and activated on **turns 1, 3 and 5 respectively**. Lanes 2 and 4 are always normal. Win by reducing the opposing hero to 0 HP.
>
> **IP boundary:** These are gameplay inspirations, not a license to copy PvZ Heroes, Marvel Snap, Yu-Gi-Oh!, or any assets, characters, names, card text, visual designs, sound effects, proprietary code or trademarked branding. Create an original setting, card taxonomy, art and names.

---

## 1. Decision register

### 1.1 Confirmed decisions (do not change without approval)

| ID | Decision |
|---|---|
| C-01 | Browser-based, online-capable card game; competitive 1v1 is the intended direction. |
| C-02 | Gameplay is primarily **PvZ Heroes-like**: creature deployment in lanes, spell/trick interactions, phased turns, direct hero damage through unblocked lanes, deck construction. |
| C-03 | Exactly **five fixed lanes**, numbered left-to-right 1 through 5. |
| C-04 | **Only lanes 1, 3 and 5 have a special Location**. Lanes 2 and 4 are always normal with no Location effect. |
| C-05 | At match setup, server **randomly selects three Locations**, assigns one each to lanes 1, 3 and 5, and keeps identities hidden until revealed. |
| C-06 | Location on **lane 1 reveals at the start of turn 1**; **lane 3 at turn 3**; **lane 5 at turn 5**. Both players see each reveal simultaneously. |
| C-07 | Unrevealed Location lanes remain playable; their effects **do not operate until reveal**. |
| C-08 | Once revealed, a Location persists and its effects apply for the remainder of the match. |
| C-09 | **No Environment Cards** exist in decks or gameplay. Players cannot play, remove, replace, or overwrite Locations. |
| C-10 | Victory condition: reduce opposing **Hero HP to 0**; do not use Marvel Snap's lane-control victory condition. |
| C-11 | Locations should affect both players symmetrically by default. |
| C-12 | Preserve tactical lane combat and the possibility of differentiated turn phases inspired by PvZ Heroes. |

### 1.2 Proposed MVP defaults (adjustable; not user-approved requirements)

| ID | Default | Rationale |
|---|---|---|
| P-01 | Hero starts at **20 HP**. | Simple baseline for balance. |
| P-02 | **30-card deck**, maximum **2 copies** of any non-unique card, 1 of unique cards. | Manageable initial pool; balance through playtesting. |
| P-03 | **4-card initial hand**, draw **1 card/turn**, one optional initial mulligan. | Keeps starts consistent. |
| P-04 | Energy cap **10**; max energy grows by 1 each turn; refill at start of turn. | Progressive curve. |
| P-05 | One allied creature slot and one enemy creature slot per lane; no stacking initially. | Mirrors the clean tactical readability of 5-lane battle. |
| P-06 | Default mode alternates which player owns first deployment/trick advantage per match or assigns roles evenly. | Mitigate first-player/phase advantage. |
| P-07 | Target match duration **5–10 minutes**; add a turn cap (e.g. 20) with explicit tiebreak policy before ranked play. | Reduce stalling. |
| P-08 | MVP content: **2 original Heroes, ~40 cards** (e.g. 24 creatures, 12 tricks, 4 hero abilities) and **6–8 Locations**. | Small enough to test; expand toward 20–30 Locations after balancing. |
| P-09 | Start with **PvE vs deterministic bot** before fully launching PvP. | Validate rules and cards without networking complexity. |
| P-10 | MVP Locations are picked **without replacement** and subject to safeguards (see §4.5). | Avoid duplicates and oppressive combinations. |
| P-11 | For initial release, do **not** implement environment reactions, elemental combinations, lane-control scoring, Location-altering abilities or paid random packs. | Keeps focus on confirmed mechanic. |

### 1.3 Open design questions (tracked, not silently assumed)

- **O-01 – Phase asymmetry:** Adopt PvZ Heroes-inspired A-summon → B-play → A-tricks → combat, or a symmetric phase system? §5 defines a *provisional* sequence so a playable prototype can be built.
- **O-02 – Block meter and superpowers:** PvZ Heroes has additional systems. Not confirmed; omit from MVP unless separately designed.
- **O-03 – Lane-specific terrain traits:** Original game's water/amphibious lane does **not** translate directly to randomized Locations. Do not hard-code lane 5 as water or introduce amphibious restrictions by default.
- **O-04 – Reactive timing/priority:** Define exact windows, ordering and cancellation rules before designing more complex spells.
- **O-05 – Balance rules for potential ties, deck exhaustion, disconnected players, max turns and simultaneous lethal.** MVP behavior proposed below.
- **O-06 – Art direction and theme:** Previous ideation included elemental fantasy, mechs, dark fantasy, whimsical kingdoms and time fantasy. **No theme was finalized.** Keep game data and UI themeable.

---

## 2. Product pillars and non-goals

### Pillars
1. **Easy to learn, difficult to master:** teach deployment, energy, lane defense and tricks quickly, but encourage deep deck construction.
2. **Short browser sessions:** fast to start, no installation, responsive interactions, readable 5-lane battlefield.
3. **Locations change each match:** strategic uncertainty comes from **three revealed Locations**, not Environment Cards.
4. **Players control outcomes:** make Locations tactically meaningful without letting random effects overwhelm skill.
5. **Extensible rules:** new cards and Locations should mostly be data-driven, deterministic and testable.

### Non-goals for initial MVP
- Clone PvZ characters, factions, animation, exact cards, assets, UI or terminology.
- Yu-Gi-Oh!-scale summoning chains and unrestricted multi-card combo engines.
- Marvel Snap-style majority-location scoring or simultaneous hidden card reveal.
- Player-generated/replaced Locations or Environment Cards.
- Trading marketplace, blockchain, monetized loot boxes, spectator mode, guilds, tournaments, cosmetics store.
- Mobile native app.

---

## 3. Match model and win condition

### 3.1 Actors
- Two players, each owning a hero, deck, hand, discard pile, energy pool and five creature slots.
- Match state is **server-authoritative** for online play (and uses the same rules engine offline/PvE).
- Both players see public hero HP, energy capacities/remaining as appropriate, board, revealed Locations and public actions; **opponent hand/deck order and unrevealed Location identities must never leak** in public network payloads.

### 3.2 Five lanes
- Index lane IDs as **1–5 in presentation and public contracts**. Internally arrays can be 0-based but normalize at API boundaries.
- Lane 1: randomized special Location, reveal at turn 1.
- Lane 2: **Normal**, never special.
- Lane 3: randomized special Location, reveal at turn 3.
- Lane 4: **Normal**, never special.
- Lane 5: randomized special Location, reveal at turn 5.
- Each lane has at most one unit per player in MVP.
- A unit attacks the opposing unit in the same lane. If none, its attack damages the opposing hero unless a rule modifies targeting.

### 3.3 Victory
- Player wins immediately when opposing hero HP is **≤ 0**, after the current atomic effect/combat resolution completes.
- If both heroes fall to ≤ 0 from a single atomic resolution, treat as **draw** for MVP.
- Proposed deck-exhaustion behavior: if required draw occurs on an empty deck, apply 1 escalating fatigue damage (first miss 1, next 2, etc.) to that hero; configurable.
- Surrender and PvP disconnection timeout result in loss; reconnect grace period is configurable.
- No lane-majority win condition.

---

## 4. Location system — core differentiator

### 4.1 Match initialization
1. Validate decks/heroes, select seed and create authoritative match.
2. Choose **three distinct Locations** from eligible pool (with category constraints described below).
3. Assign them to lanes **1, 3, 5** in that order. Their assignment is fixed for the match.
4. The game server stores all assigned identities. Clients receive **only** revealed information. A hidden lane is represented as `hidden`, not with an identifiable card ID.
5. Lanes 2 and 4 have `normal` terrain, with no effect.

### 4.2 Reveal sequence (hard requirement)

| Start of turn | Lane 1 | Lane 2 | Lane 3 | Lane 4 | Lane 5 |
|---|---|---|---|---|---|
| 1 | **REVEAL + ACTIVATE** | Normal | Hidden, inactive | Normal | Hidden, inactive |
| 2 | Active | Normal | Hidden, inactive | Normal | Hidden, inactive |
| 3 | Active | Normal | **REVEAL + ACTIVATE** | Normal | Hidden, inactive |
| 4 | Active | Normal | Active | Normal | Hidden, inactive |
| 5 | Active | Normal | Active | Normal | **REVEAL + ACTIVATE** |
| 6+ | Active | Normal | Active | Normal | Active |

Reveal fires **once at start of global turn**, before energy/draw and before actions. Each global turn includes both players' phased actions and combat; do **not** count each player's phase as a separate turn. If a Location has a `onReveal` effect, it resolves after revealing but before drawing/deploying. An unrevealed Location does not retroactively trigger `onSummon` for units that were deployed earlier, although a separate `onReveal` rule could affect units already present.

### 4.3 Effect contract
- Location effects can trigger on `onReveal`, `onUnitPlayed`, `beforeAttack`, `afterCombat`, `endTurn`, etc., with **explicit, deterministic ordering**.
- Both teams are subject to the same general rule, unless the Location text explicitly names owner/opponent.
- Current Location remains immutable for entire match.
- Any persistent modifiers carry origin/source metadata for replay, undo-free event-sourcing and debugging.
- Location tooltips display **exact effect wording and trigger time**, not vague labels.
- **No** card or ability may change Location IDs, ownership, reveal schedules or environment state in the MVP.

### 4.4 Example Location pool (illustrative balance data, not finalized)

| ID | Display name | Category | Trigger | Proposed effect |
|---|---|---|---|---|
| `ancient_forest` | Ancient Forest | Buff | `onUnitPlayed` | A unit played here gains +1 max HP and +1 current HP. |
| `volcano` | Volcano | Hazard | `afterCombat` | Deal 1 damage to **every surviving unit** in this lane, both sides. |
| `storm_peak` | Storm Peak | Buff | `beforeAttack` | Units with **printed/base** attack ≤ 3 get +1 attack for this attack only. |
| `frozen_lake` | Frozen Lake | Control | `onUnitPlayed` | A unit deployed here gains `exhausted` until the next global turn; it cannot attack this turn. |
| `desert` | Desert | Cost | `beforePlayValidation` | Playing a unit to this lane costs 1 extra energy; cost cannot fall below 0. |
| `healing_spring` | Healing Spring | Buff | `endTurn` | Heal each surviving unit here for 1, up to its max HP. |
| `ruined_arena` | Ruined Arena | Neutralish | `beforeAttack` | Units attacking here have +1 attack while defending unit is present; no bonus on direct hero hit. |
| `quiet_meadow` | Quiet Meadow | Neutral | None | No effect; present as a visibly revealed special Location. |

**Future-only ideas**, not required for MVP: Void Rift (ban resurrection), Time Rift (attack only on even turns), multi-target Lightning, Oasis, etc. These are examples, not commitments. Avoid Locations that hard-lock whole lanes for multiple turns, destroy decks or auto-win.

### 4.5 Random selection fairness
- Pool must contain sufficiently diverse eligible Locations.
- Select **without replacement** for each match; same Location must not occupy multiple special lanes in one match.
- Avoid more than **two negative/hazard/control** Locations in one match; require at least one **neutral or buff** among the three.
- Optional future pool weights allowed, but document/version them and never modify assignment after match starts.
- Use seeded deterministic pseudo-randomness and persist seed + selected pool version. Include controlled match setup for tests.
- Players should not be able to predict hidden Locations from payloads, stable IDs or client-side seeded RNG.

### 4.6 Reveal UX
- Before reveal, show `?` for lanes 3/5; all lanes still allow unit placement.
- At turn 1 show lane 1 immediately; at turn 3 reveal lane 3; at turn 5 reveal lane 5.
- Give both players the same public reveal animation, label, icon and tooltip.
- Reveal animations are visual only: gameplay state transitions are atomic and server-controlled.
- On reconnect, visible public state shows already revealed Locations and generic hidden placeholders.

---

## 5. Turn phases and combat

> **Status:** Provisional MVP rules inspired by PvZ Heroes. Exact asymmetric faction identity is not confirmed. Implement as configuration/engine rules so it can be revised without redesigning networking/UI.

### 5.1 Global turn sequence
1. `TURN_START`: increment turn number, reveal scheduled Location (turn 1/3/5), resolve any `onReveal` effects, refresh energy, draw cards and process start-of-turn effects in documented order.
2. `FIRST_PLAYER_DEPLOY`: assigned first-role player can deploy units to open allied slots and optionally play cards specifically marked playable in this phase.
3. `SECOND_PLAYER_PLAY`: other player deploys units and plays eligible tricks.
4. `FIRST_PLAYER_TRICKS`: first-role player plays eligible tricks to respond.
5. `COMBAT`: each lane from **1 to 5**, apply before-attack effects, resolve unit attacks or direct hero attacks, on-damage/on-death hooks, cleanup, and after-combat lane triggers.
6. `TURN_END`: resolve end-of-turn effects, expire temporary buffs and exhaustion according to duration; check win/draw; advance to next global turn.

### 5.2 Phase semantics (MVP)
- Only active phase owner may submit `PLAY_CARD`; other client is observing except for future optional reactions.
- Players may make multiple legal actions during their phase until they pass; `PASS_PHASE` is explicit.
- Hero powers can be omitted initially or treated as special once-per-turn cards with a documented phase and energy cost.
- Energy is **per player**. Starting cap: 1 at turn 1, increment to cap 10, refill each global turn; **unused energy does not carry over**.
- New units may attack on the turn played unless `exhausted`, `stunned` or another effect explicitly prevents it. This deliberately differs from some other card games; confirm during playtesting.
- Combat moves strictly left-to-right for deterministic triggers. Each lane attack resolves as an atomic step; check hero lethal after each lane resolution (when both participants may deal simultaneous unit damage, resolve that pair atomically).
- Unit-on-unit combat: simultaneous attack damage (unless an ability says otherwise); zero or lower current HP causes death and removal.
- Hero hit: attacking unit's attack is dealt directly if enemy lane slot is empty.

### 5.3 Combat ordering (per lane)
1. Gather living units and state.
2. Resolve `beforeAttack` buffs/modifiers in stable priority order.
3. Determine eligible attackers (`stunned`/`exhausted` cannot attack).
4. Compute attacks and damage targets; apply simultaneous unit-to-unit hits when both can attack; if just one unit exists, damage opposite hero.
5. Apply `onDamage`, `onDeath`, cleanup and `afterCombat` Location effects (e.g. Volcano), then cleanup again.
6. Commit events and determine match outcome.

### 5.4 Effect resolution and stacking
- Use engine-defined priority: active `onReveal` → entry events → combat modifiers → damage → death cleanup → post-combat Location → end-turn.
- Stable ordering inside the same priority: lane asc, acting player role, unit creation sequence ID, then effect ID; log effect order.
- Effects never directly mutate game state in UI. All changes are `Action -> validate -> resolve -> events -> reduce`.
- Prevent infinite loops with maximum effect depth/steps, idempotent event IDs and clear failure behavior.

---

## 6. Card system

### 6.1 Allowed types (MVP)
- **Creature / Unit:** energy cost, attack, max HP, optional abilities/tags, deployment lane.
- **Trick / Spell:** an immediate validated effect; may target a unit, hero or lane depending on effect. It does **not** create/replace Locations.
- **Hero ability:** optional card-like power bound to hero; phase restrictions, charges/costs defined per ability.
- **Not allowed:** Environment Card type.

### 6.2 Starter card mechanics
- `onPlay`, `onAttack`, `onDamaged`, `onDestroyed` and `endTurn` event hooks.
- Statuses: `stunned`, `exhausted`, `shielded`, `poisoned` only if fully implemented and documented.
- Keywords inspired by established genre concepts may include piercing, armored, splash, multi-strike, retaliation; **define original terms and precise timing** before use. Do not carry over trademarked character/card designs.
- Position matters: area damage targeting neighbors must handle edge lanes 1/5 correctly.
- Avoid too many layered triggers in starter content.

### 6.3 Deck and collection
- Deck belongs to one selected original hero/archetype (if factions are adopted), contains exactly 30 playable cards; no Location cards.
- Validate card counts, allowed heroes/factions, ownership (PvP production), banned cards, and published card-set version.
- Store deck versions for replays. Editing a deck must not mutate historical matches.
- Initial prototype may make all starter cards available, with no economy.

### 6.4 Suggested card JSON shape

```json
{
  "id": "ember_scout",
  "setId": "core_v1",
  "name": "Ember Scout",
  "type": "CREATURE",
  "cost": 2,
  "attack": 2,
  "health": 2,
  "tags": ["FIRE", "SCOUT"],
  "abilities": [
    { "trigger": "ON_PLAY", "effect": "GAIN_ATTACK_THIS_TURN", "value": 1 }
  ],
  "artAssetKey": "cards/ember_scout.webp",
  "text": "When played, gain +1 Attack this turn."
}
```

### 6.5 Balance principles
- Ensure card performance is not overly determined by random Location distribution.
- Measure card win rate, play rate, play-on-curve rate, average damage, Location synergy and faction matchup.
- Buff/nerf only through versioned card sets; matches pin a rule/card/Location pool version.
- Do not add monetization that materially grants competitive advantage to the first MVP.

---

## 7. Example end-to-end match

1. Server creates match and secretly assigns `volcano` to lane 1, `ancient_forest` to lane 3, `storm_peak` to lane 5.
2. **Turn 1 begins:** Reveal Volcano at lane 1. Lanes 3/5 remain hidden; lanes 2/4 always normal. Players gain/refill energy, draw per rules, play cards and resolve combat.
3. **Turn 2:** No new Location revealed. Both hidden lanes remain playable with no Location effect.
4. **Turn 3:** Reveal Ancient Forest in lane 3. Units played there **from now onward** get +1 HP; existing units do not retroactively receive entry bonuses.
5. **Turn 4:** No reveal.
6. **Turn 5:** Reveal Storm Peak in lane 5. Its attack modifier starts applying during that turn's combat.
7. **Turns 6+:** All three Locations stay active until match ends. All damage and victory checks are based on hero HP, not controlled lane count.

---

## 8. User experience and required screens

### 8.1 Screens
1. Welcome/home with Play vs Bot / Online PvP (when enabled).
2. Account/profile (simple guest mode allowed for local prototype).
3. Hero/deck selection and deck builder with 30-card validity checks.
4. **Battle screen:** clear five columns, opponent units at top, hero info/HP and energy, your units at bottom, turn/phase indicator, card hand, card previews, Location icons and tooltips, `Pass` button, battle log.
5. Results: win/loss/draw, turn count, damage dealt and optional replay.
6. Minimal match history and reconnect screen for PvP.

### 8.2 UX requirements
- Hidden Location must clearly show a `?` and reveal schedule; normal lanes must be visually distinct from hidden special lanes.
- Lane location labels and effect tooltips are visible and accessible; separate tooltip content from decorative art.
- Animations never block input longer than rules require; server event order is the source of truth.
- Support click-to-select + click-to-target alongside drag-and-drop for usability.
- Keyboard access, contrast, low-motion preference and responsive fallback should be considered from the beginning.
- Never show card/Location private information through inspectable public DOM, API responses or websocket messages prior to public reveal.

---

## 9. Proposed architecture and technology

> Recommended implementation stack, not a hard product requirement. Favor a simple monorepo and a pure deterministic rules engine.

### 9.1 Suggested stack
- **Frontend:** TypeScript + React + Vite (or Next.js when SSR/site features are truly needed); use PixiJS selectively for card/battle visual effects, not for core rules.
- **Game server:** TypeScript + Node.js with WebSocket transport; Colyseus is an option, not mandatory. Server authoritative validation.
- **Rules engine:** shared, framework-agnostic, pure TypeScript domain package. Runs in bot simulations and authoritative server; client may use sanitized read-only projections for previews.
- **Persistence:** PostgreSQL for users/decks/matches/card-set references. Start with local/in-memory adapters for PvE prototype.
- **Ephemeral/session state:** Redis only when needed for matchmaking, distributed locks, presence or reconnections; do not add it prematurely.
- **Testing:** Vitest for engine, Playwright for UI integration and end-to-end flows.
- **Code quality:** TypeScript strict mode, ESLint, formatting, CI unit tests.

### 9.2 Suggested repository layout

```text
five-lane-card-battler/
├── SPECIFICATION.md
├── apps/
│   ├── web/                  # React game UI, assets, input and state projection
│   └── game-server/          # authoritative sessions, auth and websocket
├── packages/
│   ├── game-engine/          # pure domain logic, state transitions, effect resolution
│   ├── game-content/         # versioned card, hero and Location manifests
│   ├── contracts/            # network DTOs, action schemas, public/private views
│   └── bot/                  # scripted PvE opponents using legal actions
├── tests/
│   ├── fixtures/
│   └── e2e/
└── docs/
    ├── RULES.md
    ├── EFFECTS.md
    └── BALANCE.md
```

### 9.3 Engine API (conceptual)

```ts
type PlayerId = 'P1' | 'P2';
type LaneId = 1 | 2 | 3 | 4 | 5;
type Phase =
  | 'TURN_START'
  | 'FIRST_PLAYER_DEPLOY'
  | 'SECOND_PLAYER_PLAY'
  | 'FIRST_PLAYER_TRICKS'
  | 'COMBAT'
  | 'TURN_END'
  | 'GAME_OVER';

type PlayerAction =
  | { type: 'PLAY_CREATURE'; playerId: PlayerId; cardInstanceId: string; laneId: LaneId }
  | { type: 'PLAY_TRICK'; playerId: PlayerId; cardInstanceId: string; target: TargetRef }
  | { type: 'USE_HERO_ABILITY'; playerId: PlayerId; target?: TargetRef }
  | { type: 'PASS_PHASE'; playerId: PlayerId }
  | { type: 'SURRENDER'; playerId: PlayerId };

interface LocationAssignment {
  laneId: 1 | 3 | 5;
  locationId: string; // authoritative internal state ONLY
  revealTurn: 1 | 3 | 5;
  revealed: boolean;
}

interface PublicLocationView {
  laneId: LaneId;
  state: 'NORMAL' | 'HIDDEN' | 'REVEALED';
  locationId?: string; // ONLY when state = REVEALED
  revealTurn?: 1 | 3 | 5;
}

// Illustrative, not full implementation signature:
// initializeMatch(config, serverSeed) -> MatchState
// getLegalActions(state, playerId) -> LegalAction[]
// applyAction(state, action) -> { nextState, events }
// advancePhase(state) -> { nextState, events }
// projectPublicState(state, viewerId) -> ViewState
```

### 9.4 Security / correctness boundaries
- All random Location choices and deck shuffles happen on server using securely generated seeds; reproducible within trusted logs/tests.
- Client sends **intent only**; server validates active player, phase, energy, card ownership, lane vacancy and effect targets.
- No client-provided attack, HP, draw result or reveal identity.
- Keep private server state out of client payloads and debugging endpoints.
- Rate limit requests; sanitize names/chat (if chat is added), restrict auth and websocket session tokens, protect against duplicate action replay.
- Use `matchVersion`/`actionSequence` to reject stale, duplicate and out-of-order commands.
- Persist useful match event logs for deterministic replay; redact hidden information from observer-facing logs.

---

## 10. Data model (proposed)

### Persistent entities
- `User(id, displayName, createdAt, ...)`
- `HeroDefinition(id, version, name, startingHp, abilities, ...)`
- `CardDefinition(id, setVersion, type, cost, stats, effects, ...)`
- `LocationDefinition(id, poolVersion, category, triggers, effectConfig, ...)`
- `Collection(userId, cardId, quantity)` (optional during prototype)
- `Deck(id, ownerUserId, heroId, deckVersion, cardEntries, updatedAt)`
- `Match(id, createdAt, status, rulesVersion, poolVersion, seedRef, players, winner, turnCount)`
- `MatchEvent(id, matchId, sequence, type, payload, visibility, timestamp)`
- `PlayerRating` / `QueueTicket` only after initial PvP quality is proven.

### Ephemeral match state
- turn, phase, phase owner, initiative role, hero HP/abilities, energy, deck order, player hands, discard, lane units, Location assignments and reveal status, trigger queue, action sequence and PRNG state.
- `publicView` is derived; never store client-facing hidden information as the truth.

---

## 11. Bot, PvP and reconnect

### Phase 1: bot
- Deterministic scripted opponent that picks only validated legal actions.
- Basic heuristic: play affordable creature in strategically valued lane, prefer favorable trades, select appropriate trick target, pass when no useful action.
- Bot must have the same information constraints as human players: no access to unrevealed Location identities during decision-making.
- Add seeded bot-vs-bot simulation to estimate balance and detect soft locks.

### Phase 2: online PvP
- Create/join match, matchmaking queue or invite codes, authoritative websocket session, turn timers, reconnection to sanitized projected state.
- On disconnect, timer continues; reconnect before timeout or forfeit under documented policy.
- No spectators for MVP.
- Keep match replay private-state handling explicit: spectators and opposing player cannot see hidden data before they would normally become public.

---

## 12. Automated acceptance criteria

### Confirmed requirements
1. Exactly five playable lanes render on each side and are present in match state.
2. On match setup, special Locations exist **only** on 1, 3 and 5; 2 and 4 always read as normal.
3. Before turn 1, no Location identity is exposed to clients.
4. At the **start of turn 1**, lane 1 Location is revealed and active; lanes 3 and 5 remain hidden/inactive.
5. Turn 2 reveals none; lane 3 Location reveals/activates **only at start of turn 3**.
6. Turn 4 reveals none; lane 5 Location reveals/activates **only at start of turn 5**.
7. Every Location reveal is observed by both players at the same game event/sequence.
8. Players may play creatures on hidden Location lanes before reveal; hidden effects do not trigger early.
9. `onUnitPlayed` buffs do not apply retroactively merely because a previously hidden Location is revealed.
10. A revealed Location persists and cannot be overwritten; no card JSON of type `ENVIRONMENT` passes validation.
11. Victory is based only on hero HP (or documented surrender/fatigue/timeout), never lane majority.
12. Five lanes resolve combat deterministically left-to-right under the configured combat rules.
13. Opponent private hand/deck order and hidden Location IDs never occur in public/websocket state projections.

### Engine tests
- Seeded setup yields repeatable hidden assignments; no same-match duplicate Locations.
- Category constraint never selects all negative Locations.
- Correct cost validation, lane occupancy checks, damage/death rules and turn phase permissions.
- Test Volcano `afterCombat`, Ancient Forest `onUnitPlayed`, Storm Peak `beforeAttack`, Frozen Lake `exhausted`, including interactions with preexisting units.
- Test simultaneous lethal, empty deck, phase pass, reconnect after reveal and duplicate/stale action rejection.
- Property tests: HP/energy never go out of allowed bounds unexpectedly, illegal player actions cannot change state, hidden private state remains hidden.
- Replay from seed + initial decks + ordered actions must produce identical final state and events.

### UI tests
- Location tooltips show effects only after reveal (or public effects known by other legitimate means).
- Normal lane 2/4 UI is distinct from hidden lane 3/5 UI.
- Reveal animation does not delay authoritative turn-state progression.
- Battle screen supports click-to-select and clear legal-target highlighting.

---

## 13. Iterative delivery roadmap (indicative, not a commitment)

| Stage | Intended outcome | Key deliverables |
|---|---|---|
| **1 — Rules vertical slice** | Play a complete local match in engine | Five lanes, hidden Locations + turn 1/3/5 reveal, phases, energy, 8–12 test cards, basic combat, unit tests |
| **2 — Browser PvE** | Play vs bot | Web battle board, card hand, drag/click, simple art placeholders, 6–8 Locations, bot, logs |
| **3 — Deck builder/content** | Meaningful decisions | 2 original heroes, ~40 cards, 30-card decks, card effect registry, content validator |
| **4 — Online PvP** | Two people play remotely | Server-authoritative rooms, action validation, websocket views, reconnect, timers |
| **5 — Closed beta** | Gather balance evidence | Metrics, 1v1 matchmaking, location fairness testing, accessibility, bug fixes, replay |

Earlier ideation sketched approximately **8 weeks** for a small, experienced team; this is **not an estimate for an individual developer** and depends heavily on art, networking quality and scope. Prioritize a functioning game over speculative expansions.

---

## 14. Metrics and balance instrumentation

Collect at least: match duration; turns; winner; first/second-role win rates; hero HP remaining; card usage by turn; average energy unused; lane placement distribution; each Location's appearance/win rates; reveal-turn impact; concede/disconnect rate; deck archetype matchup.

Particular questions to validate:
- Does turn-5 reveal occur early enough to matter in typical games?
- Are hidden lane 3/5 deployments interesting gambles or frustrating coin flips?
- Are 2 normal lanes sufficient counterplay to punishing Location combinations?
- Does asymmetric action order confer excessive advantage?
- Do Locations affect deck diversity rather than making one archetype universally dominant?

Adjust pool and individual effects from playtest data, not assumptions.

---

## 15. Explicitly deferred ideas from earlier brainstorming

These were explored but **are not part of the selected scope**:
- **Elemental Clash** theme with Fire/Water/Nature/Shadow/Light factions and environmental reaction combinations; concept only.
- **MechForge**, **Arcane Dominion**, **Tiny Kingdoms**, **Chrono Rift** as alternative IP themes; none selected.
- Permanent Base Location + player Environment layer, reaction combinations like Volcano + Rain = Steam Field: **rejected** when the design was clarified.
- All five lanes having randomized Locations: **rejected**; special Locations only on 1, 3, 5.
- Revealing one Location every turn or 1→3→5 visible Locations by turn count: **superseded**. Here exactly one Location reveals at **global turns 1, 3 and 5**, corresponding to lanes 1, 3 and 5.
- Marvel Snap lane-control scoring: **rejected**, hero HP is sole standard combat victory.
- PvZ Heroes-specific water lane/amphibious restrictions: **not included** unless later redesigned as original mechanics.
- 20–30 Locations at launch: longer-term content aspiration; MVP should start with 6–8 well-tested examples.

---

## 16. Guidance for Codex CLI implementation

### Core instruction
Build an **original** browser card game from this specification, starting with an engine-first vertical slice. Follow all confirmed decisions in §1.1 precisely. Treat §1.2 as configurable prototype defaults, not immutable product truths. Track §1.3 as open decisions. **Do not implement any Environment Cards or environmental replacement mechanic.**

### Preferred work order
1. Set up TypeScript monorepo, lint, formatter and test runner.
2. Define domain types, validated action schemas, event schemas, seeded RNG, hidden/public state projection.
3. Implement match initialization and **turn 1/3/5 reveal of lanes 1/3/5**; add tests first.
4. Implement phase machine, energy, creature placement, tricks, deterministic combat, hero HP win.
5. Add data-driven sample Locations/cards and deterministic PvE bot.
6. Build browser battlefield view, card hand, tooltip, reveal animation and playable end-to-end local match.
7. Add server-authoritative PvP and persistence only once rules tests are green.
8. Add documentation, seed fixtures, replay tests and balance metrics.

### Definition of done for initial milestone
- `pnpm install && pnpm test` (or documented equivalent) passes.
- `pnpm dev` starts a playable browser PvE prototype with five lanes and all reveal timing correct.
- Tests explicitly assert special lanes and reveal schedule, Location fairness, private-state non-leakage and hero HP victory.
- README explains architecture, commands, gameplay controls and next roadmap steps.
- No reused copyrighted game visuals/names/assets.

### Example coding-agent kickoff prompt

```text
Read SPECIFICATION.md completely. Implement Stage 1 (Rules vertical slice) and the
smallest playable browser PvE UI from Stage 2. Respect every confirmed rule in §1.1,
especially: 5 lanes; special Locations only at lanes 1/3/5; reveal+activate them on
global turns 1/3/5; lanes 2/4 normal; no Environment Cards; hero-HP victory.

Use TypeScript and a pure deterministic game-engine package with seedable match
initialization, legal-action validation, event log, public/private state projection
and unit tests. Use modest original placeholder UI and content. For unspecified
systems, choose the simplest configurable MVP default from §1.2, document it,
and do not invent complex features. Implement and run tests; report commands,
what works, and any explicitly deferred decisions.
```

---

## 17. Specification change control

- **v0.1 — 2026-10-20:** Consolidated conversation and corrected earlier misinterpretations. The defining system is **five lanes, randomized special Locations only in lanes 1/3/5, revealed at turns 1/3/5, no Environment Cards, PvZ Heroes-style lane combat and hero HP victory**.
- Changes to confirmed decisions require explicit product review. Update decision IDs, tests, examples, data contracts and UI together to avoid specification drift.
