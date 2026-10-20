"use client";
import { createAuthClient } from "@neondatabase/auth/next";
export const neonClient = createAuthClient();
export async function managedToken() {
  if (
    new URL(window.location.href).searchParams.has("neon_auth_session_verifier")
  ) {
    // The official wrapper exchanges and removes its verifier on getSession success.
    const restored = await neonClient.getSession();
    if (restored.error || !restored.data?.session)
      throw Error("LOGIN_REQUIRED");
  }
  // SDK 0.6.0-beta shares the getSession/token cache; bypass its session-shaped
  // cached response so this endpoint returns a fresh signed identity token.
  const { data, error } = await neonClient.token({
    fetchOptions: { headers: { "X-Force-Fetch": "true" } },
  });
  if (error || !data?.token) throw Error("LOGIN_REQUIRED");
  return data.token;
}
