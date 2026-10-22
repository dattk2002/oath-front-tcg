# elements_v1 — bounded bot benchmark

100 deterministic games, all20heroes and every10×10 opposing-hero pairing once, Normal bot on both sides. Seed recipe and catalog hash are in [the raw report](evidence/elements-events/balance-100.json).

No rejected legal actions, crashes or step-limit faults:0/100. Dawnward wins56, Ashen Court wins40, draws4. Median11turns, range6–20. No base-card stats were changed from the established catalog.

One game per pairing is too small to claim balance. Bot behavior and identical free preset construction influence the result; event cards are covered by literal engine/preview tests, not these free-deck matches. Human matchup testing remains necessary. The observed faction difference is a reason to track more games, not sufficient evidence for a numerical nerf.

| Hero | Wins /10 | Draws |
|---|---:|---:|
| H_E_BRI | 3 | 1 |
| H_E_FS | 1 | 0 |
| H_E_FX | 7 | 0 |
| H_E_GRA | 7 | 1 |
| H_E_NYX | 2 | 0 |
| H_E_ROO | 5 | 0 |
| H_E_SAB | 3 | 2 |
| H_E_SCO | 6 | 0 |
| H_E_VAN | 1 | 0 |
| H_E_XS | 5 | 0 |
| H_G_BP | 9 | 1 |
| H_G_BV | 6 | 1 |
| H_G_CAI | 8 | 0 |
| H_G_HAL | 2 | 0 |
| H_G_MER | 8 | 0 |
| H_G_MOS | 7 | 1 |
| H_G_ROW | 3 | 1 |
| H_G_SOL | 7 | 0 |
| H_G_VP | 6 | 0 |
| H_G_ZEP | 0 | 0 |
