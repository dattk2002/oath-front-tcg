# elements_v1 content manifest

Immutable gameplay release: 5093e791d86348765999c729247b10680cf392f1894869ba047617fa18bd832f. New catalog only; core_v1 and heroes_v1 are unchanged.

20 heroes, 36 powers, 72 cards, 20 free presets. HP20, powers cost1. Decks: exactly30, max2/card, max12 Neutral, at least6 from each hero system. Origin faction does not restrict this catalog. All60 base cards remain open;12 Event cards require ownership outside borrowed challenges.

No base-card numeric tuning at initialization. Legacy signatures retain their effects. Balance simulation follows the engine integration milestone.

| System | Identity |
|---|---|
| Grove | Growth, healing and replacement units |
| Terra | Armor, Shield and lasting defense |
| Tide | Repositioning, protection and recovery |
| Tempest | Movement, tempo and attack pressure |
| Solar | Radiance, heat and direct damage |
| Forge | Constructs, repairs and resilience |
| Arcane | Draw, timing and spell control |
| Umbral | Poison, weakening and attrition |

| Hero | Systems | Powers |
|---|---|---|
| Briar (H_G_BV) | GROVE / TERRA | P_GROVE1, P_GROVE2, P_TERRA1, S_G_BV |
| Aster (H_G_BP) | FORGE / SOLAR | P_FORGE1, P_FORGE2, P_SOLAR1, S_G_BP |
| Lumen (H_G_VP) | TEMPEST / SOLAR | P_TEMPEST1, P_TEMPEST2, P_SOLAR1, S_G_VP |
| Cinder (H_E_FX) | FORGE / TERRA | P_FORGE1, P_FORGE2, P_TERRA1, S_E_FX |
| Vesper (H_E_FS) | TEMPEST / UMBRAL | P_TEMPEST1, P_TEMPEST2, P_UMBRAL1, S_E_FS |
| Morrow (H_E_XS) | ARCANE / UMBRAL | P_ARCANE1, P_ARCANE2, P_UMBRAL1, S_E_XS |
| Solenne (H_G_SOL) | SOLAR / TERRA | P_SOLAR1, P_SOLAR2, P_TERRA1, S_G_SOL |
| Cairn (H_G_CAI) | TERRA / ARCANE | P_TERRA1, P_TERRA2, P_ARCANE1, S_G_CAI |
| Zephyr (H_G_ZEP) | TEMPEST / TIDE | P_TEMPEST1, P_TEMPEST2, P_TIDE1, S_G_ZEP |
| Meridian (H_G_MER) | ARCANE / SOLAR | P_ARCANE1, P_ARCANE2, P_SOLAR1, S_G_MER |
| Mossweld (H_G_MOS) | FORGE / GROVE | P_FORGE1, P_FORGE2, P_GROVE1, S_G_MOS |
| Halcyon (H_G_HAL) | TEMPEST / GROVE | P_TEMPEST1, P_TEMPEST2, P_GROVE1, S_G_HAL |
| Rowan (H_G_ROW) | GROVE / TIDE | P_GROVE1, P_GROVE2, P_TIDE1, S_G_ROW |
| Rook (H_E_ROO) | FORGE / TEMPEST | P_FORGE1, P_FORGE2, P_TEMPEST1, S_E_ROO |
| Nyxara (H_E_NYX) | UMBRAL / GROVE | P_UMBRAL1, P_UMBRAL2, P_GROVE1, S_E_NYX |
| Brimstone (H_E_BRI) | SOLAR / UMBRAL | P_SOLAR1, P_SOLAR2, P_UMBRAL1, S_E_BRI |
| Sable (H_E_SAB) | TERRA / UMBRAL | P_TERRA1, P_TERRA2, P_UMBRAL1, S_E_SAB |
| Vanta (H_E_VAN) | TIDE / UMBRAL | P_TIDE1, P_TIDE2, P_UMBRAL1, S_E_VAN |
| Gravemarch (H_E_GRA) | FORGE / UMBRAL | P_FORGE1, P_FORGE2, P_UMBRAL1, S_E_GRA |
| Scoria (H_E_SCO) | SOLAR / TIDE | P_SOLAR1, P_SOLAR2, P_TIDE1, S_E_SCO |

| Card | System | Rarity | Cost | ATK/HP |
|---|---|---|---|---|
| GC01 | Neutral | U | 1 | 1/2 |
| GC02 | Neutral | U | 2 | 2/3 |
| GC03 | Neutral | U | 3 | 2/3 |
| GC04 | Neutral | U | 2 | 1/3 |
| GC05 | Neutral | U | 2 | Trick |
| GC06 | Neutral | U | 3 | Trick |
| B01 | TERRA | U | 1 | 1/1 |
| B02 | TERRA | R | 2 | 1/4 |
| B03 | FORGE | SR | 3 | 2/3 |
| B04 | FORGE | SR | 4 | 3/5 |
| B05 | TERRA | SL | 6 | 4/7 |
| B06 | TERRA | U | 1 | Trick |
| B07 | TERRA | R | 2 | Trick |
| B08 | FORGE | SR | 3 | Trick |
| V01 | GROVE | U | 1 | 1/2 |
| V02 | GROVE | R | 2 | 2/2 |
| V03 | TIDE | R | 3 | 2/4 |
| V04 | GROVE | SR | 4 | 3/4 |
| V05 | GROVE | SL | 6 | 4/6 |
| V06 | GROVE | SR | 2 | Trick |
| V07 | TIDE | R | 2 | Trick |
| V08 | GROVE | R | 1 | Trick |
| P01 | TEMPEST | U | 1 | 2/1 |
| P02 | TIDE | R | 2 | 2/2 |
| P03 | FORGE | R | 3 | 3/2 |
| P04 | ARCANE | SR | 4 | 2/5 |
| P05 | TEMPEST | SL | 6 | 5/4 |
| P06 | TEMPEST | U | 1 | Trick |
| P07 | ARCANE | R | 2 | Trick |
| P08 | ARCANE | SR | 3 | Trick |
| EC01 | Neutral | U | 1 | 2/1 |
| EC02 | Neutral | U | 2 | 2/3 |
| EC03 | Neutral | U | 3 | 2/3 |
| EC04 | Neutral | U | 2 | 1/3 |
| EC05 | Neutral | U | 2 | Trick |
| EC06 | Neutral | U | 3 | Trick |
| F01 | SOLAR | U | 1 | 2/1 |
| F02 | SOLAR | R | 2 | 2/2 |
| F03 | SOLAR | R | 3 | 3/3 |
| F04 | FORGE | SR | 4 | 4/3 |
| F05 | SOLAR | SL | 6 | 6/5 |
| F06 | SOLAR | R | 2 | Trick |
| F07 | TEMPEST | U | 1 | Trick |
| F08 | SOLAR | SR | 4 | Trick |
| X01 | UMBRAL | U | 1 | 1/2 |
| X02 | UMBRAL | R | 2 | 1/3 |
| X03 | FORGE | R | 3 | 2/4 |
| X04 | ARCANE | SR | 4 | 3/4 |
| X05 | ARCANE | SL | 6 | 4/6 |
| X06 | UMBRAL | U | 1 | Trick |
| X07 | UMBRAL | R | 2 | Trick |
| X08 | UMBRAL | SR | 3 | Trick |
| S01 | TEMPEST | U | 1 | 2/1 |
| S02 | TIDE | R | 2 | 2/2 |
| S03 | UMBRAL | R | 3 | 3/2 |
| S04 | TERRA | U | 4 | 3/5 |
| S05 | TEMPEST | SL | 6 | 5/4 |
| S06 | ARCANE | U | 1 | Trick |
| S07 | TIDE | R | 2 | Trick |
| S08 | TIDE | SR | 2 | Trick |
| E01 | TERRA | E | 3 | 2/3 |
| E02 | GROVE | E | 3 | 2/3 |
| E03 | SOLAR | E | 3 | 3/2 |
| E04 | UMBRAL | E | 3 | 2/3 |
| E05 | FORGE | E | 2 | 1/4 |
| E06 | TIDE | E | 4 | 2/5 |
| E07 | TEMPEST | E | 4 | 3/3 |
| E08 | ARCANE | E | 3 | 1/3 |
| E09 | GROVE | E | 4 | 3/3 |
| E10 | TERRA | E | 4 | 3/4 |
| E11 | SOLAR | E | 6 | 5/4 |
| E12 | UMBRAL | E | 5 | 3/4 |

The exact event effects and all sixteen shared powers are documented in [the design spec](../superpowers/specs/2026-10-22-events-affinities-design.md#locked-content-addendum-for-m1). Presets deliberately use only free cards and preserve low-cost openings.
