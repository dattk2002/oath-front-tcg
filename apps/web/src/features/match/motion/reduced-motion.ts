/** OS reduction is the baseline; in-game settings may only add reduction. */
export function observeReducedMotion(
  onChange: () => void,
  scope: Pick<Window, "matchMedia"> = window,
) {
  const query = scope.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return {
    matches: () => query.matches,
    dispose: () => query.removeEventListener("change", onChange),
  };
}
