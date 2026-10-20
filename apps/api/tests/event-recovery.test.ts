import { expect, it } from "vitest";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
it("scans hidden rows without leaking payload or kind and preserves snapshot recovery cursor", async () => {
  const g = await h.guest();
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  expect(r.statusCode).toBe(201);
  const id = r.json().view.matchId;
  const bot = (
    await h.pool.query(
      "SELECT seq FROM match_events WHERE match_id=$1 AND visibility='OWNER' AND owner_side='EVIL' ORDER BY seq LIMIT 1",
      [id],
    )
  ).rows[0];
  const seq = Number(bot.seq);
  const p = await h.app.inject({
    url: `/api/v1/matches/${id}/events?afterSeq=${seq - 1}&throughSeq=${seq}&limit=1`,
    headers: h.headers(g),
  });
  expect(p.statusCode).toBe(200);
  expect(p.json()).toEqual({
    events: [],
    nextCursor: seq,
    scannedThroughSeq: seq,
    hasMore: false,
  });
  const snapshot = await h.app.inject({
    url: `/api/v1/matches/${id}`,
    headers: h.headers(g),
  });
  expect(snapshot.json().events).toEqual([]);
  const log = await h.app.inject({
    url: `/api/v1/matches/${id}/events?afterSeq=0&throughSeq=${snapshot.json().latestSeq}`,
    headers: h.headers(g),
  });
  expect(log.json().events[0].kind).toBe("MatchStarted");
  await h.owner.query("DELETE FROM match_events WHERE match_id=$1 AND seq=1", [
    id,
  ]);
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${id}/events?afterSeq=0&throughSeq=${snapshot.json().latestSeq}`,
        headers: h.headers(g),
      })
    ).statusCode,
  ).toBe(410);
});
it("scans SERVER rows with private non-public payload without validating or exposing their kind", async () => {
  const g = await h.guest();
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const id = r.json().view.matchId;
  await h.owner.query(
    "UPDATE match_events SET visibility='SERVER',owner_side=NULL,kind='PRIVATE_DIAGNOSTIC_CANARY',payload='{\"seed\":\"PRIVATE_PAYLOAD_CANARY\"}' WHERE match_id=$1 AND seq=2",
    [id],
  );
  const p = await h.app.inject({
    url: `/api/v1/matches/${id}/events?afterSeq=1&throughSeq=2`,
    headers: h.headers(g),
  });
  expect(p.statusCode).toBe(200);
  expect(p.json()).toEqual({
    events: [],
    nextCursor: 2,
    scannedThroughSeq: 2,
    hasMore: false,
  });
  expect(p.body).not.toContain("CANARY");
});
it("caps command event delivery at 100 scanned rows and recovers the complete fixed upper bound", async () => {
  const { commandResponse } = await import("../src/matches/events.js");
  const { engineScheduler } = await import("../src/matches/commands.js");
  const { encodeCheckpoint } = await import("../src/matches/checkpoint.js");
  const { hashState } = await import("@oathfront/game-engine");
  const g = await h.guest();
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const id = r.json().view.matchId;
  const record = await h.app.services.repository.loadMatch(g.id, id),
    state = record.state;
  // A dense persisted-log fixture isolates transport truncation independently of card balance.
  const events = Array.from({ length: 205 }, (_, i) => ({
    kind: "HandCountChanged" as const,
    visibility: "PUBLIC" as const,
    ownerSide: null,
    payload: { side: "GOOD" as const, handCount: 4, deckCount: 26 },
    sequence: i + 1,
    eventId: `${id}:${i + 1}`,
    rootId: `${id}:1`,
  }));
  state.eventSeq = 205;
  const response = commandResponse(state, 0, events, 0, 0, engineScheduler);
  expect(response.events).toHaveLength(100);
  expect(response.eventsThroughSeq).toBe(100);
  expect(response.latestSeq).toBe(205);
  await h.owner.query("DELETE FROM match_events WHERE match_id=$1", [id]);
  for (const e of events)
    await h.owner.query(
      "INSERT INTO match_events(match_id,seq,event_id,root_id,kind,visibility,owner_side,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id,
        e.sequence,
        e.eventId,
        e.rootId,
        e.kind,
        e.visibility,
        e.ownerSide,
        e.payload,
      ],
    );
  await h.owner.query(
    "UPDATE match_checkpoints SET state=$2,state_hash=$3,last_event_seq=205 WHERE match_id=$1",
    [id, encodeCheckpoint(state), hashState(state)],
  );
  let cursor = response.eventsThroughSeq;
  const recovered = [...response.events];
  while (cursor < 205) {
    const page = await h.app.inject({
      url: `/api/v1/matches/${id}/events?afterSeq=${cursor}&throughSeq=205`,
      headers: h.headers(g),
    });
    expect(page.statusCode).toBe(200);
    recovered.push(...page.json().events);
    cursor = page.json().nextCursor;
  }
  expect(recovered.map((e) => e.sequence)).toEqual(
    Array.from({ length: 205 }, (_, i) => i + 1),
  );
});
