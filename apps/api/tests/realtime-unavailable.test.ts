import { expect, it } from "vitest";
import { validateWire } from "@oathfront/contracts";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
it("returns the structured unavailable response when realtime is unconfigured without breaking HTTP state", async () => {
  const guest = await h.guest();
  const created = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(guest),
    payload: createBody(),
  });
  const matchId = created.json().view.matchId;
  const ticket = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${matchId}/realtime-ticket`,
    headers: h.headers(guest),
    payload: {},
  });
  expect(ticket.statusCode).toBe(503);
  expect(ticket.json().error.code).toBe("TEMPORARILY_UNAVAILABLE");
  expect(validateWire("ErrorResponse", ticket.json())).toBe(true);
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${matchId}`,
        headers: h.headers(guest),
      })
    ).statusCode,
  ).toBe(200);
});
