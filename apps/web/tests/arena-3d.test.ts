import { expect, it } from "vitest";
import {
  cardAnchor,
  createCamera,
  projectTile,
  cinematicPose,
  stableArenaKey,
  CARD_WIDTH,
  CARD_DEPTH,
} from "../src/features/match/rendering/three/layout";
import { response } from "./fixtures";
it("keeps every lane ordered and disjoint in both player orientations and viewport shapes", () => {
  for (const side of ["GOOD", "EVIL"] as const)
    for (const [width, height] of [
      [1440, 650],
      [844, 300],
      [375, 450],
    ]) {
      const camera = createCamera(width!, height!);
      for (const owner of ["GOOD", "EVIL"] as const) {
        const boxes = [1, 2, 3, 4, 5].map((lane) =>
          projectTile(
            cardAnchor(lane, owner, side),
            CARD_WIDTH,
            CARD_DEPTH,
            camera,
            width!,
            height!,
          ),
        );
        for (let i = 0; i < 4; i++)
          expect(boxes[i]!.x + boxes[i]!.width).toBeLessThan(boxes[i + 1]!.x);
        for (const box of boxes) {
          expect(box.x).toBeGreaterThan(0);
          expect(box.x + box.width).toBeLessThan(width!);
          expect(box.y).toBeGreaterThan(0);
          expect(box.y + box.height).toBeLessThan(height!);
        }
      }
      const near = projectTile(
        cardAnchor(3, side, side),
        CARD_WIDTH,
        CARD_DEPTH,
        camera,
        width!,
        height!,
      );
      const far = projectTile(
        cardAnchor(3, side === "GOOD" ? "EVIL" : "GOOD", side),
        CARD_WIDTH,
        CARD_DEPTH,
        camera,
        width!,
        height!,
      );
      expect(near.y).toBeGreaterThan(far.y + far.height);
    }
});
it("returns the exact resting camera at both cue endpoints and disables movement when reduced", () => {
  for (const progress of [0, 1, -10, 10])
    expect(cinematicPose(progress, false, 1)).toEqual({
      x: 0,
      y: 0,
      z: 0,
      zoom: 1,
    });
  for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
    expect(cinematicPose(progress, true, 1)).toEqual({
      x: 0,
      y: 0,
      z: 0,
      zoom: 1,
    });
    const pose = cinematicPose(progress, false, 1);
    expect(Math.abs(pose.x)).toBeLessThanOrEqual(0.45);
    expect(pose.zoom).toBeLessThanOrEqual(1.07);
  }
});
it("retains the initial arena across reveal/recovery and ignores unrevealed location identities", () => {
  const view = response().view;
  view.board.forEach((lane) => {
    lane.location = { state: "HIDDEN", revealTurn: 3 };
  });
  const first = stableArenaKey(view);
  const later = structuredClone(view);
  later.board[0]!.location = {
    state: "REVEALED",
    definitionId: "volcano",
    revealTurn: 3,
  };
  expect(stableArenaKey(later, first)).toBe(first);
  expect(stableArenaKey(structuredClone(view))).toBe(first);
});

import * as THREE from "three";
import {
  buildEnvironment,
  disposeObject,
} from "../src/features/match/rendering/three/environment";
it("builds four distinct dimensional environments with bounded draw calls, quality shadows and disposable resources", () => {
  const triangleCounts = new Set<number>();
  for (const key of [
    "moonroot-conservatory",
    "cinder-foundry",
    "glasswater-sanctum",
    "astral-causeway",
  ]) {
    const environment = buildEnvironment(key, "high");
    let meshes = 0,
      triangles = 0,
      shadowLights = 0;
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    environment.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshes++;
        triangles +=
          (object.geometry.index?.count ??
            object.geometry.getAttribute("position").count) / 3;
        geometries.add(object.geometry);
        for (const m of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(m);
      }
      if (object instanceof THREE.DirectionalLight && object.castShadow)
        shadowLights++;
    });
    triangleCounts.add(triangles);
    expect(meshes).toBeLessThan(35);
    expect(triangles).toBeGreaterThan(1000);
    expect(triangles).toBeLessThan(60000);
    expect(shadowLights).toBe(1);
    const bounds = new THREE.Box3().setFromObject(environment);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(2);
    expect(bounds.max.x - bounds.min.x).toBeGreaterThan(14);
    let released = 0;
    for (const resource of [...geometries, ...materials])
      resource.addEventListener("dispose", () => {
        released++;
      });
    disposeObject(environment);
    expect(released).toBe(geometries.size + materials.size);
    expect(environment.children).toHaveLength(0);
    const low = buildEnvironment(key, "low");
    low.traverse((o) => {
      if (o instanceof THREE.DirectionalLight) expect(o.castShadow).toBe(false);
    });
    disposeObject(low);
  }
  expect(triangleCounts.size).toBe(4);
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RaritySymbol } from "../src/features/content/RarityGem";
import { rarityGradient } from "../src/features/content/rarity-visuals";
it("renders the approved rarity palette identically in SVG and physical card gradients", () => {
  for (const [rarity, colors] of [
    ["U", ["#cbd5e1"]],
    ["R", ["#f4d06f"]],
    ["SR", ["#c5a1ff"]],
    ["SL", ["#a9f1ee", "#b7a0f7", "#f4b3c7", "#f3eaa5"]],
    ["E", ["#ff9875"]],
  ] as const) {
    const svg = renderToStaticMarkup(createElement(RaritySymbol, { rarity }));
    const gradient = rarityGradient(rarity);
    for (const color of colors) {
      expect(svg).toContain(`stop-color="${color}"`);
      expect(gradient.some((stop) => stop[1] === color)).toBe(true);
    }
  }
});

import { cameraForCue } from "../src/features/match/rendering/three/layout";
import type { VisibleEvent } from "@oathfront/contracts";
it("keeps amplified signature, attack and damage cameras inside playable bounds and resets their exact matrices", () => {
  const events = [
    { kind: "PowerUsed", payload: { definitionId: "S_G_BV" } },
    { kind: "AttackDeclared", payload: {} },
    { kind: "DamageBatchResolved", payload: {} },
  ] as VisibleEvent[];
  for (const [width, height] of [
    [1440, 650],
    [1280, 500],
    [844, 300],
    [844, 270],
    [375, 540],
    [375, 450],
    [375, 320],
    [430, 550],
  ]) {
    const base = createCamera(width!, height!);
    for (const event of events)
      for (const direction of [-1, 1])
        for (const progress of [0, 0.15, 0.4, 0.5, 0.65, 0.85, 1]) {
          const cue = {
            progress,
            alpha: 1,
            good: direction === 1 ? 1 : 0,
            evil: direction === -1 ? 1 : 0,
            reduced: false,
          };
          const camera = cameraForCue(width!, height!, event, cue);
          expect(camera.zoom).toBeLessThanOrEqual(1.176);
          for (const side of ["GOOD", "EVIL"] as const) {
            const boxes = [1, 2, 3, 4, 5].map((lane) =>
              projectTile(
                cardAnchor(lane, side, "GOOD"),
                CARD_WIDTH,
                CARD_DEPTH,
                camera,
                width!,
                height!,
              ),
            );
            for (const box of boxes) {
              expect(box.x).toBeGreaterThan(0);
              expect(box.x + box.width).toBeLessThan(width!);
              expect(box.y).toBeGreaterThan(0);
              expect(box.y + box.height).toBeLessThan(height!);
            }
            for (let i = 0; i < 4; i++)
              expect(boxes[i]!.x + boxes[i]!.width).toBeLessThan(
                boxes[i + 1]!.x,
              );
          }
          for (const reducedCamera of [
            cameraForCue(width!, height!, event, cue, true),
            cameraForCue(width!, height!, event, { ...cue, reduced: true }),
          ]) {
            expect(reducedCamera.matrixWorld.elements).toEqual(
              base.matrixWorld.elements,
            );
            expect(reducedCamera.projectionMatrix.elements).toEqual(
              base.projectionMatrix.elements,
            );
          }
          if (progress === 0 || progress === 1) {
            expect(camera.matrixWorld.elements).toEqual(
              base.matrixWorld.elements,
            );
            expect(camera.projectionMatrix.elements).toEqual(
              base.projectionMatrix.elements,
            );
          }
        }
  }
});

it("uses phone stage width for readable card hit areas without changing the desktop camera", () => {
  const desktop = createCamera(1440, 679);
  expect(desktop.position.toArray()).toEqual([0, 14, 12.6]);
  for (const [width, height] of [
    [375, 540],
    [375, 450],
    [844, 270],
  ]) {
    const camera = createCamera(width!, height!);
    for (const side of ["GOOD", "EVIL"] as const)
      for (const lane of [1, 2, 3, 4, 5]) {
        const anchor = cardAnchor(lane, side, "GOOD");
        const rest = projectTile(
          anchor,
          CARD_WIDTH,
          CARD_DEPTH,
          camera,
          width!,
          height!,
        );
        const lift = projectTile(
          anchor.clone().add(new THREE.Vector3(0, 0.4, 0)),
          CARD_WIDTH,
          CARD_DEPTH,
          camera,
          width!,
          height!,
        );
        expect(
          Math.max(rest.x + rest.width, lift.x + lift.width) -
            Math.min(rest.x, lift.x),
        ).toBeGreaterThanOrEqual(44);
        expect(
          Math.max(rest.y + rest.height, lift.y + lift.height) -
            Math.min(rest.y, lift.y),
        ).toBeGreaterThanOrEqual(44);
      }
  }
});
