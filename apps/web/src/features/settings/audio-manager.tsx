import type { VisibleEvent } from "@oathfront/contracts";
export interface Settings {
  version: 1;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  motion: "system" | "reduced";
  quality: "auto" | "low" | "standard";
}
export const defaultSettings: Settings = {
  version: 1,
  musicVolume: 0.3,
  sfxVolume: 0.6,
  muted: false,
  reducedMotion: false,
  motion: "system",
  quality: "auto",
};
export const settingsKey = "oathfront.settings.v1";
export function restoreSettings(raw: string | null): Settings {
  try {
    const s: unknown = JSON.parse(raw ?? "null");
    if (
      s &&
      typeof s === "object" &&
      "version" in s &&
      s.version === 1 &&
      "musicVolume" in s &&
      validVolume(s.musicVolume) &&
      "sfxVolume" in s &&
      validVolume(s.sfxVolume) &&
      "muted" in s &&
      typeof s.muted === "boolean" &&
      "reducedMotion" in s &&
      typeof s.reducedMotion === "boolean"
    )
      return {
        version: 1,
        musicVolume: s.musicVolume,
        sfxVolume: s.sfxVolume,
        muted: s.muted,
        reducedMotion: s.reducedMotion,
        motion: s.reducedMotion ? "reduced" : "system",
        quality:
          "quality" in s && (s.quality === "low" || s.quality === "standard")
            ? s.quality
            : "auto",
      };
  } catch {
    /* Corrupt/old preferences fall back without blocking play. */
  }
  return { ...defaultSettings };
}
function validVolume(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}
/** Authored multi-layer SFX assets; mapping remains the Task14 event contract. */
export const soundFamilies = [
  "draw",
  "deploy",
  "trick",
  "attack",
  "damage",
  "shield",
  "armor",
  "death",
  "move",
  "stats",
  "status",
  "location",
  "power",
  "signature",
  "block",
  "heal",
  "phase",
  "result",
] as const;
export type SoundFamily = (typeof soundFamilies)[number];
export function soundFamily(e: VisibleEvent): SoundFamily | null {
  switch (e.kind) {
    case "CardDrawn":
      return "draw";
    case "UnitCreated":
      return "deploy";
    case "CardPlayed":
      return "trick";
    case "AttackDeclared":
      return "attack";
    case "DamageBatchResolved":
      return e.payload.packets.some((p) => p.shieldConsumed)
        ? "shield"
        : e.payload.packets.some((p) => p.mitigatedDamage > 0)
          ? "armor"
          : "damage";
    case "UnitDestroyed":
      return "death";
    case "UnitMoved":
      return "move";
    case "StatsChanged":
      return "stats";
    case "StatusChanged":
      return "status";
    case "LocationRevealed":
      return "location";
    case "PowerUsed":
      return e.payload.definitionId.startsWith("S_") ? "signature" : "power";
    case "BlockOccurred":
      return "block";
    case "HeroHealed":
      return "heal";
    case "PhaseChanged":
      return "phase";
    case "MatchEnded":
      return "result";
    default:
      return null;
  }
}
export interface AudioManager {
  readonly settings: Settings;
  readonly status: "locked" | "ready" | "unavailable" | "disposed";
  unlockFromGesture(): Promise<boolean>;
  setMusicVolume(value: number): void;
  setSfxVolume(value: number): void;
  setMuted(value: boolean): void;
  setMusic(track: "menu" | "battle"): void;
  setPaused(value: boolean): void;
  setHidden(value: boolean): void;
  play(family: SoundFamily): void;
  dispose(): void;
}
export function createAudioManager(
  options: {
    contextFactory?: () => AudioContext;
    settings?: Settings;
    assetLoader?: (context: AudioContext, path: string) => Promise<AudioBuffer>;
  } = {},
): AudioManager {
  const settings = { ...(options.settings ?? defaultSettings) };
  let context: AudioContext | null = null,
    musicGain: GainNode | null = null,
    sfxGain: GainNode | null = null;
  let status: AudioManager["status"] = "locked",
    unlocked = false,
    disposed = false,
    paused = false,
    hidden = false,
    track: "menu" | "battle" = "menu";
  let loading: Promise<void> | null = null;
  const buffers = new Map<string, AudioBuffer>();
  const voices = new Set<AudioBufferSourceNode>(),
    music = new Set<AudioBufferSourceNode>();
  function stop(set: Set<AudioBufferSourceNode>) {
    for (const voice of set) {
      try {
        voice.stop();
        voice.disconnect();
      } catch {
        /* Already ended. */
      }
      voices.delete(voice);
    }
    set.clear();
  }
  function gains() {
    if (musicGain)
      musicGain.gain.value = settings.muted ? 0 : settings.musicVolume;
    if (sfxGain) sfxGain.gain.value = settings.muted ? 0 : settings.sfxVolume;
  }
  async function loadAssets() {
    if (!context) return;
    const ctx = context;
    const loader =
      options.assetLoader ??
      (async (device: AudioContext, path: string) => {
        const response = await fetch(path);
        if (!response.ok) throw Error(`Audio asset ${response.status}`);
        return device.decodeAudioData(await response.arrayBuffer());
      });
    await Promise.all(
      [...soundFamilies, "menu", "battle"].map(async (key) => {
        if (buffers.has(key)) return;
        const buffer = await loader(
          ctx,
          `/assets/core-v1/audio/${key}.${key === "menu" || key === "battle" ? "wav" : "mp3"}`,
        );
        if (!disposed) buffers.set(key, buffer);
      }),
    );
  }
  function voice(key: string, gain: GainNode, loop: boolean) {
    const buffer = buffers.get(key);
    if (!context || !buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(gain);
    voices.add(source);
    if (loop) music.add(source);
    source.onended = () => {
      source.disconnect();
      voices.delete(source);
      music.delete(source);
    };
    source.start();
  }
  function startMusic() {
    stop(music);
    if (
      !context ||
      !musicGain ||
      !unlocked ||
      paused ||
      hidden ||
      disposed ||
      settings.muted ||
      settings.musicVolume === 0
    )
      return;
    voice(track, musicGain, true);
  }
  async function sync(): Promise<boolean> {
    if (!context || !unlocked || disposed) return false;
    try {
      if (paused || hidden) {
        stop(voices);
        music.clear();
        await context.suspend();
      } else {
        await context.resume();
        if (!disposed && !paused && !hidden) startMusic();
      }
      return true;
    } catch {
      status = "unavailable";
      return false;
    }
  }
  return {
    get settings() {
      return { ...settings };
    },
    get status() {
      return status;
    },
    async unlockFromGesture() {
      if (disposed) return false;
      if (unlocked && status === "ready") return true;
      try {
        if (!context) {
          context = (options.contextFactory ?? (() => new AudioContext()))();
          musicGain = context.createGain();
          sfxGain = context.createGain();
          musicGain.connect(context.destination);
          sfxGain.connect(context.destination);
          gains();
        }
        unlocked = true;
        status = "locked";
        // resume() runs synchronously in the gesture chain, before network decoding.
        if (!(await sync())) return false;
        loading ??= loadAssets().finally(() => {
          loading = null;
        });
        await loading;
        if (disposed) return false;
        status = "ready";
        startMusic();
        return true;
      } catch {
        if (!disposed) status = "unavailable";
        return false;
      }
    },
    setMusicVolume(v) {
      if (!validVolume(v)) return;
      settings.musicVolume = v;
      gains();
      if (!music.size) startMusic();
    },
    setSfxVolume(v) {
      if (!validVolume(v)) return;
      settings.sfxVolume = v;
      gains();
    },
    setMuted(v) {
      settings.muted = v;
      gains();
      if (v) {
        stop(voices);
        music.clear();
      } else startMusic();
    },
    setMusic(v) {
      if (track === v) return;
      track = v;
      startMusic();
    },
    setPaused(v) {
      if (paused === v) return;
      paused = v;
      void sync();
    },
    setHidden(v) {
      if (hidden === v) return;
      hidden = v;
      void sync();
    },
    play(family) {
      if (
        !unlocked ||
        !context ||
        !sfxGain ||
        paused ||
        hidden ||
        disposed ||
        settings.muted ||
        settings.sfxVolume === 0 ||
        status !== "ready"
      )
        return;
      try {
        voice(family, sfxGain, false);
      } catch {
        status = "unavailable";
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop(voices);
      music.clear();
      buffers.clear();
      musicGain?.disconnect();
      sfxGain?.disconnect();
      void context?.close().catch(() => {});
      status = "disposed";
    },
  };
}
