import type {
  CreateMatchRequest,
  HeroId,
  PresetDTO,
} from "@oathfront/contracts";
import { validateBrowserWire } from "@oathfront/contracts/browser";
export interface PendingCreate {
  request: CreateMatchRequest;
  heroId: HeroId | null;
}
export function restorePresetCreate(
  presets: readonly Pick<PresetDTO, "presetId" | "heroId">[],
  storage: Pick<Storage, "getItem">,
  contentVersion: string,
): PendingCreate | null {
  try {
    const request: unknown = JSON.parse(
      storage.getItem("oathfront.create") ?? "null",
    );
    if (!validateBrowserWire("CreateMatchRequest", request)) return null;
    const presetId =
      request.mode === "SKIRMISH" && request.deck.kind === "PRESET"
        ? request.deck.presetId
        : null;
    return {
      request,
      heroId:
        request.mode === "SKIRMISH" &&
        request.expectedContentVersion === contentVersion
          ? (presets.find((preset) => preset.presetId === presetId)?.heroId ??
            null)
          : null,
    };
  } catch {
    return null;
  }
}
