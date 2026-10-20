"use client";
import { neonClient } from "./neon-client";

type Cleanup = "idle" | "running" | "pending";
let state: Cleanup = "idle";
let generation = 0;
const listeners = new Set<() => void>();
function publish(next: Cleanup) {
  state = next;
  listeners.forEach((notify) => notify());
}
// Only cleanup status survives client navigation; no identity or credential is retained.
export const providerSignOutStore = {
  subscribe(notify: () => void) {
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  },
  getSnapshot: () => state,
  getServerSnapshot: (): Cleanup => "idle",
};
export function retireProviderSignOut() {
  generation++;
  publish("idle");
}
/** Called only by an explicit logout/retry action, never by a subscription. */
export async function signOutProviderSession() {
  if (state === "running") return;
  const attempt = ++generation;
  publish("running");
  try {
    const result = await neonClient.signOut();
    if (result.error) throw Error("PROVIDER_SIGNOUT_FAILED");
    if (generation === attempt) publish("idle");
  } catch {
    if (generation === attempt) publish("pending");
  }
}
