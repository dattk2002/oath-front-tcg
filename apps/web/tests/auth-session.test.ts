import { expect, it } from "vitest";
import type { CommandEnvelope } from "@oathfront/contracts";
import { createIntentController } from "../src/features/match/intent-controller";
import { createMatchViewStore } from "../src/features/match/view-store";
import { ApiError } from "../src/features/match/api-error";
import { response } from "./fixtures";
it("preserves exact pending action and selection through 401 for explicit retry after renewal", async () => {
  const store = createMatchViewStore(response(1));
  const sent: CommandEnvelope[] = [];
  store.setSelection({ instanceId: "held-card", unitInstanceId: null });
  const controller = createIntentController(store, {
    makeId: () => "20000000-0000-4000-8000-000000000001",
    send: async (envelope) => {
      sent.push(structuredClone(envelope));
      if (sent.length === 1)
        throw new ApiError(401, {
          error: {
            code: "SESSION_EXPIRED",
            messageKey: "expired",
            requestId: envelope.commandId,
            retryable: false,
            details: {},
          },
        });
      return response(2);
    },
  });
  await controller.submitIntent({ kind: "PASS_PHASE" });
  expect(store.getSnapshot().pendingCommand?.status).toBe("UNCERTAIN");
  expect(store.getSnapshot().selection?.instanceId).toBe("held-card");
  expect(sent).toHaveLength(1);
  await controller.retryPending();
  expect(sent[1]).toEqual(sent[0]);
  expect(store.getSnapshot().revision).toBe(2);
});
import {
  privateStorage,
  moveClaimDrafts,
} from "../src/features/auth/private-storage";
import {
  readRememberedSession,
  startGuestSession,
  rememberSession,
} from "../src/app/session";
import { createApiClient } from "../src/features/match/api-client";
function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
    clear: () => data.clear(),
  };
}
it("isolates pending mutations by principal and transfers exact local data only for an explicit successful claim", () => {
  const storage = memory(),
    guest = privateStorage(storage, "guest"),
    a = privateStorage(storage, "account-a"),
    b = privateStorage(storage, "account-b");
  guest.setItem(
    "oathfront.create",
    JSON.stringify({ commandId: "exact-id", expectedRevision: 7 }),
  );
  expect(a.getItem("oathfront.create")).toBeNull();
  expect(b.getItem("oathfront.create")).toBeNull();
  moveClaimDrafts(storage, "guest", "account-a");
  expect(a.getItem("oathfront.create")).toBe(
    '{"commandId":"exact-id","expectedRevision":7}',
  );
  expect(guest.length).toBe(0);
  expect(b.length).toBe(0);
});
it("never bootstraps a new guest when a remembered account expires", async () => {
  const storage = memory();
  let requests = 0;
  const api = createApiClient({
    fetcher: async () => {
      requests++;
      return Response.json(
        {
          error: {
            code: "SESSION_EXPIRED",
            messageKey: "expired",
            requestId: "20000000-0000-4000-8000-000000000001",
            retryable: false,
            details: {},
          },
        },
        { status: 401 },
      );
    },
  });
  rememberSession(storage, {
    principal: {
      id: "10000000-0000-4000-8000-000000000001",
      kind: "ACCOUNT",
      displayName: "A",
      expiresAt: null,
      tutorialCompletedAt: null,
      evilTutorialCompletedAt: null,
    },
    csrfToken: "a".repeat(43),
    sessionExpiresAt: new Date().toISOString(),
    activeMatchId: null,
  });
  expect(readRememberedSession(storage)?.principal.kind).toBe("ACCOUNT");
  await expect(startGuestSession(api, storage)).rejects.toThrow(
    "ACCOUNT_LOGIN_REQUIRED",
  );
  expect(requests).toBe(1);
});
it("rebinding CSRF leaves exact pending payload untouched and does not send a mutation automatically", async () => {
  const sent: RequestInit[] = [];
  const api = createApiClient({
    csrfToken: "old",
    fetcher: async (_url, init) => {
      sent.push(init!);
      const reply = response(2);
      reply.view.self.hand = [
        { instanceId: "c".repeat(32), definitionId: "GC01" },
      ];
      reply.view.legalActions = [{ kind: "PASS_PHASE" }];
      return Response.json(reply);
    },
  });
  const body = {
    commandId: "20000000-0000-4000-8000-000000000001",
    expectedRevision: 1,
    action: { kind: "PASS_PHASE" as const },
  };
  api.bindSession({ csrfToken: "renewed" });
  expect(sent).toHaveLength(0);
  await api.command(response().view.matchId, body);
  expect(sent[0]!.body).toBe(JSON.stringify(body));
  expect(sent[0]!.headers).toMatchObject({ "X-CSRF-Token": "renewed" });
});

import { authReturnUrl } from "../src/features/auth/return-url";
it("retains game route parameters and drops OAuth verifiers before subsequent login", () => {
  expect(
    authReturnUrl(
      "http://localhost:3000/decks/new?hero=H_G_BV&preset=D_G_BV&neon_auth_session_verifier=private&code=private&state=private#private",
    ),
  ).toBe("http://localhost:3000/decks/new?hero=H_G_BV&preset=D_G_BV");
});
