import { afterEach, expect, it } from "vitest";
import { gsap } from "gsap";
import { createEventTimeline } from "../src/features/match/motion/event-timeline";
import type { BattleScene, Cue } from "../src/features/match/rendering/scene";
import type { VisibleEvent } from "@oathfront/contracts";

afterEach(() => gsap.globalTimeline.clear());
it("impact accents use the same linear 40 percent clock as the public damage commit", () => {
  let cue: Cue | undefined;
  let commits = 0;
  const event: VisibleEvent = {
    eventId: "damage",
    rootId: "combat",
    sequence: 2,
    visibility: "PUBLIC",
    ownerSide: null,
    kind: "DamageBatchResolved",
    payload: {
      batchId: "pair",
      hpChanges: [],
      packets: [
        {
          source: { kind: "HERO", side: "EVIL" },
          target: { kind: "HERO", side: "GOOD" },
          damageType: "COMBAT",
          rawDamage: 3,
          mitigatedDamage: 0,
          finalDamage: 3,
          blocked: false,
          shieldConsumed: false,
          displayOrder: 1,
        },
      ],
    },
  };
  const scene = {
    present: (_: VisibleEvent, next: Cue) => {
      cue = { ...next };
    },
  } as BattleScene;
  const timeline = createEventTimeline(
    scene,
    event,
    false,
    () => commits++,
    () => {},
  );
  timeline.seek(0.119, false);
  expect(commits).toBe(0);
  expect(cue!.progress).toBeLessThan(0.4);
  timeline.seek(0.121, false);
  expect(commits).toBe(1);
  expect(cue!.progress).toBeGreaterThan(0.4);
  timeline.kill();
});
