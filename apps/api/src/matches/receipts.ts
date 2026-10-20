import { isDeepStrictEqual } from "node:util";
import type { CommandResponse } from "@oathfront/contracts";
import { validateWire } from "@oathfront/contracts";
import type { MatchState } from "@oathfront/game-engine";
import { projectPlayerView, projectEvents } from "@oathfront/game-engine";
import type { PoolClient } from "@oathfront/db";
import { PersistenceError } from "./checkpoint.js";
export interface Receipt {
  commandId: string;
  requestHash: string;
  response: CommandResponse;
  expiresAt: Date;
}
/** Shared by initialization and command persistence, inside their existing transaction. */
export async function insertMatchReceipt(
  client: PoolClient,
  input: {
    principalId: string;
    state: MatchState;
    revision: number;
    receipt: Receipt;
    now: Date;
  },
) {
  const { principalId, state, revision, receipt, now } = input;
  if (
    !validateWire("Uuid", receipt.commandId) ||
    !/^[a-f0-9]{64}$/.test(receipt.requestHash) ||
    !validateWire("CommandResponse", receipt.response) ||
    receipt.response.revision !== revision ||
    receipt.response.latestSeq !== state.eventSeq ||
    !isDeepStrictEqual(
      receipt.response.view,
      projectPlayerView(state, state.humanSide),
    ) ||
    !isDeepStrictEqual(
      receipt.response.events,
      projectEvents(receipt.response.events, state.humanSide),
    )
  )
    throw new PersistenceError("INVALID_RECEIPT");
  await insertResourceReceipt(client, {
    principalId,
    resourceId: state.matchId,
    revision,
    commandId: receipt.commandId,
    requestHash: receipt.requestHash,
    response: receipt.response,
    now,
    expiresAt: receipt.expiresAt,
  });
}
/** Durable resource receipt; caller validates response and holds the principal lock. */
export async function insertResourceReceipt(
  client: PoolClient,
  input: {
    principalId: string;
    resourceId: string;
    revision: number;
    commandId: string;
    requestHash: string;
    response: unknown;
    now: Date;
    expiresAt: Date;
  },
) {
  const {
    principalId,
    resourceId,
    revision,
    commandId,
    requestHash,
    response,
    now,
    expiresAt,
  } = input;
  await client.query(
    "INSERT INTO command_receipts(principal_id,command_id,request_hash,resource_id,response,resulting_revision,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      principalId,
      commandId,
      requestHash,
      resourceId,
      JSON.stringify(response),
      revision,
      now,
      expiresAt,
    ],
  );
}
