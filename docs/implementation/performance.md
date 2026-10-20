# Task 16 — Performance and lifecycle measurements

The production benchmark uses the actual React/Pixi/GSAP application, authored Task15 assets and validated public DTOs. It isolates presentation load from random decks/bot choices: ten visible units, ten cards, repeated ten-target DamageBatchResolved commands every450ms, three60-second runs, then20 SPA scene mount/unmount cycles. It does not substitute a standalone animation for the application benchmark. The small standalone harness separately verifies bounded GSAP hover ownership.

## Reproduce

```sh
API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build
OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_BROWSER=chrome OATHFRONT_BENCHMARK=1 pnpm exec playwright test tests/e2e/performance.spec.ts
```

Use isolated profiles, UI3200/API3101 and oathfront_verification_test. Do not run another Playwright/DB-resetting suite or build concurrently. The production build embeds API_ORIGIN; changing only the server environment does not repair a misbuilt artifact. `OATHFRONT_BENCHMARK_SMOKE=1` selects a2-second/2-cycle instrumentation check; it is not acceptance evidence. Without OATHFRONT_BENCHMARK=1, the costly benchmark is explicitly skipped.

## Device and scope

MSI GL65 Leopard10SCXK; Intel Core i7-10750H2.60GHz,6cores/12threads;16178328kB RAM; powersave governor. Headed isolated Google Chrome155.0.8059.39 uses ANGLE Intel Mesa UHD(CML GT2), Mesa26.0.3, OpenGL ES3.2. NVIDIA GTX1650 is installed but is not the measured renderer. Network is unthrottled local HTTP loopback. Raw inventory/GLX and browser WebGL identity are recorded in hardware.json/performance.json.

Initial shell JS is the deduplicated scripts requested after home network-idle, gzip-compressed from the exact built files. Battle JS is the additional deduplicated scripts requested on entering/animating battle. Assets include requested artwork, atlas, audio and local fonts; inspect images are lazy. This is an observed route workload, not the sum of all possible route assets.

Frame timing is spacing of the timestamp supplied to requestAnimationFrame (first interval excluded), with percentile index floor(N×p). Long tasks are PerformanceObserver durations>50ms during each run. Threshold comparisons round frame values to0.1ms, matching the specification. The rAF timestamp is shared by callbacks in one frame and differs from reading performance.now at callback entry ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)). Neither is a direct GPU/compositor presentation measurement. The separate low-quality diagnostic additionally records callback-entry intervals; it does not replace the primary metric or erase prior failures. CLS conservatively sums non-input layout shifts rather than selecting the largest session window.

Textures are observed WebGL create/delete and texImage2D RGBA allocations, including uploaded atlas and generated textures. They exclude driver/framebuffer overhead, mipmaps not explicitly uploaded, decoded DOM images and audio buffers; therefore this is not total GPU/process memory. Heap uses Chromium Runtime.getHeapUsage after HeapProfiler.collectGarbage at every unmount. No heap-growth threshold is invented; sequence and endpoint delta are reported. Asset pool retains no scene-owned live textures after each teardown.

## Resource decisions

No runtime package was added. Pixi and GSAP remain lazy. Quality low caps renderer resolution at1 with antialias disabled and selects the low asset pool; standard selects high; auto selects low for compact/reduced displays. Quality is presentation-only. A fresh canvas is keyed for explicit quality/reduced/retry recreation, preventing a destroyed WebGL canvas from hanging a new renderer.

Hover/focus owns one reversible GSAP tween per live card, rather than retaining every replaced tween in one context. A200-interaction browser regression verifies bounded retained entries and teardown style restoration. Detached card owners are reverted and removed. Pixi textures, observers and listeners are disposed on unmount; authoritative store/recovery logic is preserved.

The renderer uses shared Graphics effect families, not particle emitters: zero live particle-system particles, within500desktop/200low. The ten-target mass workload draws bounded markers/links from the existing family functions. This is code accounting, not a particle instrumentation claim. Task15 fixed-pool decoded RGBA remains19,967,040B high /10,132,544B low; it is distinct from observed active uploads and total memory.

The initial production run exposed repeated canvas resizes when the fast-forward control appeared/disappeared. A10-second diagnostic recorded86 canvas dimension writes alternating926/970px height. Reserving the44px optional control row keeps the root extent stable. DeckScreen is loaded only when its route renders, removing its eager code from the initial shell.

Budget units are conservatively decimal:300,000B shell,900,000B incremental battle,12,000,000B preload and128,000,000B active atlas textures. Frame thresholds remain16.7/20/33.3ms.

## Results

Final production BUILD_ID `ZipcVWCZHw8l3sc-rmia3`. **The p95 frame budget remains not met on this measured device.** The benchmark deliberately exits1 for that result; other budgets do not erase it. The first shorter profile improved to19.7ms, but that did not persist over the full3×60s measurement. No threshold was relaxed and no unchanged benchmark was repeatedly retried for a favorable sample.

| Run |   Duration | Mass commands | Median |    p95 |    p99 | Long tasks>50ms |
| --- | ---------: | ------------: | -----: | -----: | -----: | --------------: |
| 1   | 60,000.2ms |           133 | 16.7ms | 21.4ms | 23.3ms |               0 |
| 2   | 60,000.2ms |           133 | 16.7ms | 21.7ms | 23.3ms |               0 |
| 3   | 60,000.2ms |           133 | 16.7ms | 22.5ms | 23.5ms |               0 |

| Budget                                       |                   Measured | Outcome                      |
| -------------------------------------------- | -------------------------: | ---------------------------- |
| Initial shell≤300,000B gzip                  |                   264,942B | Pass                         |
| Battle incremental≤900,000B gzip             |                   196,235B | Pass                         |
| Requested assets/fonts≤12,000,000B           |                 8,286,642B | Pass                         |
| Observed active texture uploads≤128,000,000B |                13,487,176B | Pass within accounting scope |
| CLS≤0.1                                      |                   0.004290 | Pass                         |
| Canvas size writes during effects            |              0 in all3runs | Regression fixed             |
| Scene texture teardown                       | 0live after each20unmounts | Pass                         |

Post-GC JS heap was11,424,600B after the first sampled unmount and12,969,008B after the twentieth: +1,544,408B; last10-cycle delta230,224B. The raw20 samples are retained. This is not a zero-growth or general leak-free claim. Native GPU/process memory is not measured by JS heap.

The blank WebGL pacing probe had p9520.4ms while the actual idle battle had16.7ms; neither establishes that the remaining active p95 miss is exclusively environmental. A measured follow-up/acceptance decision remains required. See evidence/task16/performance.json for raw results and the task report for exact source/build boundaries. Development SwiftShader smoke data is retained separately and never described as physical-GPU acceptance. Safari/Edge and physical tablet benchmarks remain awaiting_external_input. Browser UI/focus/history acceptance and manual assistive-technology limits are in accessibility.md.

### Bounded low-quality diagnostic

One additional settings-driven low run on the same artifact/renderer completed60,003.2ms and133commands. Actual cutouts-low.webp was requested. Assets/fonts5,773,010B; activeuploads3,652,680B;0particles,0sizewrites and0longtasks. rAF median16.7/p9521.9/p9923.3ms still fails20ms. Secondary callback-entry intervals were16.8/22.7/25.0ms; these do not replace the primary metric. Raw performance-low-diagnostic.json is separate from the3×60s primary result. Lower asset quality did not close the observed gap.

Launch context: existing GNOME Wayland desktop, DISPLAY=:0 and WAYLAND_DISPLAY=wayland-0, rootless Xwayland present; Playwright channelchrome/headless=false and an isolated temporary profile. No Xvfb or special frame-pacing flags were introduced. Actual Intel hardware rendering does not itself prove physical-display presentation cadence. document.visibilityState/document.hasFocus were not sampled during these recorded runs; monitor output was not independently inspected (xrandr unavailable). The remaining p95 miss is unresolved, not certified as exclusivelyhost or GPU work.

### Final bounded trace

A final10s active trace sampled visibility/focus: visible+focused at start/end, with no intervening change events. Short rAFp95 was19.2ms and callback-entryp9519.5ms; this again does not replace the failed3×60s result. Chrome trace showed Layout71calls/27.86ms total/1.34ms max; Paint119/69.90ms/2.33ms; UpdateLayoutTree52/17.16ms/1.81ms. These are inclusive nested categories, not additive CPU totals. The previous resizeCanvas hotspot was gone. No new concrete small application defect was established.

Chrome BeginFrame events were16.666ms apart; AnimationFrame::Presentation spacing across the trace hadp9521.378ms. The trace includes setup/teardown and browser-internal timing, not an independently measured physical panel. See trace-summary.json for exact fields and raw trace hash. The long primary runs did not capture visibility/focus; this later observation cannot retroactively certify them.

### Open release item PERF-P95-01

**FAILED / OPEN:** the measured Intel/Wayland workload has p95=21.4/21.7/22.5ms against the unchanged20ms target. Median, p99, resource and texture-cleanup passes remain separate results. The controller accepted Task16 implementation as DONE_WITH_CONCERNS because the task requires measurement/comparison and the bounded investigation fixed the attributable defects. This does not waive the target or authorize deployment. Carry PERF-P95-01 into the Task18 release checklist; future performance/device validation is required before an unqualified performance or production-ready claim. Reviewers must assess the implementation and this remaining limit independently.

### Review-fix artifact boundary

Review fix1 produced build `mPRxwzNVtnRYVPLtxR3DM` after restoring8px hand gaps and removing duplicate accessible status text. It was verified with focused layout/accessibility checks and was **not benchmarked**. The measurements above remain attributed to `ZipcVWCZHw8l3sc-rmia3`; PERF-P95-01 stays FAILED/OPEN. See [fix1 evidence](evidence/task16/fix1/README.md) for the distinct source/build boundary.
