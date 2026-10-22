import { validateBrowserWire } from "@oathfront/contracts/browser";
import type {
  CommandEnvelope,
  CreateMatchRequest,
  GuestRequest,
  WireDefinitions,
  SaveDeckRequest,
  UpdateDeckRequest,
  SessionResponse,
  AuthExchangeRequest,
  ClaimGuestRequest,
} from "@oathfront/contracts";
import { ApiError } from "./api-error";
export function createApiClient(
  options: {
    csrfToken?: string;
    fetcher?: typeof fetch;
    onUnauthorized?: () => void;
  } = {},
) {
  let csrfToken = options.csrfToken;
  const fetcher = options.fetcher ?? fetch;
  async function request<K extends keyof WireDefinitions>(
    path: string,
    definition: K,
    body?: unknown,
    method?: "PUT",
  ): Promise<WireDefinitions[K]> {
    const result = await fetcher(`/api/v1${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data: unknown = result.status === 204 ? {} : await result.json();
    if (!result.ok) {
      if (validateBrowserWire("ErrorResponse", data)) {
        if (
          data.error.code === "SESSION_EXPIRED" &&
          !path.startsWith("/auth/") &&
          path !== "/session"
        )
          options.onUnauthorized?.();
        throw new ApiError(result.status, data);
      }
      throw new Error("INVALID_SERVER_RESPONSE");
    }
    if (!validateBrowserWire(definition, data))
      throw new Error("INVALID_SERVER_RESPONSE");
    return data;
  }
  return {
    bindSession: (session: Pick<SessionResponse, "csrfToken"> | null) => {
      csrfToken = session?.csrfToken;
    },
    exchange: (body: AuthExchangeRequest) =>
      request("/auth/exchange", "SessionResponse", body),
    claim: (body: ClaimGuestRequest) =>
      request("/auth/claim-guest", "SessionResponse", body),
    logout: () => request("/auth/logout", "EmptyBody", {}),
    history: (cursor?: string) =>
      request(
        `/matches?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        "MatchList",
      ),
    session: () => request("/session", "SessionResponse"),
    guest: (body: GuestRequest) => request("/guest", "SessionResponse", body),
    catalog: (version = "elements_v1") =>
      request(`/catalog/${encodeURIComponent(version)}`, "PublicCatalog"),
    collection: () => request("/collection", "CollectionView"),
    decks: (cursor?: string) =>
      request(
        `/decks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
        "DeckList",
      ),
    deck: (id: string, revision?: number) =>
      request(
        `/decks/${encodeURIComponent(id)}${revision ? `?revision=${revision}` : ""}`,
        "DeckDTO",
      ),
    saveDeck: (body: SaveDeckRequest) => request("/decks", "DeckDTO", body),
    updateDeck: (id: string, body: UpdateDeckRequest) =>
      request(`/decks/${encodeURIComponent(id)}`, "DeckDTO", body, "PUT"),
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
