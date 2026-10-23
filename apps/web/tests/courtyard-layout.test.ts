import { expect, it } from "vitest";
import { Vector3 } from "three";
import type { VisibleEvent } from "@oathfront/contracts";
import {
  cameraForCue,
  cardAnchor,
  projectTile,
  unobscuredCardFrame,
  CARD_WIDTH,
  CARD_DEPTH,
} from "../src/features/match/rendering/three/layout";
import { createArenaPicker } from "../src/features/match/rendering/three/interaction";
import { response } from "./fixtures";

// Measured stage-local HUD/fan rectangles from the populated browser fixture.
const layouts = [
  {
    width: 1440,
    height: 844,
    blockers: [
      { x: 574, y: 8, width: 292, height: 90 },
      { x: 18, y: 688, width: 256, height: 96 },
      { x: 282, y: 553, width: 1008, height: 256 },
      { x: 1316, y: 312, width: 102, height: 102 },
    ],
  },
  {
    width: 844,
    height: 342,
    blockers: [
      { x: 12, y: 6, width: 198, height: 91 },
      { x: 12, y: 151, width: 198, height: 91 },
      { x: 214, y: 186, width: 522, height: 156 },
      { x: 760, y: 130, width: 68, height: 68 },
    ],
  },
  {
    width: 375,
    height: 724,
    blockers: [
      { x: 12, y: 14, width: 216, height: 93 },
      { x: 12, y: 339, width: 216, height: 93 },
      { x: 0, y: 444, width: 375, height: 198 },
      { x: 295, y: 368, width: 60, height: 60 },
    ],
  },
];

it("fits all ten readable lifted card targets between the measured HUD and fan", () => {
  for (const { width, height, blockers } of layouts) {
    const frame = unobscuredCardFrame(width, height, blockers);
    for (const progress of [0, 0.4, 0.5, 0.65, 1]) {
      const camera = cameraForCue(
        width,
        height,
        {
          kind: "PowerUsed",
          payload: { definitionId: "S_G_BV" },
        } as VisibleEvent,
        { progress, alpha: 1, good: 1, evil: 0, reduced: false },
        false,
        frame,
      );
      for (const side of ["GOOD", "EVIL"] as const)
        for (const lane of [1, 2, 3, 4, 5]) {
          for (const lift of [0, 0.441]) {
            const box = projectTile(
              cardAnchor(lane, side, "GOOD").add(new Vector3(0, lift, 0)),
              CARD_WIDTH,
              CARD_DEPTH,
              camera,
              width,
              height,
            );
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.y).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            expect(box.y + box.height).toBeLessThanOrEqual(height);
            for (const b of blockers)
              expect(
                box.x + box.width <= b.x ||
                  box.x >= b.x + b.width ||
                  box.y + box.height <= b.y ||
                  box.y >= b.y + b.height,
              ).toBe(true);
          }
        }
    }
  }
});

it("uses the fitted camera for exact slot picking in both player orientations", () => {
  for (const { width, height, blockers } of layouts)
    for (const self of ["GOOD", "EVIL"] as const) {
      const view = response().view;
      view.self.side = self;
      const picker = createArenaPicker();
      picker.update(view);
      const frame = unobscuredCardFrame(width, height, blockers);
      const camera = cameraForCue(width, height, null, null, false, frame);
      for (const side of ["GOOD", "EVIL"] as const)
        for (const laneId of [1, 2, 3, 4, 5] as const) {
          const point = cardAnchor(laneId, side, self).project(camera);
          const hit = { kind: "SLOT", side, laneId } as const;
          expect(
            picker.pick(
              ((point.x + 1) * width) / 2,
              ((1 - point.y) * height) / 2,
              [hit],
              camera,
              { left: 0, top: 0, width, height },
            ),
          ).toEqual([hit]);
        }
      picker.dispose();
    }
});
