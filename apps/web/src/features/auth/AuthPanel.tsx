import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  MatchSummary,
  PublicCatalog,
  SessionResponse,
} from "@oathfront/contracts";
import type { ApiClient } from "../match/api-client";
import { ApiError } from "../match/api-error";
import { authReturnUrl } from "./return-url";
import { managedToken, neonClient } from "./neon-client";
import MergeConflictDialog from "./MergeConflictDialog";
import { rememberSession, readRememberedSession } from "../../app/session";
import {
  providerSignOutStore,
  retireProviderSignOut,
  signOutProviderSession,
} from "./provider-signout";
const pendingKey = "oathfront.auth-intent";
type Intent = {
  commandId: string;
  keepMatchId: string | null;
  sourceId: string | null;
  csrf: string | null;
  kind: "claim" | "exchange";
};
function readIntent(): Intent | null {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null");
    if (
      v &&
      typeof v === "object" &&
      "commandId" in v &&
      typeof v.commandId === "string" &&
      "kind" in v &&
      (v.kind === "claim" || v.kind === "exchange") &&
      "keepMatchId" in v &&
      (v.keepMatchId === null || typeof v.keepMatchId === "string") &&
      "sourceId" in v &&
      (v.sourceId === null || typeof v.sourceId === "string") &&
      "csrf" in v &&
      (v.csrf === null || typeof v.csrf === "string")
    )
      return {
        commandId: v.commandId,
        kind: v.kind,
        keepMatchId: v.keepMatchId,
        sourceId: v.sourceId,
        csrf: v.csrf,
      };
  } catch {
    /* In-memory login is still available. */
  }
  return null;
}
export default function AuthPanel({
  api,
  session,
  catalog,
  expired,
  ready,
  onSession,
  onLogout,
}: {
  api: ApiClient;
  session: SessionResponse | null;
  catalog: PublicCatalog | null;
  expired: boolean;
  ready: boolean;
  onSession: (next: SessionResponse, sourceId?: string) => void;
  onLogout: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [storageUnavailable, setStorageUnavailable] = useState(false),
    [conflict, setConflict] = useState<{
      guestMatch: MatchSummary;
      accountMatch: MatchSummary;
    } | null>(null);
  const intent = useRef<Intent | null>(null),
    started = useRef(false),
    renewed = useRef<string | null>(null),
    lock = useRef(false);
  const providerCleanup = useSyncExternalStore(
    providerSignOutStore.subscribe,
    providerSignOutStore.getSnapshot,
    providerSignOutStore.getServerSnapshot,
  );
  const authBusy = busy || providerCleanup === "running";
  function persistIntent(pending: Intent) {
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(pending));
      return true;
    } catch {
      setStorageUnavailable(true);
      return false;
    }
  }
  function prepare(): Intent {
    intent.current ??= readIntent();
    if (!intent.current) {
      const current = session ?? readRememberedSession(sessionStorage);
      intent.current = {
        commandId: crypto.randomUUID(),
        keepMatchId: null,
        sourceId: current?.principal.id ?? null,
        csrf: current?.csrfToken ?? null,
        kind: current?.principal.kind === "GUEST" ? "claim" : "exchange",
      };
    }
    return intent.current;
  }
  async function complete(choice?: string) {
    if (lock.current || providerCleanup === "running") return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    let adopted: SessionResponse | null = null;
    try {
      let pending = prepare();
      if (choice) {
        pending = {
          ...pending,
          commandId: crypto.randomUUID(),
          keepMatchId: choice,
        };
        intent.current = pending;
      }
      persistIntent(pending);
      const identityToken = await managedToken();
      api.bindSession(
        pending.kind === "claim" && session?.principal.kind === "ACCOUNT"
          ? session
          : pending.csrf
            ? { csrfToken: pending.csrf }
            : null,
      );
      const next = await (pending.kind === "claim"
        ? api.claim({
            commandId: pending.commandId,
            identityToken,
            keepMatchId: pending.keepMatchId,
          })
        : api.exchange({ commandId: pending.commandId, identityToken }));
      adopted = next;
      onSession(
        next,
        pending.kind === "claim" ? (pending.sourceId ?? undefined) : undefined,
      );
      retireProviderSignOut();
      intent.current = null;
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* The committed cookie transition must survive local storage failure. */
        setStorageUnavailable(true);
      }
      setConflict(null);
      setMessage("Account restored. You can retry your pending request.");
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "MERGE_MATCH_CONFLICT"
      )
        setConflict(error.body.error.details);
      else if (
        error instanceof ApiError &&
        error.body.error.code === "IDEMPOTENCY_CONFLICT"
      ) {
        setConflict(null);
        setMessage(
          "The merge request ID was already used. No data was transferred; your guest session is preserved.",
        );
      } else
        setMessage(
          "Sign-in is incomplete. Your request and choices are preserved. Sign in with Google or restore your session.",
        );
    } finally {
      api.bindSession(adopted ?? session);
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const pending = readIntent();
    if (pending) {
      intent.current = pending;
      void complete();
    }
  }, [ready]);
  const renewEvent = useEffectEvent(() => {
    void complete();
  });
  const loginEvent = useEffectEvent(() => {
    void login();
  });
  useEffect(() => {
    window.addEventListener("oathfront:renew", renewEvent);
    window.addEventListener("oathfront:login", loginEvent);
    return () => {
      window.removeEventListener("oathfront:renew", renewEvent);
      window.removeEventListener("oathfront:login", loginEvent);
    };
  }, []);
  useEffect(() => {
    if (
      ready &&
      expired &&
      session?.principal.kind === "ACCOUNT" &&
      renewed.current !== session.csrfToken
    ) {
      renewed.current = session.csrfToken;
      void complete();
    }
  }, [ready, expired, session?.csrfToken]);
  async function login() {
    if (lock.current || providerCleanup === "running") return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (!persistIntent(prepare())) {
        setMessage(
          "Google sign-in cannot open because device storage could not save the request. Leaving this page would lose the data held in memory; select Restore session here.",
        );
        return;
      }
      const result = await neonClient.signIn.social({
        provider: "google",
        callbackURL: authReturnUrl(window.location.href),
      });
      if (result.error) throw Error();
    } catch {
      setMessage(
        "Google could not be opened. Your current session is preserved; try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function signOut() {
    if (lock.current || providerCleanup === "running") return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await api.logout();
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* The committed cookie transition must survive local storage failure. */
        setStorageUnavailable(true);
      }
      try {
        rememberSession(sessionStorage, null);
      } catch {
        setStorageUnavailable(true);
      }
      intent.current = null;
      const cleanup = signOutProviderSession();
      onLogout();
      await cleanup;
    } catch {
      setMessage("Sign-out is unconfirmed. Try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="auth-panel"
      aria-label="Account"
      data-urgent={
        !!(
          expired ||
          message ||
          storageUnavailable ||
          providerCleanup !== "idle" ||
          conflict
        )
      }
    >
      {session?.principal.kind === "ACCOUNT" && !expired ? (
        <>
          <span>{session.principal.displayName}</span>
          <button disabled={authBusy} onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <span>
            {expired
              ? "Your session expired. Keep this page open to restore it."
              : session
                ? "Save decks and matches to your account."
                : "Play as a guest or save your progress with Google."}
          </span>
          <button disabled={authBusy || !ready} onClick={() => void login()}>
            Sign in with Google
          </button>
        </>
      )}
      {intent.current?.kind === "claim" && message && (
        <button
          disabled={authBusy}
          onClick={() => {
            intent.current = {
              ...prepare(),
              kind: "exchange",
              commandId: crypto.randomUUID(),
              keepMatchId: null,
            };
            void complete();
          }}
        >
          Sign in to a saved account
        </button>
      )}
      {(expired || message) && (
        <button disabled={authBusy} onClick={() => void complete()}>
          {busy ? "Restoring…" : "Restore session"}
        </button>
      )}
      {message && <p role="status">{message}</p>}
      {storageUnavailable && (
        <p role="alert">
          Device storage could not save your data. The current request is held
          in this page's memory. Do not reload or leave this page; this data
          will not follow you to Google.
        </p>
      )}
      {providerCleanup !== "idle" && (
        <>
          <p role="status">
            {providerCleanup === "running"
              ? "Ending Google session…"
              : "Your game session ended. The Google session could not be ended; you can retry below."}
          </p>
          <button
            disabled={authBusy}
            onClick={() => void signOutProviderSession()}
          >
            Retry Google sign-out
          </button>
        </>
      )}
      {conflict && catalog && (
        <MergeConflictDialog
          {...conflict}
          catalog={catalog}
          busy={authBusy}
          onChoose={(id) => void complete(id)}
          onClose={() => setConflict(null)}
        />
      )}
    </section>
  );
}
