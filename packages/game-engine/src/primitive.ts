import type {
  Effect,
  UnitView,
  ModifierView,
  TokenId,
  Target,
  EntityRef,
  Duration,
  Statuses,
} from "@oathfront/contracts";
import { resolveTargets, findUnit, sourceLane } from "./targets.js";
import type { RuleWorld, EffectContext } from "./targets.js";
import { safeInteger } from "./rule-math.js";
/** Ports retain private IDs/events/draws outside the browser-safe primitive interpreter. */
export interface PrimitivePorts<U extends UnitView> {
  damage(targets: EntityRef[], amount: number): void;
  stats(unit: U, before: U["current"]): void;
  status(unit: U, before: Statuses): void;
  heroHeal(side: "GOOD" | "EVIL", before: number, after: number): void;
  modify(
    unit: U,
    attack: number,
    health: number,
    trait: ModifierView["trait"],
    duration: Duration,
  ): void;
  move(unit: U, targetLane: number): void;
  summon(tokenId: TokenId, lane: number): void;
  draw(count: number): void;
}
export function executePrimitive<U extends UnitView>(
  state: RuleWorld<U>,
  context: EffectContext,
  effect: Effect,
  ports: PrimitivePorts<U>,
): void {
  const refs =
    "targets" in effect ? resolveTargets(state, context, effect.targets) : [];
  const units = () =>
    refs.flatMap((r) => {
      const u = r.kind === "UNIT" ? findUnit(state, r.instanceId) : undefined;
      return u ? [u] : [];
    });
  switch (effect.kind) {
    case "DAMAGE":
      ports.damage(refs, effect.amount);
      break;
    case "HEAL":
      safeInteger(effect.amount);
      if (effect.amount < 0) throw new RangeError("Invalid heal");
      for (const ref of refs)
        if (ref.kind === "HERO") {
          const h = state.players[ref.side];
          if (h.hp <= 0) continue;
          const before = h.hp;
          h.hp = Math.min(h.maxHp, safeInteger(h.hp + effect.amount));
          ports.heroHeal(ref.side, before, h.hp);
        } else {
          const u = findUnit(state, ref.instanceId);
          if (u) {
            const before = { ...u.current };
            u.current.hp = Math.min(
              u.current.maxHp,
              safeInteger(u.current.hp + effect.amount),
            );
            ports.stats(u, before);
          }
        }
      break;
    case "MODIFY_STATS":
      safeInteger(effect.attackDelta);
      safeInteger(effect.healthDelta);
      if (effect.healthDelta < 0) throw new RangeError("Negative health buff");
      for (const u of units())
        ports.modify(
          u,
          effect.attackDelta,
          effect.healthDelta,
          null,
          effect.duration,
        );
      break;
    case "GRANT_SHIELD":
    case "GRANT_ARMOR":
    case "APPLY_POISON":
    case "APPLY_STUN":
    case "GRANT_PIERCE": {
      const trait =
        effect.kind === "GRANT_SHIELD"
          ? "SHIELD"
          : effect.kind === "GRANT_ARMOR"
            ? "ARMOR"
            : effect.kind === "APPLY_POISON"
              ? "POISONED"
              : effect.kind === "APPLY_STUN"
                ? "STUNNED"
                : "PIERCE";
      const key =
        trait === "SHIELD"
          ? "shield"
          : trait === "ARMOR"
            ? "armor"
            : trait === "POISONED"
              ? "poisoned"
              : trait === "STUNNED"
                ? "stunned"
                : "pierce";
      for (const u of units()) {
        const before = { ...u.statuses };
        const upgrade =
          effect.kind === "GRANT_PIERCE" &&
          effect.duration === "PERMANENT" &&
          !u.modifiers.some(
            (m) => m.trait === "PIERCE" && m.duration === "PERMANENT",
          );
        if (!u.statuses[key] || upgrade)
          ports.modify(
            u,
            0,
            0,
            trait,
            "duration" in effect ? effect.duration : "PERMANENT",
          );
        if (upgrade && before.pierce) ports.stats(u, { ...u.current });
        if (key === "armor") u.statuses.armor = 1;
        else u.statuses[key] = true;
        ports.status(u, before);
      }
      break;
    }
    case "MOVE_UNIT": {
      const target: Target = context.target;
      const u =
        "instanceId" in target ? findUnit(state, target.instanceId) : undefined;
      if (
        u &&
        "laneId" in target &&
        target.laneId !== u.laneId &&
        !state.board[target.laneId - 1]![u.owner === "GOOD" ? "good" : "evil"]
      )
        ports.move(u, target.laneId);
      break;
    }
    case "SUMMON_TOKEN": {
      const lane =
        effect.laneSelector === "SELF"
          ? sourceLane(state, context)
          : "laneId" in context.target
            ? context.target.laneId
            : null;
      if (
        lane &&
        !state.board[lane - 1]![context.owner === "GOOD" ? "good" : "evil"]
      )
        ports.summon(effect.tokenId, lane);
      break;
    }
    case "DRAW":
      ports.draw(effect.count);
      break;
    default: {
      const neverEffect: never = effect;
      throw new TypeError(`Unknown primitive ${String(neverEffect)}`);
    }
  }
}
