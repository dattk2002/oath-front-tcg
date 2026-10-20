import { afterEach, expect, it, vi } from "vitest";
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("../src/features/auth/neon-client", () => ({
  neonClient: { signOut },
}));
import {
  providerSignOutStore,
  retireProviderSignOut,
  signOutProviderSession,
} from "../src/features/auth/provider-signout";

afterEach(() => {
  retireProviderSignOut();
  vi.clearAllMocks();
});
it("retains failed provider cleanup across subscribers but retires it on new login without an automatic signout", async () => {
  signOut.mockResolvedValue({ error: { message: "unavailable" } });
  await signOutProviderSession();
  expect(providerSignOutStore.getSnapshot()).toBe("pending");
  expect(providerSignOutStore.getServerSnapshot()).toBe("idle");
  const notify = vi.fn();
  const unsubscribe = providerSignOutStore.subscribe(notify);
  retireProviderSignOut();
  expect(providerSignOutStore.getSnapshot()).toBe("idle");
  expect(notify).toHaveBeenCalledOnce();
  expect(signOut).toHaveBeenCalledOnce();
  unsubscribe();
});
it("does not restore an obsolete cleanup failure after a new authenticated session retires it", async () => {
  let settle!: (value: { error: object }) => void;
  signOut.mockImplementation(
    () =>
      new Promise((resolve) => {
        settle = resolve;
      }),
  );
  const oldAttempt = signOutProviderSession();
  expect(providerSignOutStore.getSnapshot()).toBe("running");
  await signOutProviderSession();
  expect(signOut).toHaveBeenCalledOnce();
  retireProviderSignOut();
  settle({ error: { message: "late failure" } });
  await oldAttempt;
  expect(providerSignOutStore.getSnapshot()).toBe("idle");
  expect(signOut).toHaveBeenCalledOnce();
});
