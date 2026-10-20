import type { TokenDefinition } from "@oathfront/contracts";
export const tokens: TokenDefinition[] = [
  {
    id: "TK_G_SEED",
    contentVersion: "core_v1",
    type: "TOKEN",
    faction: "GOOD",
    nameVi: "Mầm Đèn",
    printed: {
      attack: 1,
      hp: 1,
    },
    keywords: [],
    tutorialOnly: false,
    artKey: "cards/tk_g_seed.webp",
  },
  {
    id: "TK_G_LANTERN",
    contentVersion: "core_v1",
    type: "TOKEN",
    faction: "GOOD",
    nameVi: "Đèn Gác",
    printed: {
      attack: 0,
      hp: 3,
    },
    keywords: ["SHIELD"],
    tutorialOnly: true,
    artKey: "cards/tk_g_lantern.webp",
  },
  {
    id: "TK_E_CINDER",
    contentVersion: "core_v1",
    type: "TOKEN",
    faction: "EVIL",
    nameVi: "Tàn Quỷ",
    printed: {
      attack: 2,
      hp: 1,
    },
    keywords: [],
    tutorialOnly: false,
    artKey: "cards/tk_e_cinder.webp",
  },
];
