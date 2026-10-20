import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createAudioManager,
  defaultSettings,
  restoreSettings,
  settingsKey,
  type AudioManager,
  type Settings,
} from "./audio-manager";
import { openDialog } from "../match/keyboard";
const Context = createContext<{
  audio: AudioManager | null;
  settings: Settings;
  update: (s: Partial<Settings>) => void;
  warning: string;
}>({ audio: null, settings: defaultSettings, update: () => {}, warning: "" });
export const useSettings = () => useContext(Context);
export function SettingsProvider({
  children,
  match = false,
}: {
  children: ReactNode;
  match?: boolean;
}) {
  const [settings, setSettings] = useState(defaultSettings),
    [audio, setAudio] = useState<AudioManager | null>(null),
    [warning, setWarning] = useState("");
  const manager = useRef<AudioManager | null>(null);
  useEffect(() => {
    let initial = defaultSettings;
    try {
      initial = restoreSettings(localStorage.getItem(settingsKey));
    } catch {
      setWarning(
        "Không truy cập được bộ nhớ thiết bị. Cài đặt chỉ giữ trong trang này.",
      );
    }
    setSettings(initial);
    const a = createAudioManager({ settings: initial });
    manager.current = a;
    setAudio(a);
    const unlock = (e: Event) => {
      if (!e.isTrusted) return;
      void a.unlockFromGesture().then((ok) => {
        if (!ok)
          setWarning("Âm thanh không khả dụng. Bạn vẫn có thể tiếp tục chơi.");
      });
    };
    const visibility = () => a.setHidden(document.hidden);
    visibility();
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", visibility);
      a.dispose();
      manager.current = null;
    };
  }, []);
  useEffect(() => {
    audio?.setMusic(match ? "battle" : "menu");
  }, [audio, match]);
  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch, version: 1 as const };
    setSettings(next);
    const a = manager.current;
    if (patch.musicVolume !== undefined) a?.setMusicVolume(next.musicVolume);
    if (patch.sfxVolume !== undefined) a?.setSfxVolume(next.sfxVolume);
    if (patch.muted !== undefined) a?.setMuted(next.muted);
    try {
      localStorage.setItem(settingsKey, JSON.stringify(next));
    } catch {
      setWarning(
        "Không lưu được cài đặt. Lựa chọn hiện tại vẫn áp dụng trong trang này.",
      );
    }
  }
  return (
    <Context.Provider value={{ audio, settings, update, warning }}>
      {children}
    </Context.Provider>
  );
}
export default function SettingsDialog({
  onClose,
  onTutorial,
}: {
  onClose: () => void;
  onTutorial?: (side: "GOOD" | "EVIL") => void;
}) {
  const { settings, update, warning } = useSettings();
  const ref = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => openDialog(ref.current!, heading.current), []);
  return (
    <dialog
      ref={ref}
      className="match-dialog panel settings-dialog"
      aria-labelledby="settings-heading"
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <h2 ref={heading} tabIndex={-1} id="settings-heading">
        Cài đặt
      </h2>
      <label className="setting-toggle">
        <input
          type="checkbox"
          checked={settings.muted}
          onChange={(e) => update({ muted: e.target.checked })}
        />
        Tắt toàn bộ âm thanh
      </label>
      <label>
        Nhạc <output>{Math.round(settings.musicVolume * 100)}%</output>
        <input
          aria-label="Nhạc"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.musicVolume}
          onChange={(e) => update({ musicVolume: Number(e.target.value) })}
        />
      </label>
      <label>
        Hiệu ứng âm thanh{" "}
        <output>{Math.round(settings.sfxVolume * 100)}%</output>
        <input
          aria-label="Hiệu ứng âm thanh"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.sfxVolume}
          onChange={(e) => update({ sfxVolume: Number(e.target.value) })}
        />
      </label>
      <label className="setting-toggle">
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={(e) => update({ reducedMotion: e.target.checked })}
        />
        Giảm chuyển động
      </label>
      <p className="muted">
        Luôn tôn trọng cài đặt giảm chuyển động của thiết bị.
      </p>
      {onTutorial && (
        <div className="settings-tutorial">
          <h3>Hướng dẫn</h3>
          <button
            onClick={() => {
              onClose();
              onTutorial("GOOD");
            }}
          >
            Học lại phe Thiện
          </button>
          <button
            onClick={() => {
              onClose();
              onTutorial("EVIL");
            }}
          >
            Học phe Ác
          </button>
        </div>
      )}
      {warning && <p role="status">{warning}</p>}
      <button className="primary" onClick={onClose}>
        Đóng cài đặt
      </button>
    </dialog>
  );
}
