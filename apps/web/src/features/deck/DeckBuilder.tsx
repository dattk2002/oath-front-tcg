import { usePrivateStorage } from "../auth/private-storage";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  validateBrowserWire,
  validateDeck,
} from "@oathfront/contracts/browser";
import type {
  CardDefinitionView,
  DeckDTO,
  DeckInput,
  PublicCatalog,
  RematchConfig,
} from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";
import { ApiError } from "../match/api-error";
import { openDialog } from "../match/keyboard";
import CardCollection, { QuantityControls } from "./CardCollection";
import ManaCurve from "./ManaCurve";
import { classLabel, keywordLabel } from "../match/labels";
import { changeQuantity, normalize } from "./model";
import { draftLocation, readDraft, writeDraft } from "./draft-storage";
import type { DraftLocation, PendingSave } from "./draft-storage";
const keywordCopy: Record<string, string> = {
  SHIELD: "Chặn một gói sát thương dương rồi mất Khiên.",
  ARMOR: "Giảm 1 sát thương mỗi gói; không cộng dồn.",
  POISONED: "Nhận 1 sát thương ở cuối lượt; Độc không cộng dồn.",
  STUNNED:
    "Không tấn công trong phần còn lại của lượt; vẫn chặn lộ và kích hoạt ability.",
  PIERCE: "Đòn đánh thường gây sát thương cho quân chặn và hero phía sau.",
  MOVE: "Đổi lộ, giữ nguyên HP, trạng thái và dấu đã tấn công.",
};
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => openDialog(ref.current!, heading.current), []);
  return (
    <dialog
      ref={ref}
      className="match-dialog panel builder-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      <h2 ref={heading} tabIndex={-1}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}
export default function DeckBuilder({
  catalog,
  api,
  initial,
  saved,
  review,
  onContinue,
}: {
  catalog: PublicCatalog;
  api: ApiClient;
  initial: DeckInput;
  saved?: DeckDTO;
  review?: { matchId: string; config: RematchConfig };
  onContinue: (deck: DeckDTO) => void;
}) {
  const storage = usePrivateStorage();
  const router = useRouter(),
    root = useRef<HTMLElement>(null),
    lock = useRef(false),
    pending = useRef<PendingSave | null>(null),
    storedLocation = useRef<DraftLocation | null>(null),
    createPending = useRef<Extract<
      import("@oathfront/contracts/browser").CreateMatchRequest,
      { mode: "SKIRMISH" }
    > | null>(null);
  const [deck, setDeck] = useState<DeckInput>(
      review ? { ...initial, contentVersion: catalog.version } : initial,
    ),
    [base, setBase] = useState(saved),
    [baseline, setBaseline] = useState(JSON.stringify(initial)),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [inspect, setInspect] = useState<CardDefinitionView | null>(null),
    [deckOpen, setDeckOpen] = useState(false),
    [stale, setStale] = useState<DeckDTO | null>(null),
    [leave, setLeave] = useState<string | null>(null),
    [nameError, setNameError] = useState(false),
    [conflict, setConflict] = useState<string | null>(null);
  const initialKey = draftLocation(
    initial.heroId,
    saved ?? null,
    review?.matchId,
  ).key;
  const dirty =
    JSON.stringify(deck) !== baseline || (!base && deck.entries.length > 0);
  const validation = validateDeck(deck, catalog);
  const hero = catalog.heroes.find((h) => h.id === deck.heroId)!;
  const nameValid =
    deck.name.normalize("NFC").trim().length > 0 &&
    deck.name.normalize("NFC").trim().length <= 40;
  useEffect(() => {
    try {
      const restored = readDraft(
        storage,
        initial,
        saved ?? null,
        review?.matchId,
      );
      if (restored) {
        storedLocation.current = restored.location;
        setDeck(restored.draft.deck);
        setBase(restored.draft.base ?? undefined);
        if (restored.draft.base) {
          const { name, heroId, entries, contentVersion } = restored.draft.base;
          setBaseline(
            JSON.stringify({ name, heroId, entries, contentVersion }),
          );
        }
        pending.current = restored.draft.pending;
        setMessage("Đã khôi phục bản nháp cục bộ; chưa lưu trên máy chủ.");
      }
    } catch {
      setMessage(
        "Không đọc được bản nháp cục bộ. Giữ trang này khi chỉnh sửa.",
      );
    }
    setReady(true);
  }, [initialKey, initial, saved, review?.matchId]);
  useEffect(() => {
    if (!ready) return;
    try {
      storedLocation.current = writeDraft(
        storage,
        { deck, base: base ?? null, pending: pending.current },
        storedLocation.current,
        review?.matchId,
      );
    } catch {
      setMessage(
        "Không lưu được bản nháp cục bộ. Giữ trang này để tránh mất thay đổi.",
      );
    }
  }, [deck, base, ready, review?.matchId]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (
        dirty &&
        link &&
        link.origin === location.origin &&
        !link.hash &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        setLeave(link.pathname + link.search);
      }
    };
    const currentHref = location.pathname + location.search;
    const beforeNavigation = (event: NavigateEvent) => {
      if (!dirty || event.navigationType !== "traverse" || !event.cancelable)
        return;
      const url = new URL(event.destination.url);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      setLeave(url.pathname + url.search);
    };
    const back = (event: PopStateEvent) => {
      if (!dirty || "navigation" in window) return;
      const target = location.pathname + location.search;
      if (target === currentHref) return;
      event.stopImmediatePropagation();
      router.replace(currentHref);
      setLeave(target);
    };
    if ("navigation" in window)
      window.navigation.addEventListener("navigate", beforeNavigation);
    window.addEventListener("popstate", back, true);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("popstate", back, true);
      if ("navigation" in window)
        window.navigation.removeEventListener("navigate", beforeNavigation);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, router]);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".deck-builder-layout",
        { opacity: 0.6 },
        {
          opacity: 1,
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 0.16,
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);
  function change(id: CardDefinitionView["id"], delta: number) {
    if (busy || pending.current || createPending.current) return;
    setDeck((old) => ({
      ...old,
      entries: changeQuantity(old.entries, id, delta),
    }));
  }
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".deck-summary-count",
        { opacity: 0.4 },
        {
          opacity: 1,
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 0.14,
        },
      );
    }, root);
    return () => ctx.revert();
  }, [deck.entries]);
  function clearLocal() {
    try {
      const location =
        storedLocation.current ??
        draftLocation(deck.heroId, base ?? null, review?.matchId);
      storage.removeItem(location.key);
      storage.removeItem(location.pointer);
    } catch {
      /* Confirmed save. */
    }
  }
  function adoptSaved(result: DeckDTO) {
    pending.current = null;
    const { name, heroId, entries, contentVersion } = result;
    const clean = { name, heroId, entries, contentVersion };
    setBase(result);
    setDeck(clean);
    setBaseline(JSON.stringify(clean));
    setStale(null);
    try {
      storedLocation.current = writeDraft(
        storage,
        { deck: clean, base: result, pending: null },
        storedLocation.current,
        review?.matchId,
      );
    } catch {
      /* State remains available on this page. */
    }
  }
  async function save(
    asCopy = false,
    navigate = false,
  ): Promise<DeckDTO | null> {
    if (lock.current) return null;
    if (!nameValid) {
      setNameError(true);
      requestAnimationFrame(() =>
        document.getElementById("deck-error-summary")?.focus(),
      );
      return null;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    const p = pending.current ?? {
      id: !asCopy && base ? base.id : null,
      body:
        !asCopy && base
          ? {
              commandId: crypto.randomUUID(),
              expectedDeckRevision: base.revision,
              deck,
            }
          : { commandId: crypto.randomUUID(), deck },
    };
    pending.current = p;
    let durable = true;
    try {
      storedLocation.current = writeDraft(
        storage,
        { deck, base: base ?? null, pending: p },
        storedLocation.current,
        review?.matchId,
      );
    } catch {
      durable = false;
    }
    try {
      const result =
        p.id && "expectedDeckRevision" in p.body
          ? await api.updateDeck(p.id, p.body)
          : await api.saveDeck(p.body);
      adoptSaved(result);
      setMessage("Đã lưu");
      if (navigate && !review) router.replace(`/decks/${result.id}/edit`);
      return result;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "STALE_DECK_REVISION"
      ) {
        setStale(error.body.error.details.deck);
        pending.current = null;
      } else if (
        error instanceof ApiError &&
        error.status !== 401 &&
        error.status < 500 &&
        !error.body.error.retryable
      ) {
        pending.current = null;
        setMessage(
          "Chưa lưu được bộ bài. Kiểm tra tên, số bản và class; bản nháp vẫn được giữ.",
        );
      } else
        setMessage(
          `Chưa xác định kết quả lưu. Khôi phục phiên nếu đã hết hạn, rồi thử lại cùng yêu cầu.${durable ? "" : " Không lưu được yêu cầu; giữ trang này, không tải lại."}`,
        );
      try {
        storedLocation.current = writeDraft(
          storage,
          { deck, base: base ?? null, pending: pending.current },
          storedLocation.current,
          review?.matchId,
        );
      } catch {
        /* The in-memory request remains available for retry. */
      }
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function acceptReview() {
    if (!review || lock.current || !validation.playable || !nameValid) return;
    let source = review.config.deck;
    if (
      !createPending.current &&
      (JSON.stringify(deck) !== JSON.stringify(initial) ||
        initial.contentVersion !== catalog.version)
    ) {
      const result = await save(true);
      if (!result) return;
      source = {
        kind: "SAVED",
        deckId: result.id,
        deckRevision: result.revision,
      };
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const body = createPending.current ?? {
      ...review.config,
      deck: source,
      commandId: crypto.randomUUID(),
      mode: "SKIRMISH" as const,
      expectedContentVersion: catalog.version,
    };
    createPending.current = body;
    let durable = true;
    try {
      storage.setItem(
        `oathfront.review-create.${review.matchId}`,
        JSON.stringify(body),
      );
    } catch {
      durable = false;
    }
    try {
      const result = await api.createMatch(body);
      clearLocal();
      try {
        storage.removeItem(`oathfront.review-create.${review.matchId}`);
      } catch {
        /* Confirmed. */
      }
      router.push(`/matches/${result.view.matchId}`);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "ACTIVE_MATCH_EXISTS"
      )
        setConflict(error.body.error.details.matchId);
      else if (
        error instanceof ApiError &&
        error.status !== 401 &&
        error.status < 500
      ) {
        createPending.current = null;
        setMessage(
          "Yêu cầu không được chấp nhận. Hãy kiểm tra lại nguồn bộ bài.",
        );
      } else
        setMessage(
          `Chưa xác định kết quả tạo trận. Thử lại gửi cùng yêu cầu.${durable ? "" : " Không lưu được yêu cầu; giữ trang này, không tải lại."}`,
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!review) return;
    try {
      const body: unknown = JSON.parse(
        storage.getItem(`oathfront.review-create.${review.matchId}`) ?? "null",
      );
      if (
        validateBrowserWire("CreateMatchRequest", body) &&
        body.mode === "SKIRMISH" &&
        body.opponentHeroId === review.config.opponentHeroId &&
        body.difficulty === review.config.difficulty &&
        body.expectedContentVersion === catalog.version
      )
        createPending.current = body;
    } catch {
      /* Memory retries. */
    }
  }, [review, catalog.version]);
  const rows = deck.entries
    .map((e) => ({
      entry: e,
      card: catalog.cards.find((c) => c.id === e.cardId),
    }))
    .sort(
      (a, b) =>
        (a.card?.cost ?? 0) - (b.card?.cost ?? 0) ||
        normalize(a.card?.nameVi ?? a.entry.cardId).localeCompare(
          normalize(b.card?.nameVi ?? b.entry.cardId),
          "vi",
        ),
    );
  const deckPanel = (
    <aside className="panel deck-panel" aria-label="Danh sách bộ bài">
      <h2 className="deck-summary-count">
        Bộ bài · {validation.totalCards}/30
      </h2>
      <ManaCurve catalog={catalog} entries={deck.entries} />
      <ul className="builder-rows">
        {rows.map(({ entry, card }) => (
          <li key={entry.cardId} onClick={() => card && setInspect(card)}>
            {card ? (
              <>
                <button
                  className="card-title"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspect(card);
                  }}
                >
                  {card.cost} · {card.nameVi}
                </button>
                <QuantityControls
                  card={card}
                  quantity={entry.quantity}
                  total={validation.totalCards}
                  onChange={change}
                />
              </>
            ) : (
              entry.cardId
            )}
          </li>
        ))}
      </ul>
      {!rows.length && <p>Bộ bài trống. Thêm lá từ bộ sưu tập.</p>}
      {!validation.playable && (
        <p role="status">Bản nháp · Cần đủ 30 lá hợp lệ để chơi.</p>
      )}
    </aside>
  );
  return (
    <section className="setup deck-builder" ref={root}>
      <div className="screen-heading">
        <div>
          <h1>{review ? "Xem lại bộ bài" : "Xây dựng bộ bài"}</h1>
          <p>
            {hero.nameVi} · {hero.classes.map((c) => classLabel[c]).join(" · ")}
          </p>
        </div>
        <Link href={`/heroes/${hero.id}/decks`}>Quay lại bộ bài</Link>
      </div>
      {review && (
        <section className="panel review-source">
          <h2>Nguồn bộ bài được giữ lại</h2>
          <p>
            {review.config.deck.kind === "PRESET"
              ? `PRESET ${review.config.deck.presetId}`
              : `SAVED ${review.config.deck.deckId} · phiên bản ${review.config.deck.deckRevision}`}
          </p>
          <p>
            Nội dung gốc: {review.config.expectedContentVersion} · Hiện hành:{" "}
            {catalog.version}
          </p>
          <p>
            Kiểm tra bộ bài bên dưới. Chỉ tạo trận sau khi bạn chấp nhận rõ
            ràng.
          </p>
        </section>
      )}
      {nameError && !nameValid && (
        <div
          id="deck-error-summary"
          tabIndex={-1}
          role="alert"
          className="notice"
        >
          <a
            href="#deck-name"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("deck-name")?.focus();
            }}
          >
            Tên bộ bài phải có 1–40 ký tự.
          </a>
        </div>
      )}
      <fieldset
        disabled={busy || !!pending.current || !!createPending.current}
        className="builder-fields"
      >
        <label className="deck-name">
          Tên bộ bài
          <input
            id="deck-name"
            maxLength={80}
            value={deck.name}
            aria-invalid={nameError && !nameValid}
            aria-describedby={
              nameError && !nameValid ? "deck-name-error" : undefined
            }
            onChange={(e) =>
              setDeck((old) => ({ ...old, name: e.target.value }))
            }
          />
        </label>
        {nameError && !nameValid && (
          <p id="deck-name-error" role="alert">
            Nhập tên từ 1 đến 40 ký tự.
          </p>
        )}
        <div className="deck-builder-layout">
          <CardCollection
            catalog={catalog}
            hero={hero}
            entries={deck.entries}
            onChange={change}
            onInspect={setInspect}
          />
          <div className="desktop-deck-panel">{deckPanel}</div>
        </div>
      </fieldset>
      <div className="deck-footer">
        <button
          className="mobile-deck-button"
          aria-haspopup="dialog"
          onClick={() => setDeckOpen(true)}
        >
          Bộ bài · {validation.totalCards}/30
        </button>
        <p role="status">
          {busy
            ? "Đang xác nhận…"
            : message || (dirty ? "Bản nháp cục bộ · Chưa lưu" : "Đã lưu")}
        </p>
        <button
          disabled={busy || !!createPending.current}
          onClick={() => void save(false, true)}
        >
          Lưu bộ bài
        </button>
        {review ? (
          <button
            className="primary"
            disabled={busy || !validation.playable || !nameValid}
            onClick={() => void acceptReview()}
          >
            Chấp nhận và tạo trận mới
          </button>
        ) : (
          <button
            className="primary"
            disabled={busy || !validation.playable || !nameValid}
            onClick={async () => {
              const result = dirty || !base ? await save() : base;
              if (result) onContinue(result);
            }}
          >
            {dirty || !base ? "Lưu và tiếp tục" : "Chọn đối thủ"}
          </button>
        )}
      </div>
      {conflict && (
        <Link href={`/matches/${conflict}`}>Tiếp tục trận đang chơi</Link>
      )}
      {deckOpen && (
        <Modal
          title={`Bộ bài · ${validation.totalCards}/30`}
          onClose={() => setDeckOpen(false)}
        >
          <fieldset
            className="builder-fields"
            disabled={busy || !!pending.current || !!createPending.current}
          >
            {deckPanel}
          </fieldset>
          <button onClick={() => setDeckOpen(false)}>Đóng bộ bài</button>
        </Modal>
      )}
      {inspect && (
        <Modal title={inspect.nameVi} onClose={() => setInspect(null)}>
          <p>{inspect.exactTextVi}</p>
          <div className="keyword-help">
            {inspect.keywords.map((k) => (
              <details key={k}>
                <summary title={keywordCopy[k]}>{keywordLabel[k]}</summary>
                <p>{keywordCopy[k]}</p>
              </details>
            ))}
          </div>
          <QuantityControls
            card={inspect}
            quantity={
              deck.entries.find((e) => e.cardId === inspect.id)?.quantity ?? 0
            }
            total={validation.totalCards}
            onChange={change}
          />
          <button onClick={() => setInspect(null)}>Đóng chi tiết lá bài</button>
        </Modal>
      )}
      {stale && (
        <Modal title="Bộ bài đã thay đổi ở tab khác">
          <p>
            Bản nháp của bạn vẫn được giữ. Bản trên máy chủ hiện ở phiên bản{" "}
            {stale.revision}.
          </p>
          <button
            onClick={() => {
              adoptSaved(stale);
              setMessage("Đã tải bản mới");
            }}
          >
            Tải bản mới
          </button>
          <button onClick={() => void save(true, true)}>
            Lưu thành bản sao
          </button>
          <button onClick={() => setStale(null)}>Ở lại</button>
        </Modal>
      )}
      {leave && (
        <Modal
          title="Bộ bài có thay đổi chưa lưu"
          onClose={() => setLeave(null)}
        >
          <button
            disabled={busy}
            onClick={async () => {
              const result = await save();
              if (result) {
                const href = leave;
                setLeave(null);
                router.push(href);
              }
            }}
          >
            Lưu
          </button>
          <button
            disabled={busy}
            onClick={() => {
              clearLocal();
              router.push(leave);
            }}
          >
            Rời đi
          </button>
          <button onClick={() => setLeave(null)}>Ở lại</button>
        </Modal>
      )}
    </section>
  );
}
