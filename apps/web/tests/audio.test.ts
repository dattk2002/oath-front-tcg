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
    createOscillator: () => {
      const v = { started: false, stopped: false };
      voices.push(v);
      return {
        type: "sine",
        frequency: { value: 440 },
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
  };
}
it("never opens or plays before a gesture; independent volumes, mute and dispose control real graph", async () => {
  const d = device(),
    factory = vi.fn(d.factory);
  const audio = createAudioManager({ contextFactory: factory });
  audio.setMusic("battle");
  audio.play("draw");
  expect(factory).not.toHaveBeenCalled();
  expect(d.voices).toHaveLength(0);
  audio.setMusicVolume(0);
  audio.setSfxVolume(0.6);
  await audio.unlockFromGesture();
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
    audio = createAudioManager({ contextFactory: d.factory });
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
