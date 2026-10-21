"use client";
import { useState } from "react";

export function CampaignArtwork({
  src,
  alt,
  className = "",
  eager = false,
  retry = false,
  sizes,
  srcSet,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  retry?: boolean;
  sizes?: string;
  srcSet?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = failedSource === src;
  return (
    <span className={`campaign-artwork ${className}`}>
      {failed ? (
        <span
          className="campaign-art-fallback"
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
        >
          <span>
            {alt ? `${alt} — artwork unavailable` : "Artwork unavailable"}
          </span>
          {retry && (
            <button type="button" onClick={() => setFailedSource(null)}>
              Retry artwork
            </button>
          )}
        </span>
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          onError={() => setFailedSource(src)}
        />
      )}
    </span>
  );
}
