"""Prepare one art request per immutable catalog definition. Never modifies catalog."""
from pathlib import Path
import json
import sys
root=Path(__file__).resolve().parents[2]
catalog=json.load(open(sys.argv[1]))
subjects={
"H_G_BV":"An Nhiên, expressive woman guardian, seed-lantern staff, round glass shield, leaf crown",
"H_G_BP":"Lam Vệ, calm strong male crystal guardian, broad rounded ivory wooden armor and turquoise glass shield, short silver hair",
"H_G_VP":"Mộc Dao, nimble adult woman light-weaver, flowing jade cloth, leaf hair ornaments and floating glass weaving ribbons",
"H_E_FX":"Hắc Luyện, imposing adult ash-lord with angular furnace armor, old brass bell hammer, charcoal-purple cloak and glowing ember mask",
"H_E_FS":"Dạ Vũ, agile adult night-duelist woman, angular dark cloak, twin curved blades reflecting ember light, copper mask over eyes",
"H_E_XS":"Mặc Ảnh, mysterious adult ink-seal keeper, angular layered purple robes, copper ink vessel and long brush staff, expressive half mask",
"GC02":"leaf knight with rounded ivory wooden shield and leaf-shaped lance, green cloth and brass shoulder plates",
"GC03":"cheerful early messenger with rolled map, bright seed-lantern satchel and jade travelling cloak",
"GC04":"garden bell keeper, stout animated round brass garden bell with gentle face and sturdy wooden legs",
"GC05":"a concentrated golden lantern ray crossing jade mist, radiant seed at its source",
"GC06":"a neatly open adventurer satchel with rope, seed lantern, folded ivory cloth and small brass compass",
"B01":"tiny brave seedling guardian carrying a large rounded leaf shield, wooden body and ivory sprouts",
"B02":"stout wooden gate guard with massive rounded plank shield and brass hinge armor",
"B03":"friendly brass shield smith with round copper shield, wooden mallet and ivory apron",
"B04":"bell bodyguard with round pauldrons, jade robe and a bell-headed staff",
"B05":"veteran citadel keeper, broad rounded ivory wooden tower shield with glass inset, brass plate armor",
"B06":"a magical curved wall of overlapping translucent jade leaves and ivory wooden ribs",
"B07":"brass rivets magically sealing a round wooden shield with jade light",
"B08":"a powerful rounded glass shield pushing a wave of dust backwards",
"V01":"young adult seed planter in jade gardening cloak, ivory seed bowl and wooden spade",
"V02":"gentle moss deer, rounded antlers growing tender leaves, turquoise moss pelt, tiny brass seed lanterns",
"V03":"dew harvester with translucent glass jars and leaf umbrella, jade cloth, pearl droplets",
"V04":"walking lantern tree, expressive old wooden face, curved branch arms and glowing round seed lanterns",
"V05":"great ancient-tree spirit beast, sturdy quadruped, bark armor, luminous jade leaf mane, ivory tusks",
"V06":"a curling fresh seedling bursting through warm earth, jade leaves and soft golden light",
"V07":"a luminous spring vein weaving through rounded roots and glowing jade stones",
"V08":"a seed nursery of three softly glowing tiny lantern buds in a cupped ivory planter",
"P01":"small mirror bird, rounded ivory body, turquoise glass wings and brass filigree feathers",
"P02":"path finder with a large round glass prism lantern, ivory travelling coat and jade sash",
"P03":"crystal knight in rounded ivory glass plate armor with turquoise crystalline lance and round shield",
"P04":"rhythm keeper, poised adult musician with round brass chime instrument, jade layered robes",
"P05":"elegant small glass dragon, curling rounded silhouette, turquoise translucent scales and ivory horns",
"P06":"two branching luminous paths bending through a floating round mirror portal",
"P07":"a floating round glass mirror sealed by a luminous brass geometric clasp, turquoise frost sparks",
"P08":"a fan of glowing turquoise glass shards reflecting golden dawn light",
"EC02":"stocky furnace sentry with angular old copper tower shield, charcoal armor and orange furnace visor",
"EC03":"coal carrier with angular soot cloak, heavy basket of glowing embers, old brass tongs",
"EC04":"ash bell ringer, angular hooded masked figure carrying a battered copper bell on a hooked staff",
"EC05":"a pointed burning coal dart trailing orange sparks through charcoal-purple smoke",
"EC06":"a secret night-message bundle of folded blank papers, dark raven feather and old brass spyglass",
"F01":"armored coal beetle, angular charcoal shell with orange ember cracks and brass mandibles",
"F02":"hot forge smith, muscular masked adult, angular soot apron, glowing tongs and copper forging hammer",
"F03":"ash knight, angular charcoal armor, ember-orange lance, torn purple cloak, old brass visor",
"F04":"furnace beast, squat quadruped made of angular old iron plates, orange furnace belly, copper teeth",
"F05":"giant molten-ash golem, massive angular coal limbs, copper furnace chest, orange ember fissures",
"F06":"an arc of three thrown burning coals scattering fiery sparks in smoky air",
"F07":"an angular blade being honed against a glowing old forge stone, ember sparks",
"F08":"a low rolling wave of ember sparks and swirling charcoal ash",
"X01":"ink beetle with angular obsidian-purple carapace, copper antennae and violet ink droplets",
"X02":"ink seal writer in angular purple robes, copper mask, enormous brush and hanging blank seal strips",
"X03":"masked bottle bearer carrying two angular smoky purple glass vessels on a copper yoke",
"X04":"ash reaper with long hooked harvest blade, angular purple cloak, old brass mask, no gore",
"X05":"court ink official with imposing angular purple mantle, copper ink basin and long brush staff",
"X06":"an expressive curling splash of violet-black magic ink over a copper seal disc without writing",
"X07":"three angular copper knots suspended in purple smoky curse wisps, no letters or symbols resembling text",
"X08":"warm amber motes drawn from a fading coal into an angular purple glass vessel",
"S01":"night crow, angular charcoal-purple feathers, copper beak ornament and ember eyes, wings lifted",
"S02":"mist-cloak bearer, angular layered purple cloak, copper half mask, silhouette dissolving into soft smoke",
"S03":"shadow divider, agile masked duelist with angular charcoal-purple cloak and two thin copper blades",
"S04":"nameless watch guard, tall angular masked silhouette, old copper halberd and charcoal-purple armor",
"S05":"great night bird, angular owl-like purple-black wings, copper facial mask and restrained ember plumage",
"S06":"an arcing tunnel of charcoal-purple smoke with a distant warm amber exit",
"S07":"two sets of smoky footprints diverging around an angular copper lantern, mysterious purple mist",
"S08":"a flowing angular veil of purple cloth shielding a copper lantern from sparks",
"P_B1":"dawn shield, rounded ivory wooden shield with a brilliant golden sun reflected in turquoise glass",
"P_B2":"mending armor, glowing brass rivets binding cracked ivory wood into a rounded breastplate",
"P_V1":"a resilient jade seedling growing through a round ivory stone and golden seed light",
"P_V2":"forest breath, soft jade leaf spiral encircling a glowing seed-lantern heart",
"P_P1":"a luminous ivory boot stepping through a round turquoise glass mirror portal",
"P_P2":"a silent turquoise lightning flash held within a round floating crystal lens",
"P_F1":"a single vivid ember bursting from an angular charcoal coal with old copper sparks",
"P_F2":"an angular blade glowing orange as it emerges from an old brass furnace",
"P_X1":"a purple poisonous ink drop suspended over an angular copper brush tip",
"P_X2":"warm amber life motes spiraling into an old copper vessel wrapped in purple ink ribbons",
"P_S1":"a misleading path splitting into angular charcoal-purple smoky doorways",
"P_S2":"a dramatic angular night cloak encircling an old brass lantern with ember light",
"S_G_BV":"signature oath of sprouting, round glass shield crowned by a radiant jade leaf tree and seed lantern heart",
"S_G_BP":"signature crystal judgment, majestic round ivory glass crest radiating turquoise crystal rays",
"S_G_VP":"signature light trail, jade ribbons and golden light weaving a luminous bridge through round glass hoops",
"S_E_FX":"signature ancient furnace bell, massive angular old copper bell glowing orange from within amid ash sparks",
"S_E_FS":"signature twilight blade, two angular copper blades drawing a blazing orange arc through purple smoke",
"S_E_XS":"signature sealed mist, angular copper seal vessel surrounded by purple ink and amber motes, no written glyphs",
"TK_G_SEED":"tiny friendly seed lantern creature, round luminous seed body with two jade leaf arms and root feet",
"TK_G_LANTERN":"small round brass-and-ivory guard lantern automaton with stubby wooden feet, jade glass shield and gentle glow",
"TK_E_CINDER":"small mischievous cinder imp, angular charcoal body with ember-orange cracks, old copper mask and short claw feet",
"volcano":"an ancient angular charcoal furnace crater on a floating ash island, restrained orange lava glow and old copper chimneys",
"storm_peak":"a lofty silver thunder peak on a floating island, turquoise lightning between ivory stone spires and dark blue clouds",
"frozen_lake":"a quiet turquoise frozen glass lake on a floating garden island, ivory frosted trees and crystalline reflections",
"desert":"golden floating dunes dotted with old brass wind bells and worn ivory stone arches under a muted blue sky",
"healing_spring":"a luminous jade spring weaving among soft rounded roots on a floating garden island, tiny fresh glowing leaf buds",
"ruined_arena":"a broken circular ivory stone arena on a floating island, fallen old brass bell towers and quiet jade moss",
"quiet_meadow":"a peaceful floating green meadow with rounded ivory stones, tender grasses, small seed lanterns and distant garden islands",
"board":"a quiet atmospheric wide panorama between the floating jade garden kingdom and distant charcoal-purple ash city, subtle ivory clouds, deep blue foreground with low contrast, no central focal object; used beneath a five-lane game board"
}
base="Use case: stylized-concept. Original OathFront hand-painted polished 2D adventure fantasy illustration. Textured painterly brushwork, softly luminous warm rim lighting, coherent wood/glass/brass materials, expressive charming characters, no gore."
records=[]
for kind, group in [("hero","heroes"),("card","cards"),("power","powers"),("token","tokens"),("terrain","locations")]:
    for a in catalog[group]:
        id=a["id"]
        cut=kind in ["hero","token"] or (kind=="card" and a["type"]=="UNIT")
        palette="GOOD rounded silhouettes, ivory wood/glass, jade turquoise cloth, new leaves and bright brass." if a.get("faction")=="GOOD" else "EVIL angular readable silhouettes, charcoal-purple, ember orange, old copper/brass, fictional masks and furnace motifs." if a.get("faction")=="EVIL" else "Atmospheric restrained jade turquoise, ivory stone, old brass and charcoal blue."
        composition="Full body/creature with intact feet, centered three-quarter stance, distinctive readable silhouette at 64px, at least 10 percent clear safe margins. Truly transparent background, no scenery or floor rectangle." if cut else "Centered distinct symbolic magical still-life composition, large clear focal motif, smoky understated painterly backdrop with safe margins." if kind=="power" else "Wide layered landscape composition, central landmark and quiet dark edges, readable as narrow horizontal terrain strip and square icon." if kind=="terrain" else "Distinct dynamic magical still-life scene, clear focal composition, no UI or card frame."
        prompt=f"{base} Asset {id}, {a['nameVi']}. Subject: {subjects.get(id,a['nameVi'])}. {palette} {composition} No text, writing, letters, numerals, rules, logos, UI, card frame or watermark."
        path=root / f"assets/source/prompts/{id}.txt"
        if not path.exists(): path.write_text(prompt+"\n")
        records.append({"id":id,"kind":kind,"artKey":a.get("artKey",a.get("portraitKey")),"fallbackLabel":a["nameVi"],"transparent":cut,"signature":id.startswith("S_") and kind=="power","prompt":path.read_text().strip()})
id="board"
prompt=f"{base} {subjects[id]}. Wide landscape, softly luminous restrained colors. No writing, logos, UI, rules, frame, characters or watermark."
(root / "assets/source/prompts/board.txt").write_text(prompt+"\n")
records.append({"id":id,"kind":"board","artKey":"board/scene.webp","fallbackLabel":"Ngũ Lộ","transparent":False,"signature":False,"prompt":prompt})
(root / "assets/source/requests.json").write_text(json.dumps(records,ensure_ascii=False,indent=2)+"\n")
print(len(records),"individual raster requests; existing prototypes preserved")
(root / "assets/source/effect-families.json").write_text(json.dumps({a["id"]:a["vfxFamily"] for group in ["cards","powers"] for a in catalog[group]},indent=2)+"\n")
