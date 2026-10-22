import heroPresentation from "../../../../public/assets/heroes-v4/manifest.json" with { type: "json" };
import manifest from "../../../../public/assets/core-v1/manifest.json" with { type: "json" };

import presentation from "../../../../public/assets/rivals-v2/manifest.json" with { type: "json" };
import cardPresentation from "../../../../public/assets/fivefold-cards-v3/manifest.json" with { type: "json" };

export type AssetQuality = "low" | "high";
export interface ArtReference {
  src: string;
  fallbackLabel: string;
  artKey: string;
}
export function resolveArt(
  artKey: string,
  fallbackLabel: string,
  variant = "thumb",
): ArtReference {
  const core = manifest.assets.find((a) => a.artKey === artKey);
  const signatureHero = artKey.startsWith("powers/s_")
    ? heroPresentation.assets.find(
        (a) =>
          a.id.toLowerCase() ===
          artKey
            .split("/")[1]
            ?.replace(/\.webp$/, "")
            .replace(/^s_/, "h_"),
      )
    : undefined;
  const override =
    heroPresentation.assets.find((a) => a.artKey === artKey) ??
    signatureHero ??
    cardPresentation.assets.find((a) => a.artKey === artKey) ??
    presentation.assets.find((a) => a.artKey === artKey);
  const asset = { ...core, ...override };
  const variants: Record<string, string | undefined> = asset ?? {};
  return {
    src: variants[variant] ?? `/assets/core-v1/${artKey}`,
    fallbackLabel: fallbackLabel || "Illustration",
    artKey,
  };
}
export function artById(
  id: string,
): Record<string, string | undefined> | undefined {
  const core = manifest.assets.find((a) => a.id === id);
  const hero = heroPresentation.assets.find((a) => a.id === id);
  return core || hero
    ? {
        ...core,
        ...presentation.assets.find((a) => a.id === id),
        ...cardPresentation.assets.find((a) => a.id === id),
        ...hero,
      }
    : undefined;
}
export function battleAssetRequests(
  catalogVersion: string,
  quality: AssetQuality,
): string[] {
  if (
    ![manifest.catalogVersion, heroPresentation.catalogVersion].includes(
      catalogVersion,
    )
  )
    throw Error("Unsupported art catalog");
  // No PlayerView, lane assignment, seed or unrevealed definition is accepted here.
  return [
    ...cardPresentation.atlases
      .filter((a) => a.quality === quality)
      .map((a) => a.url),
    ...manifest.assets.filter((a) => a.kind === "terrain").map((a) => a.strip!),
    ...manifest.assets
      .filter((a) => a.kind === "board")
      .map((a) => artById(a.id)!.wide!),
  ];
}
export interface AssetBundle {
  kind: "ILLUSTRATED";
  quality: AssetQuality;
  images: Map<string, HTMLImageElement>;
  atlases: typeof cardPresentation.atlases;
  dispose(): void;
}
export async function loadBattleAssets(
  catalogVersion: string,
  quality: AssetQuality,
  onProgress: (loaded: number, total: number) => void = () => {},
): Promise<AssetBundle> {
  const requests = battleAssetRequests(catalogVersion, quality);
  const images = new Map<string, HTMLImageElement>();
  let loaded = 0;
  await Promise.all(
    requests.map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const image = new Image();
          const timeout = window.setTimeout(
            () => finish(Error(`Asset timed out: ${src}`)),
            8000,
          );
          function finish(error?: Error) {
            window.clearTimeout(timeout);
            image.onload = null;
            image.onerror = null;
            if (error) {
              reject(error);
              return;
            }
            images.set(src, image);
            onProgress(++loaded, requests.length);
            resolve();
          }
          image.onload = () => finish();
          image.onerror = () => finish(Error(`Asset unavailable: ${src}`));
          image.src = src;
        }),
    ),
  );
  return {
    kind: "ILLUSTRATED",
    quality,
    images,
    atlases: cardPresentation.atlases.filter((a) => a.quality === quality),
    dispose: () => images.clear(),
  };
}
