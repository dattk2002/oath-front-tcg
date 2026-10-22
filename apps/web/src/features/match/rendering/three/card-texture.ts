import { CanvasTexture, SRGBColorSpace } from "three";
import type { PublicCatalog, UnitView } from "@oathfront/contracts";
import { contentName } from "../../../../content/english-content";
import { resolveArt } from "../asset-manifest";
type Definition =
  PublicCatalog["cards"][number] | PublicCatalog["tokens"][number];
import { rarities, rarityGradient } from "../../../content/rarity-visuals";
/** CardVisual's silver frame and shared rarity silhouettes, painted with current public stats. */
export function createCardTexture(
  def: Definition | undefined,
  initial: UnitView,
  onChange: () => void,
  quality: "low" | "high",
) {
  const canvas = document.createElement("canvas");
  canvas.width = quality === "high" ? 384 : 256;
  canvas.height = quality === "high" ? 544 : 363;
  const ctx = canvas.getContext("2d")!;
  const displayFont =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--campaign-display")
      .trim() || '"Barlow Condensed", Barlow, sans-serif';
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 2;
  let unit = initial,
    disposed = false;
  const image = new Image();
  let loaded = false;
  const paint = () => {
    if (disposed) return;
    const w = canvas.width,
      h = canvas.height;
    ctx.setTransform(w / 384, 0, 0, h / 544, 0, 0);
    ctx.clearRect(0, 0, 384, 544);
    const frame = ctx.createLinearGradient(0, 0, 384, 544);
    [
      [0, "#d8d6cb"],
      [0.08, "#697282"],
      [0.26, "#292e3b"],
      [0.56, "#b9bac0"],
      [0.76, "#3b4050"],
      [1, "#8d929e"],
    ].forEach(([p, c]) => frame.addColorStop(p as number, c as string));
    ctx.fillStyle = frame;
    ctx.beginPath();
    ctx.roundRect(0, 0, 384, 544, 18);
    ctx.fill();
    ctx.strokeStyle = "#d5d0be";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#171e29";
    ctx.fillRect(12, 12, 360, 515);
    ctx.strokeStyle = "#e5dfcb88";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 364, 522);
    if (loaded) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(17, 17, 350, 390, 9);
      ctx.clip();
      const scale = Math.max(
          350 / image.naturalWidth,
          390 / image.naturalHeight,
        ),
        iw = image.naturalWidth * scale,
        ih = image.naturalHeight * scale;
      ctx.drawImage(image, 17 + (350 - iw) / 2, 17 + (390 - ih) * 0.36, iw, ih);
      ctx.restore();
    } else {
      const bg = ctx.createRadialGradient(192, 180, 5, 192, 180, 220);
      bg.addColorStop(0, unit.owner === "GOOD" ? "#547b76" : "#70495f");
      bg.addColorStop(1, "#171e29");
      ctx.fillStyle = bg;
      ctx.fillRect(17, 17, 350, 390);
    }
    const shade = ctx.createLinearGradient(0, 310, 0, 430);
    shade.addColorStop(0, "#11141d00");
    shade.addColorStop(1, "#11141d");
    ctx.fillStyle = shade;
    ctx.fillRect(17, 310, 350, 120);
    ctx.fillStyle = "#202632";
    ctx.fillRect(17, 406, 350, 69);
    ctx.strokeStyle = "#a6a69b";
    ctx.strokeRect(17, 406, 350, 69);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f0eee3";
    const name = contentName(def?.id ?? unit.definitionId);
    let size = 29;
    ctx.font = `700 ${size}px ${displayFont}`;
    while (ctx.measureText(name).width > 327 && size > 17)
      ctx.font = `700 ${--size}px ${displayFont}`;
    ctx.fillText(name, 192, 437);
    if (def && "cost" in def && !unit.isToken) {
      const cost = ctx.createRadialGradient(41, 35, 2, 47, 46, 39);
      cost.addColorStop(0, "#68cbe5");
      cost.addColorStop(0.5, "#277b9f");
      cost.addColorStop(1, "#12324a");
      ctx.fillStyle = cost;
      ctx.beginPath();
      ctx.roundRect(4, 4, 77, 77, [15, 6, 30, 6]);
      ctx.fill();
      ctx.strokeStyle = "#c8e8f1";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "white";
      ctx.font = `bold 48px ${displayFont}`;
      ctx.fillText(String(def.cost), 43, 43);
    }
    const stat = (x: number, value: number, label: string, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x - 47, 480, 94, 54, 9);
      ctx.fill();
      ctx.strokeStyle = "#d6d0b9";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff9e9";
      ctx.font = `bold 33px ${displayFont}`;
      ctx.fillText(String(value), x, 504);
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(label, x, 526);
    };
    stat(64, unit.current.attack, "ATK", "#554126");
    stat(320, unit.current.hp, "HP", "#65353e");
    if (def && "rarity" in def && !unit.isToken) {
      const gem = rarities[def.rarity];
      if (gem) {
        ctx.save();
        ctx.translate(162, 478);
        ctx.beginPath();
        gem.points.split(" ").forEach((p, i) => {
          const [x, y] = p.split(",").map(Number);
          if (i === 0) ctx.moveTo(x!, y!);
          else ctx.lineTo(x!, y!);
        });
        ctx.closePath();
        const shine = ctx.createLinearGradient(0, 0, 64, 64);
        for (const [offset, color] of rarityGradient(def.rarity))
          shine.addColorStop(offset, color);
        ctx.fillStyle = shine;
        ctx.fill();
        ctx.strokeStyle = "#f5efdc";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.clip();
        ctx.strokeStyle = "#ffffffaa";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(32, 29);
        ctx.lineTo(64, 0);
        ctx.moveTo(0, 64);
        ctx.lineTo(32, 29);
        ctx.lineTo(64, 64);
        ctx.stroke();
        ctx.restore();
      }
    }
    texture.needsUpdate = true;
    onChange();
  };
  image.onload = () => {
    loaded = true;
    paint();
  };
  image.onerror = () => {
    loaded = false;
    paint();
  };
  paint();
  void document.fonts?.ready.then(paint);
  if (def) image.src = resolveArt(def.artKey, contentName(def.id), "thumb").src;
  return {
    texture,
    update(next: UnitView) {
      unit = next;
      paint();
    },
    dispose() {
      disposed = true;
      image.onload = null;
      image.onerror = null;
      image.src = "";
      texture.dispose();
    },
  };
}
