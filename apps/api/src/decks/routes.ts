import type { FastifyInstance, FastifyRequest } from "fastify";
import type { SessionPrincipal } from "../auth/sessions.js";
import type { mutationLifetime } from "../deadline.js";
import { checked } from "../http.js";
import { parseQuery } from "../matches/routes.js";
import type { deckService } from "./service.js";
export function registerDeckRoutes(
  app: FastifyInstance,
  service: ReturnType<typeof deckService>,
  authorize: (
    req: FastifyRequest,
    mutation: boolean,
  ) => Promise<SessionPrincipal>,
  lifetime: ReturnType<typeof mutationLifetime>,
) {
  app.get("/api/v1/decks", async (req) =>
    service.listDecks(
      await authorize(req, false),
      checked("ListQuery", parseQuery(req.query, ["limit"])),
    ),
  );
  app.get("/api/v1/decks/:id", async (req) =>
    service.readDeck(
      await authorize(req, false),
      checked("DeckParams", req.params).id,
      checked("DeckVersionQuery", parseQuery(req.query, ["revision"])).revision,
    ),
  );
  app.post(
    "/api/v1/decks",
    { handlerTimeout: lifetime.handlerTimeout },
    async (req, reply) =>
      lifetime.respond(
        reply,
        async () => {
          const p = await authorize(req, true);
          const b = checked("SaveDeckRequest", req.body);
          return service.saveDeck(p, b.deck, undefined, b.commandId);
        },
        201,
      ),
  );
  app.put(
    "/api/v1/decks/:id",
    { handlerTimeout: lifetime.handlerTimeout },
    async (req, reply) =>
      lifetime.respond(reply, async () => {
        const p = await authorize(req, true);
        const id = checked("DeckParams", req.params).id;
        const b = checked("UpdateDeckRequest", req.body);
        return service.saveDeck(
          p,
          { ...b.deck, id },
          b.expectedDeckRevision,
          b.commandId,
        );
      }),
  );
}
