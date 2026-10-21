import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { coreCatalog } from "../../../packages/game-content/src/catalog";
import { publicCatalog } from "../../../apps/api/src/content/registry";
import { response } from "./fixtures";
import { deckDisplayName } from "../src/content/english-content";
import { historyResultLabel } from "../src/features/history/HistoryScreen";
import HeroPanel from "../src/features/match/HeroPanel";
import Board from "../src/features/match/Board";
import { retryArtLabel } from "../src/features/match/ArtImage";
import { resolveArt } from "../src/features/match/rendering/asset-manifest";
import { isRecoveryFailureMessage } from "../src/features/match/recovery";
const catalog = publicCatalog();

describe("English presentation at legacy display boundaries", () => {
  it("shows a preset by stable ID while preserving historical and custom saved names", () => {
    const preset = coreCatalog.presets.find(
      (item) => item.presetId === "D_G_BV",
    )!;
    expect(preset.name).toBe("An Nhiên");
    expect(
      deckDisplayName({
        kind: "PRESET",
        presetId: preset.presetId,
        name: preset.name,
      }),
    ).toBe("Resilient Garden");
    expect(deckDisplayName({ kind: "SAVED", name: "Vườn của tôi" })).toBe(
      "Vườn của tôi",
    );
    expect(preset.name).toBe("An Nhiên");
  });
  it("labels a completed loss in history and resource counts in the hero HUD", () => {
    expect(
      historyResultLabel({
        resumable: false,
        lifecycle: "COMPLETED",
        outcome: { result: "LOSS", winner: "EVIL", reason: "HERO_DEFEATED" },
      }),
    ).toBe("Loss");
    const view = response().view;
    const markup = renderToStaticMarkup(
      createElement(HeroPanel, {
        hero: view.players.GOOD,
        side: "GOOD",
        own: true,
        catalog,
        targetable: false,
        onTarget: () => {},
        onPreview: () => {},
      }),
    );
    expect(markup).toContain("Hand 1 · Deck 26 · Power 0");
  });
  it("gives lane and artwork retry actions spaced accessible names", () => {
    const view = response().view;
    const markup = renderToStaticMarkup(
      createElement(Board, {
        view,
        catalog,
        actions: view.legalActions,
        selectedUnit: null,
        disabled: false,
        onTarget: () => {},
        onInspect: () => {},
        onPreview: () => {},
      }),
    );
    expect(markup).toContain('aria-label="Choose lane 1, legal target"');
    expect(retryArtLabel("Briar")).toBe("Retry art Briar");
  });
  it("never exposes a historical manifest label when the caller supplies no art name", () => {
    expect(resolveArt("cards/gc01.webp", "").fallbackLabel).toBe(
      "Illustration",
    );
  });
  it("recognizes only current recovery failures for clearing after a successful reconnect", () => {
    expect(
      isRecoveryFailureMessage(
        "The latest board could not be loaded. Reconnect to retry.",
      ),
    ).toBe(true);
    expect(
      isRecoveryFailureMessage(
        "The battle log is incomplete. Reconnect to restore it.",
      ),
    ).toBe(true);
    expect(
      isRecoveryFailureMessage(
        "Send result is unconfirmed. Retry the same request to confirm.",
      ),
    ).toBe(false);
  });
});
