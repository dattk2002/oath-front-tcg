# Production realtime smoke — 2026-10-23

**Passed** against `https://oathfront.vercel.app` and `wss://oathfront-api.vercel.app`, 04:14:52–04:15:42 UTC, fresh isolated Chromium 156.0.8078.4 context. Controller supplied UI deployment `c25294c` / API `62ebfb8`; this smoke exercised the production aliases rather than independently querying deployment metadata.

| Check                | Observed result                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh guest / match  | Both HTTP 201 through the UI API proxy; no existing user match accessed                                                                                                      |
| Native socket        | Exact API origin and `/realtime/matches`, no URL query; `ready` revision 0                                                                                                   |
| Public invalidations | `changed` revisions 1, 2, 3, 4; frames contained only `type`, `matchId`, `revision`                                                                                          |
| Production CSP       | `connect-src 'self' wss://oathfront-api.vercel.app`; no connect-src violations                                                                                               |
| Idle recovery reads  | **0 snapshot GETs in 11 seconds**, after the player turn became interactive                                                                                                  |
| Remote update        | HTTP PAUSE revision 3 caused a matching socket `changed` frame and visible Paused dialog                                                                                     |
| Reconnect            | Browser offline closed the first socket; PAUSE revision 5 was committed while offline; online received fresh `ready` revision 5 and rendered Paused after **1 snapshot GET** |
| Browser health       | No page errors or console errors; Three scene status `ready`; screenshot visually inspected                                                                                  |
| Cleanup              | Test match `9e5de904-5282-4f4e-8b0f-23d773902a65` surrendered once, then GET verified `COMPLETED`, reason `SURRENDER`, revision 6; browser context/process closed            |

No realtime blocker remained. One **non-websocket** CSP event was observed: `script-src` blocked `eval`. It did not produce a page/console error or prevent the verified flow; its source was not investigated in this bounded smoke. Do not interpret this as zero CSP events overall. Socket `closed` fields in JSON report close events observed by the page, not post-browser-shutdown server connection state.

Checked-in evidence: [redacted production observations](realtime-smoke.json) and [local integration observations](local-realtime.json). The standalone harness, compact log, and visually inspected screenshot remain in ignored session evidence; they are not part of this compact evidence copy. No cookie, CSRF token, guest recovery secret, subscribe ticket, trace, HAR, or storage state was persisted. No uncertain write retries, code changes, DB/reset/local server operations, commits, or deployments.
