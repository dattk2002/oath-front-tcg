import { it, expect, vi } from "vitest";
import {
  createAudioManager,
  restoreSettings,
  defaultSettings,
  soundFamily,
} from "../src/features/settings/audio-manager";
function device() {
  const voices: { started: boolean; stopped: boolean }[] = [];
  const gains: {
    gain: { value: number; setTargetAtTime: (v: number) => void };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  const context = {
    state: "suspended",
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {
      context.state = "running";
    }),
    suspend: vi.fn(async () => {
      context.state = "suspended";
    }),
    close: vi.fn(async () => {
      context.state = "closed";
    }),
    createGain: () => {
      const g = {
        gain: {
          value: 1,
          setTargetAtTime(v: number) {
            this.value = v;
          },
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(g);
      return g;
    },
    createBufferSource: () => {
      const v = { started: false, stopped: false };
      voices.push(v);
      return {
        buffer: null,
        loop: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start() {
          v.started = true;
        },
        stop() {
          v.stopped = true;
        },
        onended: null,
      };
    },
  };
  return {
    voices,
    gains,
    context,
    factory: () => context as unknown as AudioContext,
    assetLoader: vi.fn(async (context: AudioContext, path: string) => {
      expect(context).toBeDefined();
      expect(path).toMatch(/^\/assets\/core-v1\/audio\//);
      return { duration: 1 } as AudioBuffer;
    }),
  };
}
it("never opens or plays before a gesture; independent volumes, mute and dispose control real graph", async () => {
  const d = device(),
    factory = vi.fn(d.factory);
  const audio = createAudioManager({
    contextFactory: factory,
    assetLoader: d.assetLoader,
  });
  audio.setMusic("battle");
  audio.play("draw");
  expect(factory).not.toHaveBeenCalled();
  expect(d.voices).toHaveLength(0);
  expect(d.assetLoader).not.toHaveBeenCalled();
  audio.setMusicVolume(0);
  audio.setSfxVolume(0.6);
  await audio.unlockFromGesture();
  expect(d.assetLoader).toHaveBeenCalledTimes(20);
  expect(
    d.assetLoader.mock.calls.every((call) =>
      String(call[1]).includes("/assets/core-v1/audio/"),
    ),
  ).toBe(true);
  expect(audio.settings.musicVolume).toBe(0);
  expect(audio.settings.sfxVolume).toBe(0.6);
  audio.play("draw");
  expect(d.voices.some((v) => v.started)).toBe(true);
  audio.setMuted(true);
  expect(d.gains[0]!.gain.value).toBe(0);
  expect(d.gains[1]!.gain.value).toBe(0);
  audio.setMuted(false);
  expect(d.gains[0]!.gain.value).toBe(0);
  expect(d.gains[1]!.gain.value).toBe(0.6);
  audio.dispose();
  expect(d.voices.every((v) => v.stopped)).toBe(true);
  expect(d.context.state).toBe("closed");
});
it("hidden/paused playback suspends, resumes after unlock only, and handles device rejection", async () => {
  const d = device(),
    audio = createAudioManager({
      contextFactory: d.factory,
      assetLoader: d.assetLoader,
    });
  await audio.unlockFromGesture();
  audio.setHidden(true);
  expect(d.context.state).toBe("suspended");
  const count = d.voices.length;
  audio.play("damage");
  expect(d.voices).toHaveLength(count);
  audio.setHidden(false);
  await Promise.resolve();
  expect(d.context.state).toBe("running");
  audio.setPaused(true);
  expect(d.context.state).toBe("suspended");
  audio.dispose();
  const failed = createAudioManager({
    contextFactory: () => {
      throw Error("unavailable");
    },
  });
  await expect(failed.unlockFromGesture()).resolves.toBe(false);
  expect(failed.status).toBe("unavailable");
  failed.dispose();
});
it("restores only supported bounded versioned settings and resolves event families", () => {
  expect(
    restoreSettings(
      JSON.stringify({ ...defaultSettings, musicVolume: 0, sfxVolume: 0.6 }),
    ),
  ).toMatchObject({ musicVolume: 0, sfxVolume: 0.6 });
  expect(restoreSettings("{bad")).toEqual(defaultSettings);
  expect(
    restoreSettings(JSON.stringify({ ...defaultSettings, musicVolume: 4 })),
  ).toEqual(defaultSettings);
  expect(soundFamily({ kind: "BlockOccurred" } as never)).toBe("block");
  expect(soundFamily({ kind: "TutorialAdvanced" } as never)).toBeNull();
});
it("does not create late voices after disposal during decoding and reports resume rejection", async () => {
  const d = device();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const audio = createAudioManager({
    contextFactory: d.factory,
    assetLoader: async () => {
      await gate;
      return {} as AudioBuffer;
    },
  });
  const unlocking = audio.unlockFromGesture();
  await Promise.resolve();
  audio.dispose();
  release();
  expect(await unlocking).toBe(false);
  expect(audio.status).toBe("disposed");
  expect(d.voices).toHaveLength(0);
  const rejected = device();
  rejected.context.resume.mockRejectedValueOnce(Error("device suspended"));
  const unavailable = createAudioManager({
    contextFactory: rejected.factory,
    assetLoader: rejected.assetLoader,
  });
  expect(await unavailable.unlockFromGesture()).toBe(false);
  expect(unavailable.status).toBe("unavailable");
  expect(rejected.assetLoader).not.toHaveBeenCalled();
  unavailable.dispose();
});
it("migrates v1 preferences without losing audio or reduced motion and validates quality", () => {
  const old = {
    version: 1,
    musicVolume: 0.1,
    sfxVolume: 0.8,
    muted: true,
    reducedMotion: true,
  };
  expect(restoreSettings(JSON.stringify(old))).toMatchObject({
    ...old,
    motion: "reduced",
    quality: "auto",
  });
  expect(
    restoreSettings(JSON.stringify({ ...old, quality: "low" })).quality,
  ).toBe("low");
  expect(
    restoreSettings(JSON.stringify({ ...old, quality: "invalid" })).quality,
  ).toBe("auto");
});
