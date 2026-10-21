import type { CommandResponse, VisibleEvent } from "@oathfront/contracts";
import { createApiClient, type ApiClient } from "./api-client";
import { ApiError } from "./api-error";
export const latestBoardRecoveryError =
  "The latest board could not be loaded. Reconnect to retry.";
export const incompleteLogRecoveryError =
  "The battle log is incomplete. Reconnect to restore it.";
export function isRecoveryFailureMessage(message: string | null): boolean {
  return (
    message === latestBoardRecoveryError ||
    message === incompleteLogRecoveryError
  );
}
export interface RecoveredMatch {
  response: CommandResponse;
  logEvents: VisibleEvent[];
  logExpired: boolean;
  logCursor: number;
}
export async function scanLog(
  matchId: string,
  cursor: number,
  throughSeq: number,
  api: Pick<ApiClient, "events">,
) {
  const events = new Map<string, VisibleEvent>();
  let logExpired = false;
  while (cursor < throughSeq) {
    try {
      const page = await api.events(matchId, cursor, throughSeq);
      if (
        page.nextCursor <= cursor ||
        page.nextCursor > throughSeq ||
        page.scannedThroughSeq !== page.nextCursor
      )
        throw new Error("INVALID_LOG_CURSOR");
      page.events.forEach((event) => events.set(event.eventId, event));
      cursor = page.nextCursor;
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.body.error.code !== "LOG_EXPIRED"
      )
        throw error;
      logExpired = true;
      // Mark the missing prefix, then recover the retained suffix through the
      // original snapshot boundary. A non-progressing expiry cannot loop forever.
      const retainedStart = error.body.error.details.earliestAvailableSeq - 1;
      cursor =
        retainedStart > cursor && retainedStart < throughSeq
          ? retainedStart
          : throughSeq;
    }
  }
  return {
    logEvents: [...events.values()].sort((a, b) => a.sequence - b.sequence),
    logCursor: cursor,
    logExpired,
  };
}
export async function recoverMatch(
  matchId: string,
  cursor: number,
  api: Pick<ApiClient, "match" | "events"> = createApiClient(),
): Promise<RecoveredMatch> {
  const response = await api.match(matchId);
  return {
    response,
    ...(await scanLog(matchId, cursor, response.latestSeq, api)),
  };
}
