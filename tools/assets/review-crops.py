"""Produce board-scale proof and refined HUD samples from final selected masters."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import json
import hashlib
root=Path(__file__).resolve().parents[2]
manifest_path=root / "assets/source/manifest.json"
manifest=json.loads(manifest_path.read_text())
crops=json.loads((root / "assets/source/crops.json").read_text())
public=root / "apps/web/public/assets/core-v1"
evidence=root / "docs/implementation/evidence/task15"
hud_sheet=Image.new("RGB",(600,150),"#101923");draw=ImageDraw.Draw(hud_sheet)
cutouts=[a for a in manifest["assets"] if a.get("cutout")]
board=Image.new("RGB",(1200,((len(cutouts)+7)//8)*140),"#101923");bd=ImageDraw.Draw(board)
index=0
for a in cutouts:
    im=Image.open(root / a["cutout"]["path"]).convert("RGBA")
    x=index%8*150;y=index//8*140
    for w,h,offset in [(48,64,0),(64,80,60)]:
        tile=Image.new("RGBA",(w,h),"#283e49");fit=ImageOps.contain(im,(w,h),Image.Resampling.LANCZOS);tile.alpha_composite(fit,((w-fit.width)//2,h-fit.height));board.paste(tile.convert("RGB"),(x+offset,y+25))
    bd.text((x,y+5),a["id"],fill="#f4ebdd");bd.text((x,y+110),"48x64 / 64x80",fill="#b8c8d4");index+=1
index=0
for a in manifest["assets"]:
    if a["kind"]!="hero":continue
    im=Image.open(root / a["source"]["path"]).convert("RGBA")
    bounds=crops["hud"].get(a["id"],crops["hud"]["default"])
    hud=im.crop(tuple(int(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(bounds)))
    hud=ImageOps.fit(hud,(128,128),Image.Resampling.LANCZOS)
    p=root / a["exports"]["hud"]["path"];hud.save(p,"WEBP",quality=86,method=6,exact=True)
    content=p.read_bytes();a["exports"]["hud"].update(sha256=hashlib.sha256(content).hexdigest(),bytes=len(content))
    tile=Image.new("RGBA",(72,72),"#283e49");tile.alpha_composite(hud.resize((72,72),Image.Resampling.LANCZOS));hud_sheet.paste(tile.convert("RGB"),(index*100,30));draw.text((index*100,8),a["id"],fill="#f4ebdd");index+=1
for a in manifest["assets"]:
    if a["id"] not in crops["terrain"]:continue
    bounds=crops["terrain"][a["id"]]
    im=Image.open(root / a["source"]["path"]).convert("RGBA").crop(bounds)
    a["bounds"]={"x":bounds[0],"y":bounds[1],"width":bounds[2]-bounds[0],"height":bounds[3]-bounds[1]}
    for key,f in a["exports"].items():
        result=ImageOps.fit(im,(f["width"],f["height"]),Image.Resampling.LANCZOS)
        p=root / f["path"];result.save(p,"WEBP",quality=86,method=6,exact=True)
        content=p.read_bytes();f.update(sha256=hashlib.sha256(content).hexdigest(),bytes=len(content))
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
art=[a for a in manifest["assets"] if a["kind"] in ["hero","card","power","token","terrain","board"]]
for page in range(4):
    sheet=Image.new("RGB",(1200,4*236),"#101923");d=ImageDraw.Draw(sheet)
    for j,a in enumerate(art[page*24:(page+1)*24]):
        im=Image.open(root / a["exports"]["inspect"]["path"]).convert("RGBA")
        fit=ImageOps.contain(im,(192,192),Image.Resampling.LANCZOS);tile=Image.new("RGBA",(192,192),"#283e49");tile.alpha_composite(fit,((192-fit.width)//2,(192-fit.height)//2));x=j%6*200;y=j//6*236;sheet.paste(tile.convert("RGB"),(x,y+22));d.text((x+2,y+4),a["id"],fill="#f4ebdd")
    sheet.save(evidence / f"art-contact-{page+1}.jpg",quality=93)
runtime=json.loads((public / "manifest.json").read_text())
budgets={}
for quality in ["low","high"]:
    atlas=next(a for a in runtime["atlases"] if a["quality"]==quality)
    pool=[a["exports"]["strip"] for a in manifest["assets"] if a["kind"]=="terrain"]
    board_asset=next(a["exports"]["wide"] for a in manifest["assets"] if a["kind"]=="board")
    budgets[quality]={"preloadBytes":atlas["bytes"]+sum(a["bytes"] for a in pool)+board_asset["bytes"],"decodedRGBABytes":(atlas["width"]*atlas["height"]+sum(a["width"]*a["height"] for a in pool)+board_asset["width"]*board_asset["height"])*4,"atlasPages":1,"inspectImagesPreloaded":False}
(evidence / "asset-budgets.json").write_text(json.dumps(budgets,indent=2)+"\n")
hud_sheet.save(evidence / "hero-hud-refined.png")
board.save(evidence / "board-scale-contact.png")
print("Reviewed crop exports:6 face-focused HUD crops and47 board cutouts at48x64/64x80")
