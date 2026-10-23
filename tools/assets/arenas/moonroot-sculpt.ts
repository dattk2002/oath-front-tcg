/** Anatomical section widths, measured from crown through temple, cheekbone, mandible and chin. */
const sections: [number, number][] = [
  [-1.34, 0.29],
  [-1.18, 0.43],
  [-0.94, 0.63],
  [-0.6, 0.77],
  [-0.12, 0.86],
  [0.26, 0.87],
  [0.62, 0.83],
  [0.98, 0.77],
  [1.29, 0.61],
  [1.48, 0.29],
  [1.57, 0.1],
];

const gaussian = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
): number => Math.exp(-0.5 * (((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

export function headWidth(y: number): number {
  for (let i = 1; i < sections.length; i += 1) {
    const [y1, width1] = sections[i]!,
      [y0, width0] = sections[i - 1]!;
    if (y <= y1) {
      const t = Math.max(0, (y - y0) / (y1 - y0));
      const previous = sections[Math.max(0, i - 2)]!,
        next = sections[Math.min(sections.length - 1, i + 1)]!;
      const m0 = (width1 - previous[1]) / (y1 - previous[0]);
      const m1 = (next[1] - width0) / (next[0] - y0);
      return (
        (2 * t * t * t - 3 * t * t + 1) * width0 +
        (t * t * t - 2 * t * t + t) * (y1 - y0) * m0 +
        (-2 * t * t * t + 3 * t * t) * width1 +
        (t * t * t - t * t) * (y1 - y0) * m1
      );
    }
  }
  return sections.at(-1)![1];
}

/** A continuous sculpt: eyelids, nose, lips and facial planes are part of the surface, not attached primitives. */
export function faceHeight(x: number, y: number): number {
  const edge = Math.max(0, 1 - (x / headWidth(y)) ** 2);
  const faceMask = Math.min(1, edge * 5);
  const dome =
    0.035 + (0.37 + 0.035 * Math.sin(y * 2.1)) * Math.pow(edge, 0.82);
  let relief = 0.055 * gaussian(x, y, 0, 0.98, 0.52, 0.32);
  for (const side of [-1, 1]) {
    const eyeX = side * 0.365,
      ex = (x - eyeX) / 0.205;
    const eyeMask = Math.exp(-(Math.abs(ex) ** 8));
    const almond = Math.max(0, 1 - ex * ex);
    const lid = 0.405 + side * (x - eyeX) * 0.12 - 0.036 * almond;
    // Closed lids curve around recessed orbits. No eyeball or iris protrudes through the stone.
    relief -= 0.061 * gaussian(x, y, eyeX, 0.44, 0.25, 0.14);
    relief += 0.041 * gaussian(x, y, eyeX, 0.43, 0.18, 0.067);
    relief -= 0.027 * Math.exp(-(((y - lid) / 0.016) ** 2)) * eyeMask;
    relief += 0.012 * Math.exp(-(((y - lid + 0.036) / 0.041) ** 2)) * eyeMask;
    relief -= 0.011 * Math.exp(-(((y - lid - 0.12) / 0.034) ** 2)) * eyeMask;
    relief +=
      0.042 *
      gaussian(
        x,
        y,
        side * 0.35,
        0.635 + almond * 0.065 + side * (x - eyeX) * 0.09,
        0.26,
        0.07,
      );
    relief += 0.012 * gaussian(x, y, side * 0.35, 0.19, 0.25, 0.09);
    // Malar planes turn distinctly into the hollow beneath, then the wider mandible.
    relief += 0.095 * gaussian(x, y, side * 0.53, 0.035, 0.24, 0.22);
    relief -= 0.049 * gaussian(x, y, side * 0.58, -0.4, 0.17, 0.26);
    relief += 0.04 * gaussian(x, y, side * 0.48, -0.77, 0.18, 0.19);
    relief += 0.079 * gaussian(x, y, side * 0.155, -0.22, 0.085, 0.105);
    relief -= 0.014 * gaussian(x, y, side * 0.143, -0.292, 0.032, 0.024);
    relief -= 0.023 * gaussian(x, y, side * 0.22, -0.49, 0.051, 0.16);
    relief += 0.077 * gaussian(x, y, side * 0.104, -0.626, 0.122, 0.055);
    relief += 0.025 * gaussian(x, y, side * 0.055, -0.49, 0.028, 0.105);
  }
  // Defined nasal root and bridge taper into a rounded tip, without a large hollow dark underside.
  const bridgeWidth = 0.08 + 0.03 * Math.max(0, Math.min(1, (0.55 - y) / 0.8));
  relief += 0.252 * gaussian(x, y, 0, 0.215, bridgeWidth, 0.4);
  relief += 0.152 * gaussian(x, y, 0, -0.19, 0.125, 0.18);
  relief += 0.043 * gaussian(x, y, 0, -0.312, 0.059, 0.09);
  relief -= 0.018 * gaussian(x, y, 0, -0.47, 0.026, 0.095);
  const mouthLine = -0.687 + 0.009 * (x / 0.32) ** 2 - 0.008 * Math.cos(x * 12);
  relief -=
    0.038 *
    Math.exp(-(((y - mouthLine) / 0.02) ** 2)) *
    Math.exp(-((x / 0.315) ** 6));
  relief += 0.085 * gaussian(x, y, 0, -0.759, 0.25, 0.07);
  relief -= 0.024 * gaussian(x, y, 0, -0.894, 0.28, 0.07);
  relief += 0.077 * gaussian(x, y, 0, -1.045, 0.35, 0.17);
  // Hand-carved asymmetry is low-frequency surface form, independent of the albedo.
  relief += 0.006 * Math.sin(x * 7.1 + y * 2.8) * Math.sin(y * 4.3);
  return dome + relief * faceMask;
}
