import { useState } from "react";
import { resolveArt } from "./rendering/asset-manifest";

/** Fixed-size decorative art; semantic names/rules always remain in the parent UI. */
export default function ArtImage({
  artKey,
  name,
  variant = "thumb",
  retry = true,
  eager = false,
}: {
  artKey: string;
  name: string;
  variant?: string;
  retry?: boolean;
  eager?: boolean;
}) {
  const [failedKey, setFailedKey] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
  const art = resolveArt(artKey, name, variant);
  return failedKey === art.src ? (
    <span className="art-fallback" data-art-fallback={artKey}>
      <span className="silhouette" aria-hidden="true" />
      <span>{art.fallbackLabel}</span>
      {retry && (
        <button
          type="button"
          aria-label={`Retry art${name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setAttempt((n) => n + 1);
            setFailedKey(null);
          }}
        >
          Retry art
        </button>
      )}
    </span>
  ) : (
    // Original art is already exported to bounded WebP sizes; no remote optimizer needed.
    <img
      key={`${art.src}:${attempt}`}
      className="asset-image"
      data-art-key={artKey}
      src={attempt ? `${art.src}?retry=${attempt}` : art.src}
      alt=""
      width={
        variant === "hud"
          ? 128
          : variant === "inspect" || variant === "bust" || variant === "cutout"
            ? 512
            : 256
      }
      height={
        variant === "hud"
          ? 128
          : variant === "inspect" || variant === "bust" || variant === "cutout"
            ? 512
            : 256
      }
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailedKey(art.src)}
    />
  );
}
