import { expect, test } from "@playwright/test";

test("one continuous background score survives public pages, game entry and pause", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  const audioRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/assets\/audio-v\d+\/.*\.(flac|wav|mp3)$/.test(request.url()))
      audioRequests.push(request.url());
  });
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    const loops: AudioBufferSourceNode[] = [];
    let stoppedLoops = 0;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
      override createBufferSource() {
        const node = super.createBufferSource();
        const start = node.start.bind(node),
          stop = node.stop.bind(node);
        node.start = (when = 0, offset = 0, duration?: number) => {
          if (node.loop) loops.push(node);
          start(when, offset, duration);
        };
        node.stop = (when = 0) => {
          if (node.loop) stoppedLoops++;
          stop(when);
        };
        return node;
      }
    };
    Reflect.set(window, "backgroundAudioEvidence", () => {
      const loop = loops[0];
      const buffer = loop?.buffer;
      return {
        contexts: contexts.length,
        states: contexts.map((c) => c.state),
        loops: loops.length,
        stoppedLoops,
        time: contexts[0]?.currentTime ?? 0,
        duration: buffer?.duration ?? 0,
        channels: buffer?.numberOfChannels ?? 0,
        sampleRate: buffer?.sampleRate ?? 0,
        loopStart: loop?.loopStart ?? 0,
        loopEnd: loop?.loopEnd ?? 0,
        seam: buffer
          ? Math.max(
              ...Array.from({ length: buffer.numberOfChannels }, (_, c) => {
                const data = buffer.getChannelData(c);
                const start = Math.round(loop!.loopStart * buffer.sampleRate);
                const end = Math.round(loop!.loopEnd * buffer.sampleRate);
                // The tail ends with the head's preceding sample; their next
                // sample is therefore the natural continuation at loopStart.
                return Math.abs(data[start - 1]! - data[end - 1]!);
              }),
            )
          : 1,
      };
    });
  });
  const audio = () =>
    page.evaluate(() => {
      const inspect = Reflect.get(window, "backgroundAudioEvidence") as () => {
        contexts: number;
        states: string[];
        loops: number;
        stoppedLoops: number;
        time: number;
        duration: number;
        channels: number;
        seam: number;
        sampleRate: number;
        loopStart: number;
        loopEnd: number;
      };
      return inspect();
    });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "FIVE LANES. ONE OATH." }),
  ).toBeVisible();
  expect((await audio()).contexts).toBe(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByText("Covert Sabotage · Made with ElevenMusic"),
  ).toBeVisible();
  await expect
    .poll(async () => (await audio()).loops, { timeout: 20000 })
    .toBe(1);
  await page.getByRole("button", { name: "Close settings" }).click();
  const startedAt = (await audio()).time;
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Heroes", exact: true })
    .click();
  await expect(page.locator(".campaign-hero-card").first()).toBeVisible();
  await page.getByRole("link", { name: "Briar — The Rootbound Warden" }).click();
  await expect(
    page.getByRole("heading", { name: "Briar", exact: true }),
  ).toBeVisible();
  expect((await audio()).contexts).toBe(1);
  expect((await audio()).loops).toBe(1);
  expect((await audio()).stoppedLoops).toBe(0);
  expect((await audio()).time).toBeGreaterThan(startedAt);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await audio()).states[0]).toBe("suspended");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await audio()).states[0]).toBe("running");
  expect((await audio()).loops).toBe(1);
  expect((await audio()).stoppedLoops).toBe(0);
  await page.getByRole("button", { name: "Choose deck" }).click();
  await expect(page).toHaveURL(/\/heroes\/H_G_BV\/decks$/);
  expect((await audio()).contexts).toBe(1);
  expect((await audio()).loops).toBe(1);
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("button", { name: "Learn to play", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  expect((await audio()).contexts).toBe(1);
  expect((await audio()).loops).toBe(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(async () => (await audio()).states[0]).toBe("suspended");
  expect((await audio()).stoppedLoops).toBe(0);
  await page
    .getByRole("dialog", { name: "Paused" })
    .getByRole("button", { name: "Continue", exact: true })
    .click();
  await expect.poll(async () => (await audio()).states[0]).toBe("running");
  const result = await audio();
  expect(result.loops).toBe(1);
  expect(result.duration).toBeCloseTo(180.2, 3);
  expect(result.loopStart).toBe(3.528);
  expect(result.loopEnd).toBe(180);
  expect(result.channels).toBe(2);
  expect(result.seam).toBeLessThan(0.01);
  expect(audioRequests).toHaveLength(1);
  expect(audioRequests[0]).toContain("/assets/audio-v3/covert-sabotage-b.mp3");
  expect(errors).toEqual([]);
  await test.info().attach("background-audio.json", {
    body: JSON.stringify({ ...result, audioRequests, errors }, null, 2),
    contentType: "application/json",
  });
});
