import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "@oathfront/db";
import type { SessionPrincipal } from "../auth/sessions.js";
import type { mutationLifetime } from "../deadline.js";
import type { Scheduler } from "../matches/commands.js";
import { checked } from "../http.js";
import { dailyService } from "./service.js";
import { progressionReader } from "../progression/read.js";
export function registerProgressionRoutes(
  app: FastifyInstance,
  db: Pool,
  now: () => Date,
  authorize: (
    req: FastifyRequest,
    mutation: boolean,
  ) => Promise<SessionPrincipal>,
  lifetime: ReturnType<typeof mutationLifetime>,
  scheduler?: Scheduler,
) {
  const read = progressionReader(db, now),
    service = dailyService(db, now, scheduler);
  app.get("/api/v1/collection", async (req) =>
    read.collection(await authorize(req, false)),
  );
  app.get("/api/v1/events/:slug/progress", async (req) =>
    read.weekly(
      await authorize(req, false),
      checked("LiveSlugParams", req.params).slug,
    ),
  );
  app.post(
    "/api/v1/events/daily-matches",
    { handlerTimeout: lifetime.handlerTimeout },
    async (req, reply) =>
      lifetime.respond(
        reply,
        async () =>
          service.startDaily(
            await authorize(req, true),
            checked("DailyCreateRequest", req.body),
          ),
        201,
      ),
  );
}
