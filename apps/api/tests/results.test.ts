import { expect, it } from "vitest";
import { advanceAutomatic } from "@oathfront/game-engine";
import { ready, unit } from "../../../packages/game-engine/tests/helpers.js";
import { resultStatistics } from "../src/matches/results.js";
it("attributes hero damage from unit source IDs and excludes location/poison/fatigue while keeping private observations", () => {
  const initial = ready();
  initial.phase = "COMBAT";
  initial.activeSide = null;
  initial.continuation = { laneId: 2, stage: "PAIR", pendingResponders: [] };
  const u = unit(initial, "B01", "GOOD", 2);
  u.current.attack = 2;
  const r = advanceAutomatic(initial, { maxRoots: 1 });
  expect(r.nextState.players.EVIL.hp).toBe(18);
  const result = resultStatistics(initial, r.nextState, r.events);
  expect(result.damageDealt).toBe(2);
  expect(result.summary.blocks.GOOD).toBe(0);
  const damage = r.events.find((e) => e.kind === "DamageBatchResolved");
  if (!damage || damage.kind !== "DamageBatchResolved")
    throw Error("damage missing");
  const other = structuredClone(damage);
  for (const packet of other.payload.packets) packet.damageType = "LOCATION";
  expect(resultStatistics(initial, r.nextState, [other]).damageDealt).toBe(0);
});
