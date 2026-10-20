import { validateWire } from "@oathfront/contracts";
import type { WireDefinitions, ErrorResponse } from "@oathfront/contracts";
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ErrorResponse["error"]["code"],
    public details: unknown = {},
  ) {
    super(code);
  }
}
export function checked<K extends keyof WireDefinitions>(
  name: K,
  value: unknown,
): WireDefinitions[K] {
  if (!validateWire(name, value))
    throw new HttpError(400, "VALIDATION_FAILED", {
      issues: [{ path: "/", rule: "schema" }],
    });
  return value;
}
export function output<K extends keyof WireDefinitions>(
  name: K,
  value: unknown,
): WireDefinitions[K] {
  if (!validateWire(name, value)) throw new HttpError(500, "INTERNAL");
  return value;
}
