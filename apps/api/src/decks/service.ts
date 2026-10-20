import { randomUUID } from "node:crypto";
import { coreCatalog, validateDeck } from "@oathfront/game-content";
import { validateWire } from "@oathfront/contracts";
import type { DeckDTO, DeckInput, ListQuery } from "@oathfront/contracts";
import type { Pool, PoolClient } from "@oathfront/db";
import type { SessionPrincipal } from "../auth/sessions.js";
import { HttpError, output, checked } from "../http.js";
import { createRepository } from "../matches/repository.js";
import { hashJson } from "../matches/initialization.js";
import { insertResourceReceipt } from "../matches/receipts.js";
import { publicCatalog } from "../content/registry.js";
export function deckService(pool: Pool, now: () => Date = () => new Date()) {
  const repository = createRepository(pool, { now });
  async function readDeck(
    principal: SessionPrincipal,
    id: string,
    revision?: number,
    tx: Pool | PoolClient = pool,
  ): Promise<DeckDTO> {
    const row = (
      await tx.query(
        "SELECT d.id,d.name,d.updated_at,v.* FROM decks d JOIN deck_versions v ON v.deck_id=d.id AND v.revision=COALESCE($3,d.current_revision) WHERE d.id=$1 AND d.owner_id=$2",
        [id, principal.id, revision ?? null],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "NOT_FOUND");
    const deck = output("DeckInput", {
      name: row.name,
      heroId: row.hero_id,
      contentVersion: row.content_version,
      entries: row.entries,
    });
    return output("DeckDTO", {
      ...deck,
      id: row.id,
      revision: row.revision,
      validation: validateDeck(deck, coreCatalog),
      updatedAt: row.updated_at.toISOString(),
    });
  }
  async function saveDeck(
    principal: SessionPrincipal,
    input: DeckInput & { id?: string },
    expectedRevision: number | undefined,
    commandId: string,
  ): Promise<DeckDTO> {
    return repository.withPrincipalTransaction([principal.id], async (tx) => {
      const hash = hashJson({
        route: "saveDeck",
        input,
        expectedRevision: expectedRevision ?? null,
        commandId,
      });
      const previous = await repository.findReceipt(
        principal.id,
        commandId,
        tx,
      );
      if (previous) {
        if (previous.requestHash !== hash)
          throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
        return output("DeckDTO", previous.response);
      }
      const { id: existingId, ...raw } = input;
      const deck = checked("DeckInput", {
        ...raw,
        name: raw.name.normalize("NFC").trim(),
      });
      const validation = validateDeck(deck, coreCatalog);
      if (
        validation.totalCards > 30 ||
        validation.issues.some((i) => i.code !== "TOTAL_NOT_30")
      )
        throw new HttpError(422, "INVALID_DECK", { validation });
      let revision = 1;
      const id = existingId ?? randomUUID();
      if (existingId) {
        const row = (
          await tx.query(
            "SELECT current_revision FROM decks WHERE id=$1 AND owner_id=$2 FOR UPDATE",
            [id, principal.id],
          )
        ).rows[0];
        if (!row) throw new HttpError(404, "NOT_FOUND");
        if (row.current_revision !== expectedRevision)
          throw new HttpError(409, "STALE_DECK_REVISION", {
            deck: await readDeck(principal, id, undefined, tx),
          });
        revision = row.current_revision + 1;
        await tx.query(
          "UPDATE decks SET name=$2,hero_id=$3,current_revision=$4,updated_at=$5 WHERE id=$1",
          [id, deck.name, deck.heroId, revision, now()],
        );
      } else
        await tx.query(
          "INSERT INTO decks(id,owner_id,name,hero_id,current_revision,created_at,updated_at) VALUES($1,$2,$3,$4,1,$5,$5)",
          [id, principal.id, deck.name, deck.heroId, now()],
        );
      await tx.query(
        "INSERT INTO deck_versions(deck_id,revision,content_version,hero_id,entries,validation_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          revision,
          deck.contentVersion,
          deck.heroId,
          JSON.stringify(deck.entries),
          validation.playable ? "PLAYABLE" : "DRAFT",
          now(),
        ],
      );
      const response = await readDeck(principal, id, revision, tx);
      await insertResourceReceipt(tx, {
        principalId: principal.id,
        resourceId: id,
        revision,
        commandId,
        requestHash: hash,
        response,
        now: now(),
        expiresAt:
          principal.expiresAt ?? new Date(now().getTime() + 30 * 86400000),
      });
      return response;
    });
  }
  async function listDecks(principal: SessionPrincipal, query: ListQuery) {
    let cursor: { date: string; id: string } | null = null;
    if (query.cursor) {
      try {
        const c: unknown = JSON.parse(
          Buffer.from(query.cursor, "base64url").toString(),
        );
        if (
          typeof c !== "object" ||
          c === null ||
          !("date" in c) ||
          !("id" in c) ||
          typeof c.date !== "string" ||
          !validateWire("Uuid", c.id) ||
          !Number.isFinite(Date.parse(c.date))
        )
          throw Error();
        cursor = { date: c.date, id: c.id };
        if (
          !(
            await pool.query(
              "SELECT 1 FROM decks WHERE id=$1 AND owner_id=$2 AND updated_at=$3",
              [cursor.id, principal.id, cursor.date],
            )
          ).rowCount
        )
          throw Error();
      } catch {
        throw new HttpError(400, "VALIDATION_FAILED", {
          issues: [{ path: "/cursor", rule: "cursor" }],
        });
      }
    }
    const limit = query.limit ?? 20;
    const rows = (
      await pool.query(
        "SELECT id,updated_at FROM decks WHERE owner_id=$1 AND ($2::timestamptz IS NULL OR (updated_at,id)<($2::timestamptz,$3::uuid)) ORDER BY updated_at DESC,id DESC LIMIT $4",
        [principal.id, cursor?.date ?? null, cursor?.id ?? null, limit + 1],
      )
    ).rows;
    const items = await Promise.all(
      rows.slice(0, limit).map((row) => readDeck(principal, row.id)),
    );
    const last = rows[limit - 1];
    return output("DeckList", {
      items,
      presets: publicCatalog().presets,
      nextCursor:
        rows.length > limit
          ? Buffer.from(
              JSON.stringify({
                date: last.updated_at.toISOString(),
                id: last.id,
              }),
            ).toString("base64url")
          : null,
    });
  }
  return { readDeck, saveDeck, listDecks };
}
