import manifest from "../../../../public/assets/core-v1/manifest.json" with { type: "json" };

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
  const asset = manifest.assets.find((a) => a.artKey === artKey);
  const variants: Record<string, string | undefined> = asset ?? {};
  return {
    src: variants[variant] ?? `/assets/core-v1/${artKey}`,
    fallbackLabel: fallbackLabel || asset?.fallbackLabel || "Illustration",
    artKey,
  };
}
export function artById(id: string) {
  return manifest.assets.find((a) => a.id === id);
}
export function battleAssetRequests(
  catalogVersion: string,
  quality: AssetQuality,
): string[] {
  if (catalogVersion !== manifest.catalogVersion)
    throw Error("Unsupported art catalog");
  // No PlayerView, lane assignment, seed or unrevealed definition is accepted here.
  return [
    ...manifest.atlases.filter((a) => a.quality === quality).map((a) => a.url),
    ...manifest.assets.filter((a) => a.kind === "terrain").map((a) => a.strip!),
    ...manifest.assets.filter((a) => a.kind === "board").map((a) => a.wide!),
  ];
}
export interface AssetBundle {
  kind: "ILLUSTRATED";
  quality: AssetQuality;
  images: Map<string, HTMLImageElement>;
  atlases: typeof manifest.atlases;
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
    atlases: manifest.atlases.filter((a) => a.quality === quality),
    dispose: () => images.clear(),
  };
}
