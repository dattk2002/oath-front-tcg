import type { FastifyInstance, FastifyRequest } from "fastify";
import type { SessionPrincipal } from "../auth/sessions.js";
import { checked } from "../http.js";
import { validMatchId } from "./service.js";
import type { mutationLifetime } from "../deadline.js";
import type { matchService } from "./service.js";
export function registerMatchRoutes(
  app: FastifyInstance,
  service: ReturnType<typeof matchService>,
  authorize: (
    req: FastifyRequest,
    mutation: boolean,
  ) => Promise<SessionPrincipal>,
  lifetime: ReturnType<typeof mutationLifetime>,
) {
  const id = (req: FastifyRequest) =>
    validMatchId(checked("MatchParams", req.params).id);
  app.post(
    "/api/v1/matches",
    { handlerTimeout: lifetime.handlerTimeout },
    async (req, reply) =>
      lifetime.respond(
        reply,
        async () => {
          const principal = await authorize(req, true);
          return service.createMatch(
            principal,
            checked("CreateMatchRequest", req.body),
          );
        },
        201,
      ),
  );
  app.get("/api/v1/matches", async (req) => {
    const principal = await authorize(req, false);
    return service.listMatches(
      principal,
      checked("ListQuery", parseQuery(req.query, ["limit"])),
    );
  });
  app.get("/api/v1/matches/:id", async (req) =>
    service.readMatchView(await authorize(req, false), id(req)),
  );
  app.get("/api/v1/matches/:id/summary", async (req) =>
    service.readMatchSummary(await authorize(req, false), id(req)),
  );
  app.get("/api/v1/matches/:id/events", async (req) => {
    const principal = await authorize(req, false);
    return service.readVisibleEvents(
      principal,
      id(req),
      checked(
        "EventQuery",
        parseQuery(req.query, ["afterSeq", "throughSeq", "limit"]),
      ),
    );
  });
  app.post(
    "/api/v1/matches/:id/commands",
    { handlerTimeout: lifetime.handlerTimeout },
    async (req, reply) =>
      lifetime.respond(reply, async () => {
        const principal = await authorize(req, true);
        return service.executeCommand(
          principal,
          id(req),
          checked("CommandEnvelope", req.body),
        );
      }),
  );
}
export function parseQuery(value: unknown, numbers: string[]) {
  const query = checkedObject(value);
  for (const name of numbers)
    if (typeof query[name] === "string" && /^(0|[1-9]\d*)$/.test(query[name]))
      query[name] = Number(query[name]);
  return query;
}
function checkedObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? { ...value } : {};
}
