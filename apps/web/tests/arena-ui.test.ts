import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { publicCatalog } from "../../api/src/content/registry";
import InspectPanel from "../src/features/match/InspectPanel";
import HeroPanel from "../src/features/match/HeroPanel";
import { response } from "./fixtures";

it("does not render an inspector when no card or unit is selected", () => {
  const html = renderToStaticMarkup(
    createElement(InspectPanel, {
      view: response().view,
      catalog: publicCatalog(),
      selectedId: null,
      unit: null,
      action: null,
      onCancel() {},
      onConfirm() {},
    }),
  );
  expect(html).toBe("");
});

it("keeps current resources and player-relative hero identity in the HUD", () => {
  const hero = {
    ...response().view.players.EVIL,
    hp: 7,
    energy: { current: 2, max: 5 },
  };
  const html = renderToStaticMarkup(
    createElement(HeroPanel, {
      hero,
      side: "EVIL",
      own: true,
      catalog: publicCatalog(),
      targetable: true,
      onTarget() {},
      onPreview() {},
    }),
  );
  expect(html).toContain('data-own-hero="true"');
  expect(html).toContain('data-hero-side="EVIL"');
  expect(html).toContain("<b>7</b>");
  expect(html).toContain("2 / 5");
  expect(html).toContain('data-legal-target="true"');
});
