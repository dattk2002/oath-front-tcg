"""Deterministic art exports, shared padded atlases, manifest and review sheets.

Interface: Python3 + Pillow, run from repository root via build-atlas.ts.
Selected PNG masters and exact prompts must already exist; no network calls.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib
import json
import math
import shutil

ROOT=Path(__file__).resolve().parents[2]
PUBLIC=ROOT / "apps/web/public/assets/core-v1"
EVIDENCE=ROOT / "docs/implementation/evidence/task15"
PUBLIC.mkdir(parents=True,exist_ok=True)
EVIDENCE.mkdir(parents=True,exist_ok=True)
requests=json.loads((ROOT / "assets/source/requests.json").read_text())
crops=json.loads((ROOT / "assets/source/crops.json").read_text())
manifest={"id":"oathfront-core-art","version":1,"catalogVersion":"core_v1","assets":[],"atlases":[]}
runtime={"catalogVersion":"core_v1","assets":[],"atlases":[]}
cutouts=[]
review=[]

def metadata(path, alpha=False):
    content=path.read_bytes()
    result={"path":str(path.relative_to(ROOT)),"sha256":hashlib.sha256(content).hexdigest(),"bytes":len(content)}
    if path.suffix in [".png",".webp"]:
        with Image.open(path) as im: result.update(width=im.width,height=im.height,alpha=alpha)
    return result

def url(path): return "/assets/core-v1/"+str(path.relative_to(PUBLIC))

def export(im,path,size,mode="contain"):
    path.parent.mkdir(parents=True,exist_ok=True)
    if mode=="fit": result=ImageOps.fit(im,size,Image.Resampling.LANCZOS)
    else:
        result=Image.new("RGBA",size)
        fit=ImageOps.contain(im,size,Image.Resampling.LANCZOS)
        result.alpha_composite(fit,((size[0]-fit.width)//2,size[1]-fit.height))
    result.save(path,"WEBP",quality=86,method=6,exact=True)
    return metadata(path,im.getchannel("A").getextrema()[0]<255)

for request in requests:
    id=request["id"]; kind=request["kind"]
    original=ROOT / f"assets/source/art/{id}.png"
    if not original.exists(): raise SystemExit("Missing original illustration: "+id)
    im=Image.open(original).convert("RGBA")
    source=metadata(original,request["transparent"])
    source.update(promptPath=f"assets/source/prompts/{id}.txt",tool="image_gen built-in")
    source_size=im.size
    bbox=im.getchannel("A").getbbox() if request["transparent"] else (0,0,im.width,im.height)
    if id in crops["terrain"]:
        bbox=crops["terrain"][id]
        im=im.crop(bbox)
    entry={"id":id,"version":1,"kind":kind,"artKey":request["artKey"],"fallbackLabel":request["fallbackLabel"],"containsRulesText":False,"source":source,"provenance":"Original illustration generated for OathFront with OpenAI built-in image_gen; exact authored prompt and selected original retained in repository. No external artwork or trademarks.","license":"Original project-generated asset; use/distribution under repository asset license (assets/source/LICENSE.md); no claim of exclusive copyright in raw AI output.","bounds":{"x":bbox[0],"y":bbox[1],"width":bbox[2]-bbox[0],"height":bbox[3]-bbox[1]},"anchor":{"x":.5,"y":1},"size":{"width":im.width,"height":im.height},"atlasGroup":"cutouts" if request["transparent"] else None,"exports":{},"signature":request["signature"]}
    target=PUBLIC / request["artKey"]
    entry["size"]={"width":source_size[0],"height":source_size[1]}
    mode="fit" if kind in ["terrain","board","hero"] else "contain"
    illustration=im
    if kind=="hero":
        illustration=im.crop((int(im.width*.18),0,int(im.width*.88),int(im.height*.47)))
    entry["exports"]["thumb"]=export(illustration,target,(256,256),mode)
    inspect=target.with_name(target.stem+"-inspect.webp")
    entry["exports"]["inspect"]=export(illustration,inspect,(512,512),mode)
    row={"id":id,"kind":kind,"artKey":request["artKey"],"fallbackLabel":request["fallbackLabel"],"thumb":url(target),"inspect":url(inspect)}
    if request["transparent"]:
        cut=PUBLIC / f"cutouts/{id.lower()}.webp"
        entry["cutout"]=export(im,cut,(512,512))
        row["cutout"]=url(cut)
        cutouts.append((id,im))
    if kind=="hero":
        bust=im.crop((0,0,im.width,int(im.height*.59)))
        hud_bounds=crops["hud"].get(id,crops["hud"]["default"])
        hud=im.crop(tuple(int(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(hud_bounds)))
        for key,master,size in [("bust",bust,(512,512)),("hud",hud,(128,128))]:
            p=target.with_name(key+".webp")
            entry["exports"][key]=export(master,p,size,"fit" if key=="hud" else "contain")
            row[key]=url(p)
        # Deterministic motif crop from the master glass/brass material near the staff.
        p=target.with_name("motif.webp")
        entry["exports"]["motif"]=export(im.crop((0,0,int(im.width*.4),int(im.height*.4))),p,(128,128))
        row["motif"]=url(p)
    if kind=="terrain":
        p=target.with_name(target.stem+"-strip.webp")
        entry["exports"]["strip"]=export(im,p,(512,160),"fit")
        row["strip"]=url(p)
        p=target.with_name(target.stem+"-icon.webp")
        entry["exports"]["icon"]=export(im,p,(64,64),"fit")
        row["icon"]=url(p)
    if kind=="board":
        p=target.with_name("scene-wide.webp")
        entry["exports"]["wide"]=export(im,p,(1600,640),"fit")
        row["wide"]=url(p)
    review.append((id,illustration,request["fallbackLabel"]))
    manifest["assets"].append(entry);runtime["assets"].append(row)

for quality,pixels in [("low",128),("high",256)]:
    cell=pixels+4
    columns=7
    rows=math.ceil(len(cutouts)/columns)
    atlas=Image.new("RGBA",(columns*cell,rows*cell))
    frames={}
    for i,(id,im) in enumerate(cutouts):
        x=(i%columns)*cell+2;y=(i//columns)*cell+2
        fit=ImageOps.contain(im,(pixels,pixels),Image.Resampling.LANCZOS)
        atlas.alpha_composite(fit,(x+(pixels-fit.width)//2,y+pixels-fit.height))
        frames[id]={"x":x,"y":y,"width":pixels,"height":pixels}
    path=PUBLIC / f"atlases/cutouts-{quality}.webp"
    path.parent.mkdir(parents=True,exist_ok=True)
    atlas.save(path,"WEBP",lossless=True,method=6,exact=True)
    atlas_entry={**metadata(path,True),"quality":quality,"frames":frames}
    manifest["atlases"].append(atlas_entry)
    runtime["atlases"].append({"url":url(path),"quality":quality,"width":atlas.width,"height":atlas.height,"frames":frames,"bytes":atlas_entry["bytes"]})

# Code-native VFX geometry is deliberately separate from the illustrated assets.
colors={"kinetic":"#f4cb76","shield":"#76d9c4","growth":"#9cdb8b","prism":"#9ddcf4","ember":"#ffb078","ink":"#bd9fea","veil":"#b8c8d4"}
for index,(family,color) in enumerate(colors.items()):
    path=ROOT / f"assets/source/vfx/{family}.svg";path.parent.mkdir(parents=True,exist_ok=True)
    shapes=[f'<path d="M12 32 L52 32 M42 20 L54 32 L42 44"/>',f'<path d="M32 6 L54 16 L50 44 L32 58 L14 44 L10 16 Z"/>',f'<path d="M32 58 Q8 24 12 8 Q42 8 32 58 M32 58 Q54 36 52 16 Q30 16 32 58"/>',f'<path d="M32 4 L58 32 L32 60 L6 32 Z M32 4 L32 60 M6 32 L58 32"/>',f'<path d="M32 6 Q12 26 16 44 Q32 64 48 44 Q52 26 32 6 Z M32 24 Q22 42 32 50 Q44 42 32 24"/>',f'<path d="M32 6 Q4 30 16 48 Q32 64 50 46 Q60 32 32 6 Z"/><circle cx="10" cy="12" r="3"/>',f'<path d="M8 22 Q24 2 40 22 Q56 42 16 44 M8 36 Q24 16 40 36 Q56 56 16 58"/>'][index]
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g stroke="{color}" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">{shapes}</g></svg>\n')
    public=PUBLIC / f"vfx/{family}.svg";public.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,public)
    manifest["assets"].append({"id":"vfx-"+family,"version":1,"kind":"vfx","artKey":"vfx/"+family+".svg","fallbackLabel":family,"containsRulesText":False,"source":{**metadata(path),"tool":"authored SVG geometry"},"provenance":"Original reusable game-effect geometry authored in tools/assets/export-assets.py and rendered by Pixi Graphics.","license":"Project-authored original source; repository asset license.","bounds":{"x":0,"y":0,"width":64,"height":64},"anchor":{"x":.5,"y":.5},"size":{"width":64,"height":64},"atlasGroup":None,"exports":{"icon":metadata(public)}})

for source in sorted((ROOT / "assets/source/audio").glob("*.wav")):
    id=source.stem;music=id in ["menu","battle"]
    public=PUBLIC / f"audio/{id}.{'wav' if music else 'mp3'}"
    manifest["assets"].append({"id":("music-" if music else "sfx-")+id,"version":1,"kind":"music" if music else "sfx","artKey":"audio/"+public.name,"fallbackLabel":id,"containsRulesText":False,"source":{**metadata(source),"tool":"authored Python PCM synthesis"},"provenance":"Original OathFront composition/sound design in tools/assets/compose-audio.py, Python3 standard library. No samples or external recordings. WAV masters retained; ffmpeg libmp3lame exports SFX. Eight-bar scores use exact PCM loop boundaries.","license":"Project-authored original audio/source; repository asset license.","bounds":{"x":0,"y":0,"width":1,"height":1},"anchor":{"x":.5,"y":1},"size":{"width":1,"height":1},"atlasGroup":None,"exports":{"audio":metadata(public)}})

(ROOT / "assets/source/manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
(PUBLIC / "manifest.json").write_text(json.dumps(runtime,ensure_ascii=False,separators=(",",":"))+"\n")

for page in range(math.ceil(len(review)/24)):
    sheet=Image.new("RGB",(1200,6*236),"#101923");draw=ImageDraw.Draw(sheet)
    for j,(id,im,label) in enumerate(review[page*24:(page+1)*24]):
        x=(j%6)*200;y=(j//6)*236
        tile=Image.new("RGBA",(192,192),"#283e49")
        fit=ImageOps.contain(im,(192,192),Image.Resampling.LANCZOS)
        tile.alpha_composite(fit,((192-fit.width)//2,192-fit.height))
        sheet.paste(tile.convert("RGB"),(x,y+22));draw.text((x+2,y+4),id,fill="#f4ebdd")
    sheet.save(EVIDENCE / f"art-contact-{page+1}.jpg",quality=93)

budgets={}
for quality in ["low","high"]:
    atlas=next(a for a in runtime["atlases"] if a["quality"]==quality)
    pool=[a["exports"]["strip"] for a in manifest["assets"] if a["kind"]=="terrain"]
    board=next(a["exports"]["wide"] for a in manifest["assets"] if a["kind"]=="board")
    budgets[quality]={"preloadBytes":atlas["bytes"]+sum(a["bytes"] for a in pool)+board["bytes"],"decodedRGBABytes":(atlas["width"]*atlas["height"]+sum(a["width"]*a["height"] for a in pool)+board["width"]*board["height"])*4,"atlasPages":1,"inspectImagesPreloaded":False}
(EVIDENCE / "asset-budgets.json").write_text(json.dumps(budgets,indent=2)+"\n")
print(f"Exported {len(requests)} original illustrations; {len(cutouts)} alpha cutouts; {len(manifest['assets'])} manifest assets; padded atlases and contact sheets")
print(json.dumps(budgets,indent=2))
