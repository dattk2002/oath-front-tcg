import { validateBrowserWire } from "@oathfront/contracts/browser";
import type {
  DeckDTO,
  DeckInput,
  SaveDeckRequest,
  UpdateDeckRequest,
} from "@oathfront/contracts/browser";

export type PendingSave = {
  id: string | null;
  body: SaveDeckRequest | UpdateDeckRequest;
};
export type Draft = {
  deck: DeckInput;
  base: DeckDTO | null;
  pending: PendingSave | null;
};
export type DraftLocation = { key: string; pointer: string };
export function draftLocation(
  heroId: DeckInput["heroId"],
  base: DeckDTO | null,
  reviewMatchId?: string,
): DraftLocation {
  const owner = reviewMatchId
    ? `review.${reviewMatchId}`
    : (base?.id ?? `new.${heroId}`);
  return {
    key: `oathfront.draft.${reviewMatchId ? owner : base ? `${base.id}.${base.revision}` : owner}`,
    pointer: `oathfront.draft-pointer.${owner}`,
  };
}
function localDeck(value: unknown): value is DeckInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.length <= 80 &&
    validateBrowserWire("DeckInput", { ...value, name: "Bản nháp" })
  );
}
export function readDraft(
  storage: Storage,
  initial: DeckInput,
  saved: DeckDTO | null,
  reviewMatchId?: string,
): { draft: Draft; location: DraftLocation } | null {
  const location = draftLocation(initial.heroId, saved, reviewMatchId);
  const pointed = storage.getItem(location.pointer);
  // A resource pointer may only select a revision belonging to that resource.
  if (
    pointed &&
    (pointed === location.key ||
      (!reviewMatchId &&
        saved &&
        pointed.startsWith(`oathfront.draft.${saved.id}.`) &&
        /^[1-9]\d*$/.test(
          pointed.slice(`oathfront.draft.${saved.id}.`.length),
        )))
  )
    location.key = pointed;
  const raw: unknown = JSON.parse(storage.getItem(location.key) ?? "null");
  if (
    !raw ||
    typeof raw !== "object" ||
    !("deck" in raw) ||
    !localDeck(raw.deck) ||
    raw.deck.heroId !== initial.heroId
  )
    return null;
  const base = "base" in raw ? raw.base : saved;
  if (saved && base === null) return null;
  if (
    base !== null &&
    (!validateBrowserWire("DeckDTO", base) ||
      (saved && !reviewMatchId && base.id !== saved.id) ||
      base.heroId !== initial.heroId)
  )
    return null;
  let pending: PendingSave | null = null;
  if ("pending" in raw && raw.pending !== null && raw.pending !== undefined) {
    const value = raw.pending;
    if (
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      !("body" in value)
    )
      return null;
    if (value.id === null && validateBrowserWire("SaveDeckRequest", value.body))
      pending = { id: null, body: value.body };
    else if (
      base &&
      value.id === base.id &&
      validateBrowserWire("UpdateDeckRequest", value.body) &&
      value.body.expectedDeckRevision === base.revision
    )
      pending = { id: base.id, body: value.body };
    else return null;
  }
  return { draft: { deck: raw.deck, base, pending }, location };
}
export function writeDraft(
  storage: Storage,
  draft: Draft,
  previous: DraftLocation | null,
  reviewMatchId?: string,
): DraftLocation {
  const next = draftLocation(draft.deck.heroId, draft.base, reviewMatchId);
  storage.setItem(next.key, JSON.stringify(draft));
  storage.setItem(next.pointer, next.key);
  // Remove the old identity only after the new draft and pointer are durable.
  if (previous && previous.key !== next.key) storage.removeItem(previous.key);
  if (previous && previous.pointer !== next.pointer)
    storage.removeItem(previous.pointer);
  return next;
}
