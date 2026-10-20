import { it, expect } from "vitest";
import { createApiClient } from "../src/features/match/api-client.js";
import { ApiError } from "../src/features/match/api-error.js";
it("strict client rejects private/unknown server data and keeps API requests same-origin", async () => {
  let url: RequestInfo | URL = "";
  let init: RequestInit | undefined;
  const api = createApiClient({
    csrfToken: "csrf-public",
    fetcher: async (input, options) => {
      url = input;
      init = options;
      return Response.json({ seed: "private" });
    },
  });
  await expect(
    api.command("10000000-0000-4000-8000-000000000001", {
      commandId: "20000000-0000-4000-8000-000000000001",
      expectedRevision: 2,
      action: { kind: "PASS_PHASE" },
    }),
  ).rejects.toThrow("INVALID_SERVER_RESPONSE");
  expect(url).toBe(
    "/api/v1/matches/10000000-0000-4000-8000-000000000001/commands",
  );
  expect(init?.credentials).toBe("same-origin");
  expect(init?.cache).toBe("no-store");
  expect(init?.headers).toEqual({
    "Content-Type": "application/json",
    "X-CSRF-Token": "csrf-public",
  });
});
it("canonical server errors preserve typed stale and uncertain distinctions", async () => {
  const api = createApiClient({
    fetcher: async () =>
      Response.json(
        {
          error: {
            code: "SESSION_EXPIRED",
            messageKey: "auth",
            requestId: "20000000-0000-4000-8000-000000000001",
            retryable: false,
            details: {},
          },
        },
        { status: 401 },
      ),
  });
  await expect(api.session()).rejects.toBeInstanceOf(ApiError);
});
