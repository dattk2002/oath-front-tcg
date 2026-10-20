import { coreCatalog } from "@oathfront/game-content";
import { output } from "../http.js";
import { hashJson } from "../matches/initialization.js";
export function publicCatalog() {
  return output("PublicCatalog", {
    version: coreCatalog.version,
    rulesVersion: coreCatalog.rulesVersion,
    locationVersion: coreCatalog.locationVersion,
    sha256: hashJson(coreCatalog),
    cards: coreCatalog.cards.map((c) => ({
      id: c.id,
      faction: c.faction,
      classId: c.classId,
      nameVi: c.nameVi,
      cost: c.cost,
      keywords: c.keywords,
      abilities: c.abilities.map((a) => ({
        id: a.id,
        hook: a.hook,
        exactTextVi: a.exactTextVi,
      })),
      exactTextVi: c.exactTextVi,
      artKey: c.artKey,
      type: c.type,
      printed: c.printed,
    })),
    heroes: coreCatalog.heroes.map((h) => ({
      id: h.id,
      faction: h.faction,
      nameVi: h.nameVi,
      classes: h.classes,
      powerIds: h.powerIds,
      titleVi: h.titleVi,
      signaturePowerId: h.signaturePowerId,
      strategyKey: h.strategyKey,
      portraitKey: h.portraitKey,
    })),
    powers: coreCatalog.powers.map((p) => ({
      id: p.id,
      faction: p.faction,
      classId: p.classId,
      signatureOwner: p.signatureOwner,
      type: p.type,
      baseCost: p.baseCost,
      targetKind: p.targetKind,
      nameVi: p.nameVi,
      exactTextVi: p.exactTextVi,
      artKey: p.artKey,
    })),
    locations: coreCatalog.locations.map((l) => ({
      id: l.id,
      nameVi: l.nameVi,
      group: l.group,
      hook: l.hook,
      exactTextVi: l.exactTextVi,
      artKey: l.artKey,
    })),
    tokens: coreCatalog.tokens.map((t) => ({
      id: t.id,
      faction: t.faction,
      nameVi: t.nameVi,
      printed: t.printed,
      tutorialOnly: t.tutorialOnly,
      keywords: t.keywords,
      artKey: t.artKey,
    })),
    presets: coreCatalog.presets,
  });
}
