import { validateBrowserWire } from "@oathfront/contracts/browser";
import type {
  CommandEnvelope,
  CreateMatchRequest,
  GuestRequest,
  WireDefinitions,
} from "@oathfront/contracts";
import { ApiError } from "./api-error";
export function createApiClient(
  options: { csrfToken?: string; fetcher?: typeof fetch } = {},
) {
  const fetcher = options.fetcher ?? fetch;
  async function request<K extends keyof WireDefinitions>(
    path: string,
    definition: K,
    body?: unknown,
  ): Promise<WireDefinitions[K]> {
    const result = await fetcher(`/api/v1${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.csrfToken ? { "X-CSRF-Token": options.csrfToken } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data: unknown = await result.json();
    if (!result.ok) {
      if (validateBrowserWire("ErrorResponse", data))
        throw new ApiError(result.status, data);
      throw new Error("INVALID_SERVER_RESPONSE");
    }
    if (!validateBrowserWire(definition, data))
      throw new Error("INVALID_SERVER_RESPONSE");
    return data;
  }
  return {
    session: () => request("/session", "SessionResponse"),
    guest: (body: GuestRequest) => request("/guest", "SessionResponse", body),
    catalog: () => request("/catalog/core_v1", "PublicCatalog"),
    decks: () => request("/decks", "DeckList"),
    createMatch: (body: CreateMatchRequest) =>
      request("/matches", "CommandResponse", body),
    match: (id: string) =>
      request(`/matches/${encodeURIComponent(id)}`, "CommandResponse"),
    summary: (id: string) =>
      request(`/matches/${encodeURIComponent(id)}/summary`, "MatchSummary"),
    command: (id: string, envelope: CommandEnvelope) =>
      request(
        `/matches/${encodeURIComponent(id)}/commands`,
        "CommandResponse",
        envelope,
      ),
    events: (id: string, afterSeq: number, throughSeq: number) =>
      request(
        `/matches/${encodeURIComponent(id)}/events?afterSeq=${afterSeq}&throughSeq=${throughSeq}`,
        "EventPage",
      ),
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
