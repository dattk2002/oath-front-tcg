import { validateWire } from "@oathfront/contracts";
import type { GameEvent } from "./model.js";
/** Closed internal event extension. It is never a public wire event. */
export function validateGameEvent(value: unknown): value is GameEvent {
  if (validateWire("VisibleEvent", value)) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const e = value as Record<string, unknown>;
  if (
    Object.keys(e).sort().join(",") !==
      "eventId,kind,ownerSide,payload,rootId,sequence,visibility" ||
    e.kind !== "BotGuardFault" ||
    e.visibility !== "SERVER" ||
    e.ownerSide !== null ||
    typeof e.eventId !== "string" ||
    typeof e.rootId !== "string" ||
    !Number.isSafeInteger(e.sequence) ||
    Number(e.sequence) < 1
  )
    return false;
  const p = e.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return false;
  const payload = p as Record<string, unknown>;
  return (
    Object.keys(payload).sort().join(",") === "botIntents,turn" &&
    payload.botIntents === 64 &&
    Number.isSafeInteger(payload.turn) &&
    Number(payload.turn) >= 0 &&
    Number(payload.turn) <= 20
  );
}
