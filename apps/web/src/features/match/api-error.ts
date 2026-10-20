import type { ErrorResponse } from "@oathfront/contracts";
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ErrorResponse,
  ) {
    super(body.error.code);
    this.name = "ApiError";
  }
}
