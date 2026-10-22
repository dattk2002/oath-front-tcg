# Twenty-hero distinction audit

Reference inspected: `assets/source/heroes-v4/crop-review.jpg` and original source masters. The audit evaluates silhouette, anatomy, equipment, material, motif and pose. At least three clearly different axes are required against the closest neighbor; palette alone does not count. The user's explicit request also calls for reworking Briar, Cairn and Rowan together.

| Hero | Closest v4 neighbor | Observed overlap / clear differences | Decision and v5 direction |
|---|---|---|---|
| Briar | Rowan / Cairn | Green/ivory layered protector, wide plant armor and grounded stance overlap. Shield versus staff is not enough for the requested family separation. | Redraw: human oak-and-bronze shield knight, compact defensive brace, face exposed. |
| Aster | Rook | Airborne spearhead silhouette; human, prism jets/palm armor, glossy cobalt/ivory surfaces, flight motif and diagonal airborne pose differ from the grounded archer on four axes. | Keep. |
| Lumen | Halcyon / Solenne | White braids, gold/indigo floating female silhouette overlaps across the group; weather ribbons are the strongest identity. | Keep Lumen as the sole floating white-braided weather controller; redraw the neighbors. |
| Cinder | Brimstone | Both use black/orange heavy brawler masses and molten forearms. Human exposed face helps, but full-body silhouette/material overlap persists. | Keep human Cinder; redraw Brimstone with quadrupedal volcanic anatomy. |
| Vesper | Scoria | Coat silhouettes overlap, but crescent/shard weapons, dark cloth, kinetic duelist motif and a forward throwing pose differ from laboratory vessels and running alchemy. | Keep. |
| Morrow | Meridian / Sable | Long dark scholar/authority silhouettes, silver hair and geometric ornaments overlap. His portal architecture remains specific. | Keep Morrow; redraw both neighbors. |
| Solenne | Lumen | Similar braided face, ivory/gold flowing armor and lifted stance. Spear/shield alone does not fully distinguish the silhouette. | Redraw: cropped dark hair, bronze/terracotta plates, grounded spear-and-ward stance. |
| Cairn | Briar / Gravemarch | Moss/ivory guardian texture overlaps Briar; heavy biped armor-like anatomy overlaps Gravemarch. | Redraw: floating separated limestone segments, hollow gravity core and cobalt mineral seams; no legs or foliage. |
| Zephyr | Aster | Both airborne humans, but scarf-led running silhouette, cloth/aerodynamic suit, movement motif and low sprinting gesture differ from plated jet flight. | Keep. |
| Meridian | Morrow / Lumen | Silver-haired floating scholar in a long indigo coat repeats both human silhouettes. Armillary/folio is useful but too small at HUD scale. | Redraw: older broad-bodied archivist seated in a brass levitating armillary cradle, practical waistcoat and mechanical arm. |
| Mossweld | None close | Small fennec/pangolin anatomy, outsized repair tool, fur/scales/copper, workshop motif and airborne compact pose are unique. | Keep. |
| Halcyon | Lumen | White-haired human face and feather-like flowing cape read too similarly to the weather controller. | Redraw: unmistakable heron-like avian head, winged forearms and taloned feet; conductor gesture. |
| Rowan | Briar | Human green/ivory defender with long foliage layers; staff and hair do not sufficiently separate the main shape. | Redraw: azure amphibious body, gill fins, webbed hands and a tidal staff; crouched asymmetric movement, no leaf armor. |
| Rook | Aster / Vesper | Broad horizontal bow silhouette, rail-bow/monocle, mechanical kit, aiming motif and grounded stance separate the archer despite a shared armor family. | Keep. |
| Nyxara | Vesper / Lumen | Human cloth silhouette is shared, but six silk strands/web geometry, slender weaving gesture, plum silk and black braids give equipment/motif/pose distinction. | Keep. |
| Brimstone | Cinder / Gravemarch | Black furnace-heavy biped is too close to another armored brawler/machine. | Redraw: quadrupedal obsidian beast, molten jaw and organic volcanic vents; no manufactured armor or human stance. |
| Sable | Morrow / Meridian | Tall pale-haired authority in a pointed dark coat and suspended slabs repeats mage geometry. | Redraw: ivory-chitin mantis magistrate, four deliberate arms, brass verdict scales and stone seals; formal upright pose. |
| Vanta | Lumen / Cinder | Silver curls repeat Lumen's light hair, but low predator silhouette, blade hoops, blackglass surfaces and lunging pose clearly differ. | Keep. |
| Gravemarch | Cairn / Brimstone | Heavy biped shape overlaps the old colossi, but hollow bell-cage machine identity is specific. | Keep; after neighboring redraws it is the sole upright bell-cage juggernaut. |
| Scoria | Vesper | Tailored coat family is shared; kiln vessels, white laboratory cloth/ceramic, fluid-fire alchemy and running pose distinguish the character. | Keep. |

## Generation and acceptance

The v5 set contains eight separate transparent full-body assets. Original names, hero IDs and gameplay signatures remain stable. Every PNG, exact prompt and derivative hash must be retained. The Home ensemble retains its composition and updates the two featured changed identities, Briar and Rowan. Twelve unchanged v4 heroes remain the original selected sources.

Generated output review passed on 2026-10-22: all eight full-body masters were inspected, then the full 20-hero roster montage and all HUD crops. Cairn has no legs or foliage; Rowan has amphibious head/limbs; Halcyon has avian anatomy; Sable has four arms; Brimstone is quadrupedal; Meridian is seated in an armillary cradle. Briar/Solenne keep distinct timber/bronze materials and shield silhouettes. All eight images have genuine alpha (41–69% near-transparent pixels), with no opaque backdrop. The Home v3 ensemble preserves the original composition and updates Briar/Rowan. Browser scale/layout acceptance remains a later integration gate.

Review artifacts: `assets/source/heroes-v5/roster-review.jpg`, `assets/source/event-cards-v1/review.jpg`; individual source and export hashes in each versioned `manifest.json`. There are 29 new PNG masters and 97 WebP derivatives/atlases, totaling 12,547,334 runtime bytes across all variants; largest single file 812,336 bytes. Pages must load only the necessary variants, not the entire library.
