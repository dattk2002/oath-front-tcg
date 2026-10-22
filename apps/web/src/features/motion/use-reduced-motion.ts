import { useSyncExternalStore } from "react";
import { useSettings } from "../settings/SettingsDialog";
const query = "(prefers-reduced-motion: reduce)";
const subscribe = (changed: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
};
export function useReducedMotion() {
  const { settings } = useSettings();
  const os = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
  return os || settings.reducedMotion;
}
