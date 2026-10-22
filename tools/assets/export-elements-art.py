"""Reproducible crops/resizes/atlases of selected image_gen masters; no semantic edits."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/source'
PUBLIC = ROOT / 'apps/web/public/assets'
FACES = {
    'briar': (.52, .11, .36), 'cairn': (.43, .17, .36),
    'rowan': (.64, .23, .38), 'solenne': (.59, .16, .34),
    'meridian': (.57, .14, .38), 'halcyon': (.61, .17, .48),
    'sable': (.52, .12, .38), 'brimstone': (.76, .38, .48),
}
records = []

def meta(path):
    data = path.read_bytes()
    im = Image.open(path)
    return dict(path=str(path.relative_to(ROOT)), bytes=len(data),
                sha256=hashlib.sha256(data).hexdigest(), width=im.width, height=im.height,
                alpha=im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 255)

def save(im, path, size, contain=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    if contain:
        out = Image.new('RGBA', size)
        fit = ImageOps.contain(im, (size[0]-12, size[1]-12), Image.Resampling.LANCZOS)
        out.alpha_composite(fit, ((size[0]-fit.width)//2, (size[1]-fit.height)//2))
    else:
        out = ImageOps.fit(im, size, Image.Resampling.LANCZOS)
    out.save(path, 'WEBP', quality=85, method=6, exact=True)
    record = meta(path)
    records.append(record)
    return '/assets/' + str(path.relative_to(PUBLIC))

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2)+'\n')

heroes = []
hero_requests = json.loads((SOURCE/'heroes-v5/generation.json').read_text())['requests']
for req in hero_requests:
    im = Image.open(SOURCE/'heroes-v5'/req['source']).convert('RGBA')
    cx, cy, span = FACES[req['key']]
    side = im.width*span
    box = tuple(round(v) for v in (cx*im.width-side/2, cy*im.height-side/2,
                                   cx*im.width+side/2, cy*im.height+side/2))
    portrait = im.crop((0, 0, im.width, int(im.height*.62)))
    entry = dict(id=req['id'], kind='hero', artKey=f"heroes/{req['id'].lower()}/portrait.webp")
    for variant, master, size, contain in [
        ('thumb', portrait, (256,256), False), ('hud', im.crop(box), (128,128), False),
        ('inspect', portrait, (512,512), False), ('bust', im, (640,960), True)]:
        entry[variant] = save(master, PUBLIC/'heroes-v5/heroes'/req['key']/f'{variant}.webp', size, contain)
    entry['faceCrop'] = box
    heroes.append(entry)
write(PUBLIC/'heroes-v5/manifest.json', dict(version='heroes-v5', catalogVersion='elements_v1', assets=heroes))

cards = []
card_requests = json.loads((SOURCE/'event-cards-v1/generation.json').read_text())['requests']
for req in card_requests:
    im = Image.open(SOURCE/'event-cards-v1'/req['source']).convert('RGBA')
    entry = dict(id=req['id'], kind='card', artKey=f"cards/{req['key']}.webp")
    for variant, size in [('thumb',(256,256)), ('inspect',(640,640)), ('cutout',(384,384))]:
        entry[variant] = save(im, PUBLIC/'event-cards-v1/cards'/f"{req['key']}-{variant}.webp", size, True)
    cards.append(entry)

# One supplemental sheet per quality updates every hero silhouette and adds twelve units.
roster = json.loads((PUBLIC/'heroes-v4/manifest.json').read_text())['assets']
hero_map = {a['id']: a for a in heroes}
# Public URLs resolve relative to apps/web/public, not the repository root.
atlas_sources = [(a['id'], PUBLIC.parent/hero_map.get(a['id'],a)['bust'].lstrip('/')) for a in roster]
atlas_sources += [(a['id'], PUBLIC.parent/a['cutout'].lstrip('/')) for a in cards]
atlases = []
for quality, tile in [('low',128), ('high',256)]:
    stride = tile+4
    sheet = Image.new('RGBA', (stride*8, stride*4))
    frames = {}
    for i,(id,path) in enumerate(atlas_sources):
        im = Image.open(path).convert('RGBA')
        fit = ImageOps.contain(im, (tile,tile), Image.Resampling.LANCZOS)
        x,y = (i%8)*stride+2, (i//8)*stride+2
        sheet.alpha_composite(fit, (x+(tile-fit.width)//2,y+tile-fit.height))
        frames[id] = dict(x=x,y=y,width=tile,height=tile)
    path = PUBLIC/'event-cards-v1/atlases'/f'cutouts-{quality}.webp'
    path.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(path,'WEBP',quality=85,method=6,exact=True)
    records.append(meta(path))
    atlases.append(dict(url='/assets/'+str(path.relative_to(PUBLIC)),quality=quality,
                        width=sheet.width,height=sheet.height,bytes=path.stat().st_size,frames=frames))
write(PUBLIC/'event-cards-v1/manifest.json', dict(version='event-cards-v1',catalogVersion='elements_v1',assets=cards,atlases=atlases))

for version in ['world-v1','features-v2']:
    assets=[]
    for req in json.loads((SOURCE/version/'generation.json').read_text())['requests']:
        im=Image.open(SOURCE/version/req['source']).convert('RGB')
        entry=dict(key=req['key'])
        for variant,size in [('wide',(1920,1080)),('medium',(1200,675)),('small',(768,432))]:
            entry[variant]=save(im,PUBLIC/version/f"{req['key']}-{variant}.webp",size)
        assets.append(entry)
    write(PUBLIC/version/'manifest.json',dict(version=version,assets=assets))
home=Image.open(SOURCE/'home-v3/ensemble.png').convert('RGB')
home_assets={variant:save(home,PUBLIC/'home-v3'/f'ensemble-{variant}.webp',size)
             for variant,size in [('wide',(1920,1080)),('medium',(1200,675)),('small',(768,432))]}
write(PUBLIC/'home-v3/manifest.json',dict(version='home-v3',**home_assets))

for version in ['heroes-v5','event-cards-v1','world-v1','features-v2','home-v3']:
    masters=[meta(p) for p in sorted((SOURCE/version).glob('*.png'))]
    exports=[r for r in records if '/'+version+'/' in r['path']]
    write(SOURCE/version/'manifest.json',dict(version=version,tool='built-in image_gen',
          promptPath=f'assets/source/{version}/generation.json',sources=masters,exports=exports,
          license='assets/source/LICENSE.md'))

review=Image.new('RGB',(1600,1000),'#eeede7'); draw=ImageDraw.Draw(review)
for i,a in enumerate(roster):
    a=hero_map.get(a['id'],a); x,y=(i%5)*320,(i//5)*250
    for variant,offset,size in [('bust',0,(160,220)),('hud',170,(128,128))]:
        im=Image.open(PUBLIC.parent/a[variant].lstrip('/')).convert('RGBA'); im.thumbnail(size)
        review.paste(im,(x+offset,y+26),im)
    draw.text((x+8,y+8),a['id'],fill='#202127')
review.save(SOURCE/'heroes-v5/roster-review.jpg',quality=90)
review=Image.new('RGB',(1200,900),'#202733'); draw=ImageDraw.Draw(review)
for i,a in enumerate(cards):
    x,y=(i%4)*300,(i//4)*300
    im=Image.open(PUBLIC.parent/a['thumb'].lstrip('/')).convert('RGBA')
    review.paste(im,(x+20,y+28),im); draw.text((x+15,y+9),a['id'],fill='white')
review.save(SOURCE/'event-cards-v1/review.jpg',quality=90)
max_bytes=max(r['bytes'] for r in records)
assert max_bytes < 1500000, f'Asset exceeds 1.5MB budget: {max_bytes}'
assert all(r['alpha'] for r in records if '/heroes-v5/' in r['path'] or '/event-cards-v1/' in r['path'])
print(json.dumps(dict(exports=len(records),bytes=sum(r['bytes'] for r in records),largest=max_bytes)))
