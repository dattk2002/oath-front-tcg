# OathFront English presentation

OathFront takes place in **The Fivefold**, floating sanctuaries linked by five contested routes above an ancient furnace citadel. **Dawnward** (`GOOD`) protects the routes; **Ashen Court** (`EVIL`) seeks to control them. All current game UI, metadata, accessibility labels, tutorials, error states, and catalog copy are English.

This document maps stable IDs and historical Vietnamese source names to the current English presentation. `core_v1`, `locations_v1`, and `tutorial_v1` are immutable mechanics and source records. The `nameVi`/`exactTextVi`/`titleVi` field names remain in wire contracts for compatibility; the UI resolves names and rules through `apps/web/src/content/english-content.ts` by ID. Stored checkpoints, content hashes, event receipts, deck IDs, and user-entered account/deck names are not translated or rewritten. The historical source-parity tables in `docs/CONTENT.md` and earlier evidence remain reproducible.

## Heroes

| Stable ID | Historical source name | English name | English title | Classes |
| --- | --- | --- | --- | --- |
| H_G_BV | An Nhiên | Briar | The Living Bastion | BASTION / VERDANT |
| H_G_BP | Lam Vệ | Aster | The Prism Sentinel | BASTION / PRISM |
| H_G_VP | Mộc Dao | Lumen | The Lightweaver | VERDANT / PRISM |
| H_E_FX | Hắc Luyện | Cinder | The Furnace King | FURNACE / HEX |
| H_E_FS | Dạ Vũ | Vesper | The Duskblade | FURNACE / VEIL |
| H_E_XS | Mặc Ảnh | Morrow | The Hex Architect | HEX / VEIL |

## Cards

| Stable ID | Historical source name | English name | Exact English rules |
| --- | --- | --- | --- |
| GC01 | Người Gác Đèn | Lanternkeeper | No abilities. |
| GC02 | Kỵ Sĩ Lá | Leaf Knight | No abilities. |
| GC03 | Sứ Giả Sớm | Dawn Herald | On play: draw 1 card. |
| GC04 | Chuông Vườn | Garden Bell | When destroyed: heal your hero for 2 HP. |
| GC05 | Tia Đèn | Lantern Ray | Deal 2 damage to an enemy unit. |
| GC06 | Chuẩn Bị Hành Trang | Pack Supplies | Draw 2 cards. |
| B01 | Mầm Khiên | Shieldseed | Shield. |
| B02 | Gác Cổng Gỗ | Timber Gatekeeper | Armor. |
| B03 | Thợ Khiên Đồng | Bronze Shieldsmith | On play: grant Shield to allied units in the two adjacent lanes. |
| B04 | Hộ Vệ Chuông | Bellguard | When damaged, once per turn: heal your hero for 1 HP. |
| B05 | Người Giữ Thành | Citadel Warden | Armor. |
| B06 | Dựng Lá Chắn | Raise Shields | Grant Shield to an allied unit. |
| B07 | Gia Cố | Reinforce | An allied unit gains +0/+3 permanently. |
| B08 | Đẩy Lui | Repel | Deal 3 damage to an enemy unit. It has −1 ATK this turn. |
| V01 | Người Trồng Mầm | Seed Tender | On play: heal your hero for 1 HP. |
| V02 | Hươu Rêu | Moss Stag | At turn end: heal this unit for 1 HP. |
| V03 | Người Hái Sương | Dew Gatherer | On play: heal your hero for 2 HP. |
| V04 | Cây Mang Đèn | Lantern Tree | When destroyed: summon a 1/1 Lantern Sprout here if your slot is empty. |
| V05 | Linh Thú Cổ Thụ | Elderwood Spirit | At turn end: heal all allied units for 1 HP. |
| V06 | Vươn Chồi | New Growth | An allied unit gains +1/+2 permanently. |
| V07 | Mạch Suối | Springflow | Heal your hero for 4 HP. |
| V08 | Ươm Đèn | Sow Lanterns | Summon a 1/1 Lantern Sprout in an empty lane on your side. |
| P01 | Chim Gương | Mirrorbird | No abilities. |
| P02 | Người Soi Đường | Pathlighter | On play: the enemy unit here has −1 ATK this turn. |
| P03 | Kỵ Sĩ Pha Lê | Crystal Knight | Shield. |
| P04 | Người Giữ Nhịp | Timekeeper | On play: Stun the enemy unit here for this turn. |
| P05 | Long Kính | Prism Drake | Pierce. |
| P06 | Đổi Lối | Reroute | Move an allied unit to an empty lane on your side. |
| P07 | Khóa Gương | Mirrorlock | Stun an enemy unit for this turn. |
| P08 | Mảnh Sáng | Lightshard | Deal 3 damage to an enemy unit. Draw 1 card. |
| EC01 | Lính Tro | Ash Soldier | No abilities. |
| EC02 | Gác Lò | Furnace Guard | No abilities. |
| EC03 | Người Chuyển Than | Coal Courier | On play: draw 1 card. |
| EC04 | Kẻ Gõ Chuông Tàn | Dusk Bellringer | When destroyed: deal 1 damage to the enemy hero. |
| EC05 | Mũi Than | Coal Lance | Deal 2 damage to an enemy unit. |
| EC06 | Thu Thập Tin Đêm | Night Intelligence | Draw 2 cards. |
| F01 | Bọ Than | Coal Beetle | When destroyed: deal 1 damage to the enemy hero. |
| F02 | Thợ Rèn Nóng | Embersmith | On play: deal 1 damage to the enemy unit here. |
| F03 | Kỵ Sĩ Tro | Ash Knight | Before combat here, once per turn: this unit gains +1 ATK this turn. |
| F04 | Thú Lò | Furnace Beast | Pierce. |
| F05 | Khổng Lồ Dung Tro | Molten Colossus | When destroyed: deal 2 damage to the enemy hero. |
| F06 | Ném Than | Coalshot | Deal 3 damage to an enemy unit or the enemy hero. |
| F07 | Mài Nóng | Heat Edge | An allied unit gains +2 ATK this turn. |
| F08 | Sóng Tàn | Cinderwave | Deal 2 damage simultaneously to all enemy units. |
| X01 | Bọ Mực | Ink Beetle | When destroyed: Poison the enemy unit here. |
| X02 | Người Viết Ấn | Seal Scribe | On play: Poison the enemy unit here. |
| X03 | Kẻ Đeo Bình | Vialbearer | When damaged, once per turn: this unit gains +1 ATK permanently. |
| X04 | Người Gặt Tro | Ash Reaper | When destroyed: summon a 2/1 Cinder Imp here if your slot is empty. |
| X05 | Quan Giữ Mực | Ink Magistrate | At turn end: deal 1 damage to the enemy hero. |
| X06 | Vết Mực | Inkblot | Poison an enemy unit. |
| X07 | Lời Nguyền Nhẹ | Lesser Hex | An enemy unit has −2 ATK this turn. Draw 1 card. |
| X08 | Hút Hơi Ấm | Siphon Warmth | Deal 2 damage to an enemy unit. Heal your hero for 2 HP. |
| S01 | Quạ Đêm | Night Raven | No abilities. |
| S02 | Người Mang Áo Mờ | Mistcloak | Shield. |
| S03 | Kẻ Rẽ Bóng | Shadowbreaker | On play: this unit gains +1 ATK this turn. |
| S04 | Canh Gác Không Tên | Nameless Watch | Armor. |
| S05 | Dạ Điểu | Duskwing | Pierce. |
| S06 | Đường Hầm Khói | Smoke Tunnel | Move an allied unit to an empty lane on your side. |
| S07 | Lạc Bước | Misstep | Move an enemy unit to an empty lane on its owner's side. |
| S08 | Màn Che | Veil of Cover | Grant Shield to an allied unit. Draw 1 card. |

## Powers

| Stable ID | Historical source name | English name | Exact English rules |
| --- | --- | --- | --- |
| P_B1 | Tấm Chắn Ban Mai | Dawn Shield | Choose an allied unit. Grant it Shield. Draw 1 card. |
| P_B2 | Vá Giáp | Mend Armor | Choose an allied unit. Heal it for 4 HP. Draw 1 card. |
| P_V1 | Mầm Kiên Cường | Resilient Seed | Choose an allied unit. It gains +0/+2 permanently. Draw 1 card. |
| P_V2 | Nhịp Thở Rừng | Forest Breath | Heal your hero for 3 HP. Heal all allied units for 1 HP. |
| P_P1 | Bước Qua Gương | Mirrorstep | Move an allied unit to an empty lane on your side. It gains +1 ATK this turn. |
| P_P2 | Chớp Lặng | Silent Flash | Choose an enemy unit. Stun it for this turn. Draw 1 card. |
| P_F1 | Tàn Lửa | Ember | Deal 2 damage to an enemy unit or the enemy hero. |
| P_F2 | Hun Lưỡi | Temper Blade | Choose an allied unit. It gains +2 ATK this turn. Grant it Shield. |
| P_X1 | Chấm Mực Độc | Venom Ink | Choose an enemy unit. Deal 1 damage to it, then Poison it. |
| P_X2 | Thu Hồi Sinh Khí | Reclaim Vitality | Heal your hero for 2 HP. Draw 1 card. |
| P_S1 | Lối Đi Sai | False Path | Move an enemy unit to an empty lane on its owner's side. |
| P_S2 | Áo Đêm | Night Mantle | Choose an allied unit. Grant it Shield. It gains +1 ATK this turn. |
| S_G_BV | Lời Thề Nảy Mầm | Oath of Growth | Choose an allied unit. Grant it Shield and +0/+2 permanently. Heal your hero for 2 HP. |
| S_G_BP | Phán Quyết Pha Lê | Crystal Verdict | Choose an enemy unit. Deal 2 damage to it, then Stun it for this turn. Draw 1 card. |
| S_G_VP | Đường Mòn Ánh Sáng | Lighttrail | Move an allied unit to an empty lane on your side. It gains +2/+1 permanently. |
| S_E_FX | Tiếng Chuông Lò Cổ | Ancient Furnace Bell | Deal 1 damage simultaneously to all enemy units. Then deal 2 damage to the enemy hero. |
| S_E_FS | Vệt Đao Chạng Vạng | Duskblade Arc | Choose an allied unit. It gains +2 ATK and Pierce this turn. |
| S_E_XS | Màn Sương Niêm Ấn | Sealing Mist | Poison all enemy units. Heal your hero for 2 HP. |

## Summoned tokens

| Stable ID | Historical source name | English name | English description |
| --- | --- | --- | --- |
| TK_G_SEED | Mầm Đèn | Lantern Sprout | Summoned unit. No abilities. |
| TK_G_LANTERN | Đèn Gác | Watch Lantern | Summoned unit. Shield. Tutorial only. |
| TK_E_CINDER | Tàn Quỷ | Cinder Imp | Summoned unit. No abilities. |

## Locations

| Stable ID | Historical source name | English name | Exact English rules |
| --- | --- | --- | --- |
| ancient_forest | Rừng Cổ Đăng | Elder Lanternwood | Units played from hand here gain +0/+1 permanently. |
| volcano | Miệng Lò Tro | Ashen Crater | After combat in this lane and all block responses, deal 1 damage simultaneously to every surviving unit here. |
| storm_peak | Đỉnh Ngân Lôi | Thundercrest | Units here with printed ATK of 3 or less gain +1 ATK for this regular attack. |
| frozen_lake | Hồ Kính Lạnh | Frozen Mirror Lake | Units played from hand here are Exhausted until the end of this turn. |
| desert | Cồn Cát Chuông | Bell Dunes | Playing a unit card from hand here costs 1 additional energy. |
| healing_spring | Suối Chồi Non | Newgrowth Spring | At turn end, after Poison and unit triggers, heal every surviving unit here for 1 HP. |
| ruined_arena | Đấu Trường Vỡ | Shattered Arena | Units here gain +1 ATK for this regular attack if an enemy unit was in the lane when the snapshot was taken. |
| quiet_meadow | Đồng Cỏ Yên | Quiet Meadow | No effects. |

## Preset decks

| Stable ID | Prior UI name | English name |
| --- | --- | --- |
| D_G_BV | Vườn Thành Kiên Cường | Resilient Garden |
| D_G_BP | Phòng Tuyến Pha Lê | Crystal Defense |
| D_G_VP | Đường Mòn Sinh Trưởng | Growing Paths |
| D_E_FX | Tro Tàn Ăn Mòn | Corrosive Ash |
| D_E_FS | Đòn Đánh Chạng Vạng | Dusk Assault |
| D_E_XS | Màn Sương Độc | Venom Mist |

The six preset names are presentation defaults. Legacy preset records retain their original `name` field for compatibility. A player’s own deck name is displayed exactly as entered, including Vietnamese or any other language.

## Labels and tutorial identity

Classes are Bastion, Verdant, Prism, Furnace, Hex, and Veil. Keywords shown in the interface include Shield, Armor, Poison, Stun, Exhausted, Pierce, and Move. Tutorial scenarios retain their stable IDs (`tutorial_v1` and `tutorial_evil_v1`), chapter/step IDs, saved progress, and rules; `apps/web/src/features/tutorial/tutorial-controller.tsx` supplies English instructions and results by step ID.

## Playable hero expansion (`heroes_v1`)

The following names have no historical Vietnamese alias. Each hero has 20 HP, three shared powers and one signature. Existing six heroes and all sixty cards retain their IDs and rules.

| Stable ID | Hero | Title | Classes | Signature | Exact signature rules |
| --- | --- | --- | --- | --- | --- |
| H_G_SOL | Solenne | The Sunforged Envoy | BASTION / PRISM | S_G_SOL — Solar Accord | Give an allied unit Shield and +1/+1 permanently. |
| H_G_CAI | Cairn | The Keystone Guardian | BASTION / VERDANT | S_G_CAI — Keystone Covenant | Give an allied unit Armor and +0/+2 permanently. |
| H_G_ZEP | Zephyr | The Crosswind Runner | VERDANT / PRISM | S_G_ZEP — Crosswind | Move an allied unit to an empty allied lane. Give it +3 ATK this turn. Draw a card. |
| H_G_MER | Meridian | The Dawn Archivist | BASTION / PRISM | S_G_MER — Held Dawn | Stun an enemy unit this turn. Heal your hero for 3. Draw a card. |
| H_G_MOS | Mossweld | The Grove Mechanic | BASTION / VERDANT | S_G_MOS — Field Refit | Heal an allied unit for 4. Give it Shield. Draw a card. |
| H_G_HAL | Halcyon | The Sky Chorus | VERDANT / PRISM | S_G_HAL — Skyward Chorus | Give all allied units +1 ATK this turn and heal them for 1. |
| H_G_ROW | Rowan | The Grove Nomad | BASTION / VERDANT | S_G_ROW — Hearthroot | Summon a Seedling in an empty allied lane. Heal your hero for 4. |
| H_E_ROO | Rook | The Cinder Marksman | FURNACE / VEIL | S_E_ROO — Crossfire Oath | Move an enemy unit to an empty lane on its side. Deal 2 damage to it. |
| H_E_NYX | Nyxara | The Silk Hex | HEX / VEIL | S_E_NYX — Thread the Needle | Move an enemy unit to an empty lane on its side. Poison it. |
| H_E_BRI | Brimstone | The Crucible Colossus | FURNACE / HEX | S_E_BRI — Crucible Break | Deal 3 damage to an enemy unit, then 1 damage to the enemy hero. |
| H_E_SAB | Sable | The Last Adjudicator | HEX / VEIL | S_E_SAB — Final Injunction | Give an enemy unit -2 ATK this turn. Poison it. Draw a card. |
| H_E_VAN | Vanta | The Blackglass Dancer | FURNACE / VEIL | S_E_VAN — Blackglass Waltz | Move an allied unit to an empty allied lane. Give it +1 ATK and Pierce this turn. |
| H_E_GRA | Gravemarch | The Hollow Bell | FURNACE / HEX | S_E_GRA — Toll of Cinders | Summon a Cinderling in an empty allied lane. Deal 1 damage to all enemy units. |
| H_E_SCO | Scoria | The Ash Alchemist | FURNACE / HEX | S_E_SCO — Ashen Remedy | Deal 2 damage to an enemy unit. Heal your hero for 3. Draw a card. |

Canonical effects and preset definitions: `packages/game-content/src/heroes-v1.ts`. Runtime labels: `apps/web/src/content/english-content.ts`.
