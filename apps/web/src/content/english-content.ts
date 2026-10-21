/** English presentation only. Never rewrite versioned content, wire objects or saved user text. */
export type EnglishContentEntry = Readonly<{
  name: string;
  title?: string;
  text?: string;
}>;
export const englishContent: Readonly<Record<string, EnglishContentEntry>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries({
        H_G_BV: {
          name: "Briar",
          title: "The Living Bastion",
        },
        H_G_BP: {
          name: "Aster",
          title: "The Prism Sentinel",
        },
        H_G_VP: {
          name: "Lumen",
          title: "The Lightweaver",
        },
        H_E_FX: {
          name: "Cinder",
          title: "The Furnace King",
        },
        H_E_FS: {
          name: "Vesper",
          title: "The Duskblade",
        },
        H_E_XS: {
          name: "Morrow",
          title: "The Hex Architect",
        },
        GC01: {
          name: "Lanternkeeper",
          text: "No abilities.",
        },
        GC02: {
          name: "Leaf Knight",
          text: "No abilities.",
        },
        GC03: {
          name: "Dawn Herald",
          text: "On play: draw 1 card.",
        },
        GC04: {
          name: "Garden Bell",
          text: "When destroyed: heal your hero for 2 HP.",
        },
        GC05: {
          name: "Lantern Ray",
          text: "Deal 2 damage to an enemy unit.",
        },
        GC06: {
          name: "Pack Supplies",
          text: "Draw 2 cards.",
        },
        B01: {
          name: "Shieldseed",
          text: "Shield.",
        },
        B02: {
          name: "Timber Gatekeeper",
          text: "Armor.",
        },
        B03: {
          name: "Bronze Shieldsmith",
          text: "On play: grant Shield to allied units in the two adjacent lanes.",
        },
        B04: {
          name: "Bellguard",
          text: "When damaged, once per turn: heal your hero for 1 HP.",
        },
        B05: {
          name: "Citadel Warden",
          text: "Armor.",
        },
        B06: {
          name: "Raise Shields",
          text: "Grant Shield to an allied unit.",
        },
        B07: {
          name: "Reinforce",
          text: "An allied unit gains +0/+3 permanently.",
        },
        B08: {
          name: "Repel",
          text: "Deal 3 damage to an enemy unit. It has −1 ATK this turn.",
        },
        V01: {
          name: "Seed Tender",
          text: "On play: heal your hero for 1 HP.",
        },
        V02: {
          name: "Moss Stag",
          text: "At turn end: heal this unit for 1 HP.",
        },
        V03: {
          name: "Dew Gatherer",
          text: "On play: heal your hero for 2 HP.",
        },
        V04: {
          name: "Lantern Tree",
          text: "When destroyed: summon a 1/1 Lantern Sprout here if your slot is empty.",
        },
        V05: {
          name: "Elderwood Spirit",
          text: "At turn end: heal all allied units for 1 HP.",
        },
        V06: {
          name: "New Growth",
          text: "An allied unit gains +1/+2 permanently.",
        },
        V07: {
          name: "Springflow",
          text: "Heal your hero for 4 HP.",
        },
        V08: {
          name: "Sow Lanterns",
          text: "Summon a 1/1 Lantern Sprout in an empty lane on your side.",
        },
        P01: {
          name: "Mirrorbird",
          text: "No abilities.",
        },
        P02: {
          name: "Pathlighter",
          text: "On play: the enemy unit here has −1 ATK this turn.",
        },
        P03: {
          name: "Crystal Knight",
          text: "Shield.",
        },
        P04: {
          name: "Timekeeper",
          text: "On play: Stun the enemy unit here for this turn.",
        },
        P05: {
          name: "Prism Drake",
          text: "Pierce.",
        },
        P06: {
          name: "Reroute",
          text: "Move an allied unit to an empty lane on your side.",
        },
        P07: {
          name: "Mirrorlock",
          text: "Stun an enemy unit for this turn.",
        },
        P08: {
          name: "Lightshard",
          text: "Deal 3 damage to an enemy unit. Draw 1 card.",
        },
        EC01: {
          name: "Ash Soldier",
          text: "No abilities.",
        },
        EC02: {
          name: "Furnace Guard",
          text: "No abilities.",
        },
        EC03: {
          name: "Coal Courier",
          text: "On play: draw 1 card.",
        },
        EC04: {
          name: "Dusk Bellringer",
          text: "When destroyed: deal 1 damage to the enemy hero.",
        },
        EC05: {
          name: "Coal Lance",
          text: "Deal 2 damage to an enemy unit.",
        },
        EC06: {
          name: "Night Intelligence",
          text: "Draw 2 cards.",
        },
        F01: {
          name: "Coal Beetle",
          text: "When destroyed: deal 1 damage to the enemy hero.",
        },
        F02: {
          name: "Embersmith",
          text: "On play: deal 1 damage to the enemy unit here.",
        },
        F03: {
          name: "Ash Knight",
          text: "Before combat here, once per turn: this unit gains +1 ATK this turn.",
        },
        F04: {
          name: "Furnace Beast",
          text: "Pierce.",
        },
        F05: {
          name: "Molten Colossus",
          text: "When destroyed: deal 2 damage to the enemy hero.",
        },
        F06: {
          name: "Coalshot",
          text: "Deal 3 damage to an enemy unit or the enemy hero.",
        },
        F07: {
          name: "Heat Edge",
          text: "An allied unit gains +2 ATK this turn.",
        },
        F08: {
          name: "Cinderwave",
          text: "Deal 2 damage simultaneously to all enemy units.",
        },
        X01: {
          name: "Ink Beetle",
          text: "When destroyed: Poison the enemy unit here.",
        },
        X02: {
          name: "Seal Scribe",
          text: "On play: Poison the enemy unit here.",
        },
        X03: {
          name: "Vialbearer",
          text: "When damaged, once per turn: this unit gains +1 ATK permanently.",
        },
        X04: {
          name: "Ash Reaper",
          text: "When destroyed: summon a 2/1 Cinder Imp here if your slot is empty.",
        },
        X05: {
          name: "Ink Magistrate",
          text: "At turn end: deal 1 damage to the enemy hero.",
        },
        X06: {
          name: "Inkblot",
          text: "Poison an enemy unit.",
        },
        X07: {
          name: "Lesser Hex",
          text: "An enemy unit has −2 ATK this turn. Draw 1 card.",
        },
        X08: {
          name: "Siphon Warmth",
          text: "Deal 2 damage to an enemy unit. Heal your hero for 2 HP.",
        },
        S01: {
          name: "Night Raven",
          text: "No abilities.",
        },
        S02: {
          name: "Mistcloak",
          text: "Shield.",
        },
        S03: {
          name: "Shadowbreaker",
          text: "On play: this unit gains +1 ATK this turn.",
        },
        S04: {
          name: "Nameless Watch",
          text: "Armor.",
        },
        S05: {
          name: "Duskwing",
          text: "Pierce.",
        },
        S06: {
          name: "Smoke Tunnel",
          text: "Move an allied unit to an empty lane on your side.",
        },
        S07: {
          name: "Misstep",
          text: "Move an enemy unit to an empty lane on its owner's side.",
        },
        S08: {
          name: "Veil of Cover",
          text: "Grant Shield to an allied unit. Draw 1 card.",
        },
        P_B1: {
          name: "Dawn Shield",
          text: "Choose an allied unit. Grant it Shield. Draw 1 card.",
        },
        P_B2: {
          name: "Mend Armor",
          text: "Choose an allied unit. Heal it for 4 HP. Draw 1 card.",
        },
        P_V1: {
          name: "Resilient Seed",
          text: "Choose an allied unit. It gains +0/+2 permanently. Draw 1 card.",
        },
        P_V2: {
          name: "Forest Breath",
          text: "Heal your hero for 3 HP. Heal all allied units for 1 HP.",
        },
        P_P1: {
          name: "Mirrorstep",
          text: "Move an allied unit to an empty lane on your side. It gains +1 ATK this turn.",
        },
        P_P2: {
          name: "Silent Flash",
          text: "Choose an enemy unit. Stun it for this turn. Draw 1 card.",
        },
        P_F1: {
          name: "Ember",
          text: "Deal 2 damage to an enemy unit or the enemy hero.",
        },
        P_F2: {
          name: "Temper Blade",
          text: "Choose an allied unit. It gains +2 ATK this turn. Grant it Shield.",
        },
        P_X1: {
          name: "Venom Ink",
          text: "Choose an enemy unit. Deal 1 damage to it, then Poison it.",
        },
        P_X2: {
          name: "Reclaim Vitality",
          text: "Heal your hero for 2 HP. Draw 1 card.",
        },
        P_S1: {
          name: "False Path",
          text: "Move an enemy unit to an empty lane on its owner's side.",
        },
        P_S2: {
          name: "Night Mantle",
          text: "Choose an allied unit. Grant it Shield. It gains +1 ATK this turn.",
        },
        S_G_BV: {
          name: "Oath of Growth",
          text: "Choose an allied unit. Grant it Shield and +0/+2 permanently. Heal your hero for 2 HP.",
        },
        S_G_BP: {
          name: "Crystal Verdict",
          text: "Choose an enemy unit. Deal 2 damage to it, then Stun it for this turn. Draw 1 card.",
        },
        S_G_VP: {
          name: "Lighttrail",
          text: "Move an allied unit to an empty lane on your side. It gains +2/+1 permanently.",
        },
        S_E_FX: {
          name: "Ancient Furnace Bell",
          text: "Deal 1 damage simultaneously to all enemy units. Then deal 2 damage to the enemy hero.",
        },
        S_E_FS: {
          name: "Duskblade Arc",
          text: "Choose an allied unit. It gains +2 ATK and Pierce this turn.",
        },
        S_E_XS: {
          name: "Sealing Mist",
          text: "Poison all enemy units. Heal your hero for 2 HP.",
        },
        TK_G_SEED: {
          name: "Lantern Sprout",
          text: "Summoned unit. No abilities.",
        },
        TK_G_LANTERN: {
          name: "Watch Lantern",
          text: "Summoned unit. Shield. Tutorial only.",
        },
        TK_E_CINDER: {
          name: "Cinder Imp",
          text: "Summoned unit. No abilities.",
        },
        ancient_forest: {
          name: "Elder Lanternwood",
          text: "Units played from hand here gain +0/+1 permanently.",
        },
        volcano: {
          name: "Ashen Crater",
          text: "After combat in this lane and all block responses, deal 1 damage simultaneously to every surviving unit here.",
        },
        storm_peak: {
          name: "Thundercrest",
          text: "Units here with printed ATK of 3 or less gain +1 ATK for this regular attack.",
        },
        frozen_lake: {
          name: "Frozen Mirror Lake",
          text: "Units played from hand here are Exhausted until the end of this turn.",
        },
        desert: {
          name: "Bell Dunes",
          text: "Playing a unit card from hand here costs 1 additional energy.",
        },
        healing_spring: {
          name: "Newgrowth Spring",
          text: "At turn end, after Poison and unit triggers, heal every surviving unit here for 1 HP.",
        },
        ruined_arena: {
          name: "Shattered Arena",
          text: "Units here gain +1 ATK for this regular attack if an enemy unit was in the lane when the snapshot was taken.",
        },
        quiet_meadow: {
          name: "Quiet Meadow",
          text: "No effects.",
        },
        D_G_BV: {
          name: "Resilient Garden",
          text: "",
        },
        D_G_BP: {
          name: "Crystal Defense",
          text: "",
        },
        D_G_VP: {
          name: "Growing Paths",
          text: "",
        },
        D_E_FX: {
          name: "Corrosive Ash",
          text: "",
        },
        D_E_FS: {
          name: "Dusk Assault",
          text: "",
        },
        D_E_XS: {
          name: "Venom Mist",
          text: "",
        },
      }).map(([id, entry]) => [id, Object.freeze(entry)]),
    ),
  );
const entry = (id: string): EnglishContentEntry | undefined =>
  Object.hasOwn(englishContent, id) ? englishContent[id] : undefined;
export const contentName = (id: string): string =>
  entry(id)?.name ?? "Unknown content";
export const contentText = (id: string): string =>
  entry(id)?.text ?? "Rules unavailable.";
export const heroTitle = (id: string): string =>
  entry(id)?.title ?? "Unknown hero";
export function deckDisplayName(
  source:
    | Readonly<{ kind: "PRESET"; presetId: string; name: string }>
    | Readonly<{ kind: "SAVED"; name: string }>,
): string {
  return source.kind === "PRESET" ? contentName(source.presetId) : source.name;
}
