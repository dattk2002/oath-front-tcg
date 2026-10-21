import { contentName } from "../../content/english-content";
import { useEffect, useRef } from "react";
import type { MatchSummary, PublicCatalog } from "@oathfront/contracts";
import { openDialog } from "../match/keyboard";
export default function MergeConflictDialog({
  guestMatch,
  accountMatch,
  catalog,
  busy,
  onChoose,
  onClose,
}: {
  guestMatch: MatchSummary;
  accountMatch: MatchSummary;
  catalog: PublicCatalog;
  busy: boolean;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(
    () =>
      openDialog(dialog.current!, heading.current, () =>
        document.querySelector<HTMLButtonElement>(".auth-panel button"),
      ),
    [],
  );
  return (
    <dialog
      ref={dialog}
      className="match-dialog panel"
      aria-labelledby="merge-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="merge-title" ref={heading} tabIndex={-1}>
        Choose a match to resume
      </h2>
      <p>
        Your guest session and account both have active matches. The other match
        will close without a loss. Decks and history from both are preserved.
      </p>
      <div className="merge-choices">
        {[
          { match: guestMatch, label: "Guest match" },
          { match: accountMatch, label: "Account match" },
        ].map(({ match: m, label }) => {
          return (
            <button
              key={m.matchId}
              disabled={busy}
              onClick={() => onChoose(m.matchId)}
            >
              <strong>{label}</strong>
              <span>
                {contentName(
                  catalog.heroes.find((h) => h.id === m.humanHeroId)?.id ?? "",
                )}{" "}
                · Turn {m.turns}
              </span>
              <span>
                Opponent{" "}
                {contentName(
                  catalog.heroes.find((h) => h.id === m.opponentHeroId)?.id ??
                    "",
                )}{" "}
                · {m.difficulty === "NORMAL" ? "Normal" : "Easy"}
              </span>
              <span>{new Date(m.createdAt).toLocaleString("en-US")}</span>
              <span>{m.lifecycle === "PAUSED" ? "Paused" : "Active"}</span>
            </button>
          );
        })}
      </div>
      <button disabled={busy} onClick={onClose}>
        Back to guest session
      </button>
    </dialog>
  );
}
