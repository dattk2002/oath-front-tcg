from PIL import Image, ImageDraw, ImageOps
from pathlib import Path
import json
import hashlib
root = Path(__file__).resolve().parents[2]
out = root / "docs/implementation/evidence/task15"
out.mkdir(parents=True, exist_ok=True)
sheet = Image.new("RGB", (1200, 800), "#101923")
draw = ImageDraw.Draw(sheet)
audit = {}
def checkers(size):
    im = Image.new("RGBA", size, "#1b2a38")
    d = ImageDraw.Draw(im)
    for y in range(0, size[1], 12):
        for x in range(0, size[0], 12):
            if (x // 12 + y // 12) % 2: d.rectangle((x,y,x+11,y+11), fill="#283e49")
    return im
def place(im, size, at, label):
    bg = checkers(size)
    fit = ImageOps.contain(im, size, Image.Resampling.LANCZOS)
    bg.alpha_composite(fit, ((size[0]-fit.width)//2, size[1]-fit.height))
    sheet.paste(bg.convert("RGB"), at)
    draw.text((at[0],at[1]-18), label, fill="#f4ebdd")
for id in ["H_G_BV", "GC01", "EC01", "ancient_forest"]:
    p=root / f"assets/source/art/{id}.png"
    im=Image.open(p).convert("RGBA")
    hist=im.getchannel("A").histogram()
    audit[id] = {"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"size":list(im.size), "fullyTransparentPixels":hist[0],"nearOpaquePixels":sum(hist[240:]), "alphaRange": im.getchannel("A").getextrema()}
    if id == "H_G_BV":
        portrait=im.crop((int(im.width*.18),0,int(im.width*.88),int(im.height*.47)))
        bust=im.crop((0,0,im.width,int(im.height*.59)))
        place(portrait,(160,160),(20,50),"Hero portrait / 160px")
        place(bust,(256,256),(210,50),"Hero bust / 256px")
        hud=im.crop((int(im.width*.34),int(im.height*.055),int(im.width*.78),int(im.height*.30)))
        place(hud,(72,72),(490,50),"HUD / 72px")
        portrait.save(out / "prototype-hero-portrait.png")
        bust.save(out / "prototype-hero-bust.png")
    elif id in ["GC01", "EC01"]:
        x=20 if id=="GC01" else 420
        place(im,(256,256),(x,390),id+" card / 256px")
        place(im,(48,64),(x+280,390),"Board 48x64")
        place(im,(64,80),(x+280,510),"Board 64x80")
    else:
        strip=ImageOps.fit(im,(320,96),Image.Resampling.LANCZOS)
        place(strip,(320,96),(590,50),"Terrain strip / 320x96")
        place(im,(128,64),(590,200),"Terrain lane / 128x64")
sheet.save(out / "prototype-contact-sheet.png")
(out / "prototype-alpha.json").write_text(json.dumps(audit,indent=2)+"\n")
print(json.dumps(audit,indent=2))
