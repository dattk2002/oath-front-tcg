import { safeInteger } from "@oathfront/db";
import type { Pool } from "@oathfront/db";
import type {
  EventPage,
  EventQuery,
  CommandResponse,
  VisibleEvent,
} from "@oathfront/contracts";
import { validateWire } from "@oathfront/contracts";
import { projectEvents, projectPlayerView } from "@oathfront/game-engine";
import type { GameEvent, MatchState } from "@oathfront/game-engine";
import { output, HttpError } from "../http.js";
import type { SessionPrincipal } from "../auth/sessions.js";
import { PersistenceError } from "./checkpoint.js";
import { createRepository } from "./repository.js";
import type { Scheduler } from "./commands.js";
import { needsAdvance } from "./commands.js";
/** Both visible quota and persisted-row scan are bounded; invisible rows still advance the cursor. */
export function eventSlice(
  events: GameEvent[],
  side: MatchState["humanSide"],
  after: number,
  through: number,
  limit = 100,
) {
  const visible: VisibleEvent[] = [];
  let scanned = after;
  for (const e of events.slice(0, 100)) {
    scanned = e.sequence;
    visible.push(...projectEvents([e], side));
    if (visible.length === limit) break;
  }
  if (events.length === 0 && after === through) scanned = through;
  return output("EventPage", {
    events: visible,
    nextCursor: scanned,
    scannedThroughSeq: scanned,
    hasMore: scanned < through,
  });
}
export function commandResponse(
  state: MatchState,
  revision: number,
  events: GameEvent[],
  after: number,
  guard: number,
  scheduler: Scheduler,
): CommandResponse {
  const page = eventSlice(events, state.humanSide, after, state.eventSeq);
  return output("CommandResponse", {
    view: projectPlayerView(state, state.humanSide),
    revision,
    latestSeq: state.eventSeq,
    events: page.events,
    eventsThroughSeq: page.scannedThroughSeq,
    needsAdvance: needsAdvance(state, guard, scheduler),
  });
}
export function eventReader(
  pool: Pool,
  repository: ReturnType<typeof createRepository>,
) {
  return async function readVisibleEvents(
    principal: SessionPrincipal,
    matchId: string,
    query: EventQuery,
  ): Promise<EventPage> {
    const record = await repository
      .loadMatch(principal.id, matchId)
      .catch(async (error) => {
        if (
          error instanceof PersistenceError &&
          error.code === "MATCH_DETAILS_EXPIRED"
        ) {
          const earliest = (
            await pool.query(
              "SELECT min(seq) seq FROM match_events WHERE match_id=$1",
              [matchId],
            )
          ).rows[0].seq;
          throw new HttpError(410, "LOG_EXPIRED", {
            earliestAvailableSeq: earliest === null ? 1 : safeInteger(earliest),
          });
        }
        throw error;
      });
    if (
      query.throughSeq < query.afterSeq ||
      query.throughSeq > record.state.eventSeq
    )
      throw new HttpError(400, "VALIDATION_FAILED", {
        issues: [{ path: "/throughSeq", rule: "range" }],
      });
    // Hidden rows contribute only sequence metadata, never public payload decoding.
    const rows = (
      await pool.query(
        `SELECT seq,CASE WHEN visibility='PUBLIC' OR (visibility='OWNER' AND owner_side=$4) THEN jsonb_build_object('eventId',event_id,'sequence',seq,'rootId',root_id,'kind',kind,'visibility',visibility,'ownerSide',owner_side,'payload',payload) ELSE NULL END AS visible FROM match_events WHERE match_id=$1 AND seq>$2 AND seq<=$3 ORDER BY seq LIMIT 100`,
        [matchId, query.afterSeq, query.throughSeq, record.state.humanSide],
      )
    ).rows;
    let scanned = query.afterSeq;
    const visible: VisibleEvent[] = [];
    for (const row of rows) {
      const sequence = safeInteger(row.seq);
      if (sequence !== scanned + 1) break;
      scanned = sequence;
      if (row.visible !== null) {
        if (!validateWire("VisibleEvent", row.visible))
          throw new HttpError(500, "INTERNAL");
        visible.push(row.visible);
      }
      if (visible.length === (query.limit ?? 100)) break;
    }
    if (scanned === query.afterSeq && scanned < query.throughSeq) {
      const earliest = (
        await pool.query(
          "SELECT min(seq) seq FROM match_events WHERE match_id=$1",
          [matchId],
        )
      ).rows[0].seq;
      throw new HttpError(410, "LOG_EXPIRED", {
        earliestAvailableSeq:
          earliest === null ? record.state.eventSeq + 1 : safeInteger(earliest),
      });
    }
    return output("EventPage", {
      events: visible,
      nextCursor: scanned,
      scannedThroughSeq: scanned,
      hasMore: scanned < query.throughSeq,
    });
  };
}
