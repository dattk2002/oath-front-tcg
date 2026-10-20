import type { GuestRequest, SessionResponse } from "@oathfront/contracts";
import { validateBrowserWire } from "@oathfront/contracts/browser";
import type { ApiClient } from "../features/match/api-client";
import { ApiError } from "../features/match/api-error";
const guestKey = "oathfront.guest-bootstrap";
export async function startGuestSession(
  api: ApiClient,
  storage: Storage,
): Promise<SessionResponse> {
  try {
    return await api.session();
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.body.error.code !== "SESSION_EXPIRED"
    )
      throw error;
  }
  let body: GuestRequest | undefined;
  try {
    const saved: unknown = JSON.parse(storage.getItem(guestKey) ?? "null");
    if (validateBrowserWire("GuestRequest", saved)) body = saved;
  } catch {
    /* Invalid local recovery data is discarded. */
  }
  if (!body) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let binary = "";
    bytes.forEach((value) => {
      binary += String.fromCharCode(value);
    });
    body = {
      commandId: crypto.randomUUID(),
      recoverySecret: btoa(binary)
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, ""),
    };
    storage.setItem(guestKey, JSON.stringify(body));
  }
  const session = await api.guest(body);
  storage.removeItem(guestKey);
  return session;
}
