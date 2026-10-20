export type AssetKind =
  | "hero"
  | "card"
  | "power"
  | "token"
  | "terrain"
  | "board"
  | "vfx"
  | "sfx"
  | "music";
export interface AssetFile {
  path: string;
  sha256: string;
  bytes: number;
  width?: number;
  height?: number;
  alpha?: boolean;
}
export interface AssetEntry {
  id: string;
  version: 1;
  kind: AssetKind;
  artKey: string;
  fallbackLabel: string;
  containsRulesText: false;
  source: AssetFile & { promptPath?: string; tool: string };
  provenance: string;
  license: string;
  bounds: { x: number; y: number; width: number; height: number };
  anchor: { x: number; y: number };
  size: { width: number; height: number };
  atlasGroup: string | null;
  exports: Record<string, AssetFile>;
  cutout?: AssetFile;
  signature?: boolean;
}
export interface AssetManifest {
  id: "oathfront-core-art";
  version: 1;
  catalogVersion: "core_v1";
  assets: AssetEntry[];
  atlases: Array<
    AssetFile & {
      frames: Record<
        string,
        { x: number; y: number; width: number; height: number }
      >;
    }
  >;
}
