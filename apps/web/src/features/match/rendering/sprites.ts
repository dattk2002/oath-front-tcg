import { Sprite, type Texture } from "pixi.js";
import { unitArtBounds } from "./assets";
export function createUnitSprite(texture: Texture): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(unitArtBounds.anchor.x, unitArtBounds.anchor.y);
  sprite.eventMode = "none";
  return sprite;
}
