import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { publicCatalog } from "../../../apps/api/src/content/registry.js";
import { elementsCatalog } from "../../../packages/game-content/src/index";

import CardVisual, { RarityGem } from "../src/features/content/CardVisual";
import { contentText } from "../src/content/english-content";

it("renders real unit energy, printed stats, full rules and a geometric rarity", async () => {
  const card = elementsCatalog.cards.find((c) => c.type === "UNIT")!;
  const html = renderToStaticMarkup(
    createElement(CardVisual, { definition: card, surface: "inspect" }),
  );
  expect(html).toContain('data-kind="unit"');
  expect(html).toContain(`aria-label="${card.cost} energy"`);
  expect(html).toContain(`aria-label="${card.printed!.attack} attack"`);
  expect(html).toContain(`aria-label="${card.printed!.hp} health"`);
  expect(html).toContain('class="card-face-rules"');
  expect(html).toContain('class="rarity-gem card-rarity-gem"');
  expect(html).not.toMatch(/<(?:div|p|h[1-6]|button)\b/);
});
it("renders trick anatomy without invented attack or health and keeps compact rules accessible", async () => {
  const card = elementsCatalog.cards.find((c) => c.type === "TRICK")!;
  const html = renderToStaticMarkup(
    createElement(CardVisual, { definition: card, surface: "hand" }),
  );
  expect(html).toContain('data-kind="trick"');
  expect(html).toContain(">Trick</span>");
  expect(html).not.toContain('class="card-face-stat');
  expect(html).toContain('class="card-face-rules"');
  expect(html).not.toContain("<button");
});
it("tokens keep printed stats without gaining collectible cost or rarity", async () => {
  const token = elementsCatalog.tokens[0]!;
  const html = renderToStaticMarkup(
    createElement(CardVisual, { definition: token, surface: "inspect" }),
  );
  expect(html).toContain('data-kind="token"');
  expect(html).toContain(">Token</span>");
  expect(html).not.toContain('class="card-face-cost"');
  expect(html).not.toContain('class="rarity-gem card-rarity-gem"');
  expect(html).toContain(`aria-label="${token.printed.hp} health"`);
});
it("rarity shape has an independent accessible code and name for every tier", async () => {
  for (const [rarity, shape, name] of [
    ["U", "triangle", "Uncommon"],
    ["R", "square", "Rare"],
    ["SR", "pentagon", "Super Rare"],
    ["SL", "hexagon", "Super Legendary"],
    ["E", "crest", "Event"],
  ] as const) {
    const html = renderToStaticMarkup(createElement(RarityGem, { rarity }));
    expect(html).toContain(`data-shape="${shape}"`);
    expect(html).toContain(`aria-label="${rarity} · ${name} rarity"`);
  }
});

it("keeps the tutorial token's Shield rule in the full face", () => {
  const token = elementsCatalog.tokens.find((t) => t.id === "TK_G_LANTERN")!;
  const html = renderToStaticMarkup(
    createElement(CardVisual, { definition: token, surface: "inspect" }),
  );
  expect(html).toContain(contentText(token.id));
  expect(html).toContain("Shield. Tutorial only.");
});

it("uses the same rarity geometry in external metadata badges and card sockets", async () => {
  const { RarityBadge } = await import("../src/features/content/ContentBadges");
  for (const [rarity, shape, name] of [
    ["U", "triangle", "Uncommon"],
    ["R", "square", "Rare"],
    ["SR", "pentagon", "Super Rare"],
    ["SL", "hexagon", "Super Legendary"],
    ["E", "crest", "Event"],
  ] as const) {
    const html = renderToStaticMarkup(
      createElement(RarityBadge, { rarity, full: true }),
    );
    expect(html).toContain(`data-shape="${shape}"`);
    expect(html).toContain(`aria-label="${name} rarity"`);
    expect(html).toContain(`${rarity} · ${name}`);
    expect(html).not.toContain("<img");
  }
});

it("deck preview controls announce actual type, rarity and combat metadata", async () => {
  const { default: DeckPreview } =
    await import("../src/features/deck/DeckPreview");
  const unit = elementsCatalog.cards.find(
    (c) => c.type === "UNIT" && c.rarity === "U",
  )!;
  const trick = elementsCatalog.cards.find(
    (c) => c.type === "TRICK" && c.rarity === "U",
  )!;
  const html = renderToStaticMarkup(
    createElement(DeckPreview, {
      entries: [
        { cardId: unit.id, quantity: 2 },
        { cardId: trick.id, quantity: 1 },
      ],
      catalog: publicCatalog("elements_v1"),
    }),
  );
  const labels = [
    ...html.matchAll(/class="deck-preview-card"[^>]*aria-label="([^"]*)"/g),
  ].map((match) => match[1]!);
  const unitLabel = labels.find((label) => label.includes("2 copies"))!;
  expect(unitLabel).toContain("Unit");
  expect(unitLabel).toContain("U · Uncommon rarity");
  expect(unitLabel).toContain(`${unit.printed!.attack} attack`);
  expect(unitLabel).toContain(`${unit.printed!.hp} health`);
  const trickLabel = labels.find((label) => label.includes("1 copies"))!;
  expect(trickLabel).toContain("Trick");
  expect(trickLabel).toContain("U · Uncommon rarity");
  expect(trickLabel).not.toMatch(/attack|health/);
});
