import type {
  PlayerView,
  UnitView,
  Effect,
  Ability,
  Hook,
  EntityRef,
  CardDefinition,
  TokenDefinition,
} from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import type { PublicPreview, PreviewUnknown } from "./preview.js";
import { executePrimitive } from "./primitive.js";
import type { EffectContext } from "./targets.js";
import { findUnit, orderedUnits, opposite, slot } from "./targets.js";
import {
  damage,
  applyStatModifier,
  newUnit,
  chargeBlock,
} from "./rule-math.js";
type Job = {
  source: UnitView;
  ability: Ability;
  generation: number;
  damaged: boolean;
};
/** View-only primitive/cascade adapter; all unknown identities remain outside its world. */
export function createPublicResolution(
  view: PlayerView,
  world: Pick<PublicPreview, "board" | "players">,
  result: PublicPreview,
  unknowns: Set<PreviewUnknown>,
) {
  const side = view.self.side,
    enemy = opposite(side),
    unknownDraws = result.unknownDraws;
  const fresh = new Set<string>(),
    counters = new Map<string, number>();
  const queue: Job[] = [];
  let primitiveCount = 0,
    tokenOrdinal = 0,
    generation = 0,
    terminal = false;
  const ruleAt = (laneId: number) => {
    const l = world.board[laneId - 1]!.location;
    return l.state === "REVEALED"
      ? coreCatalog.locations.find((d) => d.id === l.definitionId)?.rule
      : undefined;
  };
  const contextFor = (u: UnitView, corpse = false): EffectContext => ({
    owner: u.owner,
    definitionId: u.definitionId,
    instanceId: u.instanceId,
    laneId: u.laneId,
    target: { kind: "NONE" },
    ...(corpse ? { corpse: u } : {}),
  });
  function hooks(
    hook: Hook,
    sources: readonly UnitView[],
    damaged = false,
  ): void {
    for (const source of [...sources].sort(
      (a, b) =>
        a.laneId - b.laneId ||
        (a.owner === "EVIL" ? 0 : 1) - (b.owner === "EVIL" ? 0 : 1),
    )) {
      const abilities =
        coreCatalog.cards.find((c) => c.id === source.definitionId)
          ?.abilities ?? [];
      for (const ability of [...abilities]
        .filter((a) => a.hook === hook)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))
        queue.push({
          source: structuredClone(source),
          ability,
          generation: generation + 1,
          damaged,
        });
    }
  }
  function drain(): void {
    while (queue.length) {
      const j = queue.shift()!;
      const live = findUnit(world, j.source.instanceId),
        lane = live?.laneId ?? j.source.laneId;
      if (j.ability.hook !== "ON_DESTROYED" && !live) continue;
      const key =
        j.source.instanceId +
        ":" +
        (j.ability.limit?.counterKey ?? j.ability.id);
      if (j.ability.limit && !fresh.has(j.source.instanceId)) {
        unknowns.add("TRIGGER_HISTORY");
        continue;
      }
      if (j.ability.limit && (counters.get(key) ?? 0) >= j.ability.limit.count)
        continue;
      if (
        !j.ability.conditions.every((c) =>
          c === "SELF_ALIVE"
            ? !!live
            : c === "SELF_DAMAGED"
              ? !!live && j.damaged
              : c === "ENEMY_PRESENT_HERE"
                ? !!world.board[lane - 1]![slot(opposite(j.source.owner))]
                : c === "EMPTY_LANE_HERE"
                  ? !world.board[lane - 1]![slot(j.source.owner)]
                  : c === "FIRST_TIME_THIS_TURN"
                    ? (counters.get(key) ?? 0) === 0
                    : false,
        )
      )
        continue;
      if (j.generation > 32)
        throw new RangeError("Preview trigger generation limit");
      counters.set(key, (counters.get(key) ?? 0) + 1);
      const previous = generation;
      generation = j.generation;
      effects(
        contextFor(live ?? j.source, j.ability.hook === "ON_DESTROYED"),
        j.ability.effects,
      );
      generation = previous;
    }
  }
  function settle(damaged: UnitView[] = []): void {
    const dead = orderedUnits(world)
      .filter((u) => u.current.hp <= 0)
      .map((u) => structuredClone(u));
    for (const u of dead) {
      world.board[u.laneId - 1]![slot(u.owner)] = null;
      if (!u.isToken) {
        const p = world.players[u.owner],
          entry = p.discard.find((d) => d.definitionId === u.definitionId);
        if (entry) entry.quantity++;
        else
          p.discard.push({
            definitionId:
              u.definitionId as import("@oathfront/contracts").CardId,
            quantity: 1,
          });
      }
    }
    hooks(
      "ON_DAMAGED",
      damaged.filter((u) => !!findUnit(world, u.instanceId)),
      true,
    );
    hooks("ON_DESTROYED", dead);
    drain();
  }
  function batch(
    refs: EntityRef[],
    amount: number,
    combat = false,
  ): UnitView[] {
    const surviving: UnitView[] = [];
    const initial = new Set(
      refs
        .filter((r) =>
          r.kind === "HERO"
            ? world.players[r.side].hp > 0
            : !!findUnit(world, r.instanceId),
        )
        .map((r) => (r.kind === "HERO" ? r.side : r.instanceId)),
    );
    for (const ref of refs) {
      const key = ref.kind === "HERO" ? ref.side : ref.instanceId;
      if (!initial.has(key)) continue;
      const u =
        ref.kind === "UNIT"
          ? orderedUnits(world).find((u) => u.instanceId === ref.instanceId)
          : undefined;
      const h = ref.kind === "HERO" ? world.players[ref.side] : undefined;
      let hit = damage({
        raw: amount,
        armor: u?.statuses.armor ?? 0,
        shield: u?.statuses.shield ?? false,
      });
      if (combat && h && amount > 0 && h.block.used < 3) {
        if (chargeBlock(h.block)) {
          h.reserveCount++;
          unknowns.add("POWER_GRANT");
          unknowns.add("OPPONENT_RESPONSE");
          hit = {
            finalDamage: 0,
            mitigatedDamage: amount,
            shieldConsumed: false,
          };
        }
      }
      if (u) {
        if (hit.shieldConsumed) u.statuses.shield = false;
        u.current.hp -= hit.finalDamage;
        if (hit.finalDamage > 0) surviving.push(u);
      } else if (h) {
        h.hp -= hit.finalDamage;
        if (ref.kind === "HERO") {
          if (ref.side === side) result.ownHeroDamage += hit.finalDamage;
          else result.enemyHeroDamage += hit.finalDamage;
        }
      }
    }
    return surviving;
  }
  function create(
    def: CardDefinition | TokenDefinition,
    owner: "GOOD" | "EVIL",
    lane: number,
    id: string,
  ): UnitView {
    const u = newUnit(def, owner, lane, id);
    world.board[lane - 1]![slot(owner)] = u;
    fresh.add(id);
    return u;
  }
  function effects(context: EffectContext, list: readonly Effect[]): void {
    for (const effect of list) {
      if (++primitiveCount > 256)
        throw new RangeError("Preview primitive limit");
      let damaged: UnitView[] = [];
      executePrimitive(world, context, effect, {
        damage(refs, amount) {
          damaged = batch(refs, amount);
        },
        stats() {},
        status() {},
        heroHeal(owner, before, after) {
          if (owner === side) result.effectiveOwnHeroHeal += after - before;
        },
        modify(u, attack, health, trait, duration) {
          applyStatModifier(u, {
            sourceDefinitionId: context.definitionId,
            sourceInstanceId: context.instanceId,
            sourceLaneAtCreation: context.instanceId
              ? (findUnit(world, context.instanceId)?.laneId ?? context.laneId)
              : context.laneId,
            createdEventSeq: 0,
            attackDelta: attack,
            healthDelta: health,
            trait,
            duration,
            expiryTurn: duration === "TURN_END" ? view.turn : null,
          });
        },
        move(u, lane) {
          world.board[u.laneId - 1]![slot(u.owner)] = null;
          u.laneId = lane;
          world.board[lane - 1]![slot(u.owner)] = u;
        },
        summon(tokenId, lane) {
          const def = coreCatalog.tokens.find((t) => t.id === tokenId);
          if (def && (!def.tutorialOnly || view.mode === "TUTORIAL"))
            create(
              def,
              context.owner,
              lane,
              `preview:summon:${++tokenOrdinal}`,
            );
        },
        draw(count) {
          const h = world.players[context.owner];
          for (let i = 0; i < count; i++) {
            if (h.deckCount > 0) {
              h.deckCount--;
              unknowns.add("DRAW");
              if (h.handCount < 10) {
                h.handCount++;
                unknownDraws[context.owner]++;
              }
            } else {
              h.fatigueCounter++;
              batch([{ kind: "HERO", side: context.owner }], h.fatigueCounter);
            }
          }
        },
      });
      settle(damaged);
    }
  }
  function checkpoint(): void {
    terminal = world.players.GOOD.hp <= 0 || world.players.EVIL.hp <= 0;
    result.immediateWin =
      world.players[enemy].hp <= 0 && world.players[side].hp > 0;
    result.immediateLoss =
      world.players[side].hp <= 0 && world.players[enemy].hp > 0;
  }
  return {
    effects,
    create,
    hooks,
    drain,
    checkpoint,
    settle,
    batch,
    ruleAt,
    contextFor,
    isTerminal: () => terminal,
  };
}
