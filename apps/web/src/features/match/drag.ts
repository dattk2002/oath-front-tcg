import { validateBrowserWire } from "@oathfront/contracts/browser";
export const dragThreshold = 6;
export function crossedDragThreshold(
  start: { x: number; y: number },
  x: number,
  y: number,
) {
  return Math.hypot(x - start.x, y - start.y) >= dragThreshold;
}
export function dropTarget(x: number, y: number) {
  const element = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>('[data-target][data-legal-target="true"]');
  if (!element?.dataset.target) return null;
  try {
    const target: unknown = JSON.parse(element.dataset.target);
    return validateBrowserWire("Target", target) ? target : null;
  } catch {
    return null;
  }
}
