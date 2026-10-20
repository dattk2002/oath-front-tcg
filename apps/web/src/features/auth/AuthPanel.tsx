import { useEffect, useEffectEvent, useRef, useState } from "react";
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
    [conflict, setConflict] = useState<{
      guestMatch: MatchSummary;
      accountMatch: MatchSummary;
    } | null>(null);
  const intent = useRef<Intent | null>(null),
    started = useRef(false),
    renewed = useRef<string | null>(null),
    lock = useRef(false);
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
    if (lock.current) return;
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
      sessionStorage.setItem(pendingKey, JSON.stringify(pending));
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
      intent.current = null;
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* Cookie/identity transition is already committed; never undo it for local storage. */
      }
      setConflict(null);
      setMessage(
        "Đã khôi phục tài khoản. Bạn có thể thử lại yêu cầu đang giữ.",
      );
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
          "Không thể gộp do yêu cầu trùng mã. Chưa có dữ liệu nào được chuyển; phiên khách vẫn được giữ.",
        );
      } else
        setMessage(
          "Chưa hoàn tất đăng nhập. Yêu cầu và lựa chọn vẫn được giữ. Đăng nhập Google hoặc thử khôi phục phiên.",
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
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(prepare()));
      const result = await neonClient.signIn.social({
        provider: "google",
        callbackURL: authReturnUrl(window.location.href),
      });
      if (result.error) throw Error();
    } catch {
      setMessage(
        "Không mở được Google. Phiên chơi hiện tại vẫn được giữ; hãy thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function signOut() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.logout();
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* Cookie/identity transition is already committed; never undo it for local storage. */
      }
      rememberSession(sessionStorage, null);
      intent.current = null;
      onLogout();
      const result = await neonClient.signOut();
      if (result.error)
        setMessage(
          "Đã kết thúc phiên chơi. Chưa kết thúc được phiên Google; hãy thử đăng xuất Google lại.",
        );
    } catch {
      setMessage("Chưa xác nhận được đăng xuất. Hãy thử lại.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="auth-panel" aria-label="Tài khoản">
      {session?.principal.kind === "ACCOUNT" && !expired ? (
        <>
          <span>{session.principal.displayName}</span>
          <button disabled={busy} onClick={() => void signOut()}>
            Đăng xuất
          </button>
        </>
      ) : (
        <>
          <span>
            {expired
              ? "Phiên đã hết hạn. Giữ nguyên trang để khôi phục."
              : session
                ? "Lưu bộ bài và trận đấu với tài khoản."
                : "Chơi ngay bằng phiên khách hoặc lưu tiến trình với Google."}
          </span>
          <button disabled={busy || !ready} onClick={() => void login()}>
            Đăng nhập Google
          </button>
        </>
      )}
      {intent.current?.kind === "claim" && message && (
        <button
          disabled={busy}
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
          Đăng nhập tài khoản đã lưu
        </button>
      )}
      {(expired || message) && (
        <button disabled={busy} onClick={() => void complete()}>
          {busy ? "Đang khôi phục…" : "Khôi phục phiên"}
        </button>
      )}
      {message && <p role="status">{message}</p>}
      {conflict && catalog && (
        <MergeConflictDialog
          {...conflict}
          catalog={catalog}
          busy={busy}
          onChoose={(id) => void complete(id)}
          onClose={() => setConflict(null)}
        />
      )}
    </section>
  );
}
