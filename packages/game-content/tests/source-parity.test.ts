import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { coreCatalog } from "../src/catalog.js";
const rows = (file: string) =>
  readFileSync(new URL("../../../docs/" + file, import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll("`", "")),
    );
it("preserves the exact approved card names, costs, stats and Vietnamese rules text", () => {
  const source = rows("CARDS.md").filter((r) =>
    /^(GC|EC|[BVPFXS])\d\d$/.test(r[0]!),
  );
  expect(source).toHaveLength(60);
  for (const [id, name, type, cost, stats, text] of source) {
    const card = coreCatalog.cards.find((c) => c.id === id)!;
    expect(card, id).toMatchObject({
      nameVi: name,
      type: type === "U" ? "UNIT" : "TRICK",
      cost: Number(cost),
      exactTextVi: text,
    });
    expect(card.printed, id).toEqual(
      type === "U"
        ? {
            attack: Number(stats!.split("/")[0]),
            hp: Number(stats!.split("/")[1]),
          }
        : null,
    );
  }
});
it("preserves every power, hero, token and Location from CONTENT", () => {
  for (const [id, nameOrOwner, third, fourth, fifth] of rows("CONTENT.md")) {
    if (id!.startsWith("P_") || id!.startsWith("S_")) {
      const power = coreCatalog.powers.find((p) => p.id === id)!;
      expect(power, id).toMatchObject({
        nameVi: third,
        exactTextVi: fourth,
        baseCost: 1,
      });
      expect(power.classId ?? power.signatureOwner).toBe(nameOrOwner);
    } else if (id!.startsWith("H_")) {
      const hero = coreCatalog.heroes.find((h) => h.id === id)!;
      expect(hero, id).toMatchObject({
        nameVi: nameOrOwner!.split(" — ")[0],
        titleVi: nameOrOwner!.split(" — ")[1],
        classes: third!.split(", "),
        powerIds: fifth!.split(", "),
      });
    } else if (id!.startsWith("TK_")) {
      expect(
        coreCatalog.tokens.find((t) => t.id === id),
        id,
      ).toMatchObject({
        nameVi: nameOrOwner,
        faction: third,
        printed: {
          attack: Number(fourth!.split("/")[0]),
          hp: Number(fourth!.split("/")[1]),
        },
        keywords: fifth === "Khiên" ? ["SHIELD"] : [],
      });
    } else if (coreCatalog.locations.some((l) => l.id === id)) {
      expect(
        coreCatalog.locations.find((l) => l.id === id),
        id,
      ).toMatchObject({
        nameVi: nameOrOwner,
        group: third,
        hook: fourth,
        exactTextVi: fifth,
      });
    }
  }
});
it("preserves all six 30-card preset lists exactly", () => {
  const source = rows("DECKS.md").filter((r) => r[0]!.startsWith("D_"));
  expect(source).toHaveLength(6);
  for (const [id, heroId, ids] of source) {
    expect(
      coreCatalog.presets.find((d) => d.presetId === id),
      id,
    ).toMatchObject({
      heroId,
      entries: ids!.split(", ").map((cardId) => ({ cardId, quantity: 2 })),
    });
  }
});
it("encodes ordered multi-part effects and once-per-turn limits for engine consumers", () => {
  expect(coreCatalog.powers.find((p) => p.id === "S_E_FX")!.effects).toEqual([
    {
      kind: "DAMAGE",
      targets: "ALL_ENEMY_UNITS",
      amount: 1,
      damageKind: "EFFECT",
    },
    { kind: "DAMAGE", targets: "ENEMY_HERO", amount: 2, damageKind: "EFFECT" },
  ]);
  expect(coreCatalog.cards.find((c) => c.id === "B08")!.effects).toEqual([
    {
      kind: "DAMAGE",
      targets: "SELECTED_UNIT",
      amount: 3,
      damageKind: "EFFECT",
    },
    {
      kind: "MODIFY_STATS",
      targets: "SELECTED_UNIT",
      attackDelta: -1,
      healthDelta: 0,
      duration: "TURN_END",
    },
  ]);
  for (const id of ["B04", "F03", "X03"])
    expect(
      coreCatalog.cards.find((c) => c.id === id)!.abilities[0]!.limit,
    ).toMatchObject({ scope: "GLOBAL_TURN", count: 1 });
  expect(coreCatalog.cards.find((c) => c.id === "F07")!.targeting.kind).toBe(
    "ALLY_UNIT",
  );
});
