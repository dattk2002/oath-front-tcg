import type { VisibleEvent } from "@oathfront/contracts";
export interface Settings {
  version: 1;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  reducedMotion: boolean;
}
export const defaultSettings: Settings = {
  version: 1,
  musicVolume: 0.3,
  sfxVolume: 0.6,
  muted: false,
  reducedMotion: false,
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
      };
  } catch {
    /* Corrupt/old preferences fall back without blocking play. */
  }
  return { ...defaultSettings };
}
function validVolume(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}
/** Procedural audition palette; Task15 replaces these temporary tones with authored assets. */
const families = {
  draw: 523,
  deploy: 330,
  trick: 622,
  attack: 196,
  damage: 110,
  shield: 784,
  armor: 147,
  death: 82,
  move: 392,
  stats: 440,
  status: 277,
  location: 659,
  power: 698,
  signature: 880,
  block: 988,
  heal: 587,
  phase: 262,
  result: 1047,
} as const;
export type SoundFamily = keyof typeof families;
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
  options: { contextFactory?: () => AudioContext; settings?: Settings } = {},
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
  const voices = new Set<OscillatorNode>(),
    music = new Set<OscillatorNode>();
  function stop(set: Set<OscillatorNode>) {
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
  function tone(frequency: number, gain: GainNode, duration?: number) {
    if (!context) return;
    const oscillator = context.createOscillator(),
      envelope = context.createGain();
    oscillator.type = duration ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    envelope.gain.value = duration ? 0.09 : 0.018;
    oscillator.connect(envelope);
    envelope.connect(gain);
    voices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      voices.delete(oscillator);
      music.delete(oscillator);
    };
    oscillator.start();
    if (duration) {
      envelope.gain.setTargetAtTime(0, context.currentTime + 0.02, 0.06);
      oscillator.stop(context.currentTime + duration);
    } else music.add(oscillator);
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
    for (const f of track === "menu"
      ? [130.81, 164.81, 196]
      : [110, 130.81, 164.81])
      tone(f, musicGain);
  }
  async function sync() {
    if (!context || !unlocked || disposed) return;
    try {
      if (paused || hidden) {
        stop(voices);
        music.clear();
        await context.suspend();
      } else {
        await context.resume();
        if (!disposed && !paused && !hidden) startMusic();
      }
    } catch {
      status = "unavailable";
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
        await sync();
        if (!disposed && status !== "unavailable") status = "ready";
        return status === "ready";
      } catch {
        status = "unavailable";
        return false;
      }
    },
    setMusicVolume(v) {
      if (!validVolume(v)) return;
      settings.musicVolume = v;
      gains();
      startMusic();
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
        tone(families[family], sfxGain, 0.24);
      } catch {
        status = "unavailable";
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop(voices);
      music.clear();
      musicGain?.disconnect();
      sfxGain?.disconnect();
      void context?.close().catch(() => {});
      status = "disposed";
    },
  };
}
