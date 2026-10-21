"""Deterministic presentation-only derivatives; never mutates core-v1 atlases/content."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/source/rivals-v2'
PUBLIC = ROOT / 'apps/web/public/assets/rivals-v2'
PUBLIC.mkdir(parents=True, exist_ok=True)
manifest = {'version': 'rivals-v2', 'catalogVersion': 'core_v1', 'assets': []}
runtime = {'version': 'rivals-v2', 'catalogVersion': 'core_v1', 'assets': []}
requests = json.loads((SOURCE / 'generation.json').read_text())['requests']
core = json.loads((ROOT / 'apps/web/public/assets/core-v1/manifest.json').read_text())

def metadata(path):
    data = path.read_bytes()
    with Image.open(path) as im:
        return {'path': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'width': im.width, 'height': im.height, 'alpha': im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 255}

def export(im, path, size, crop=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    if crop:
        result = ImageOps.fit(im, size, Image.Resampling.LANCZOS)
    else:
        result = Image.new('RGBA', size)
        fit = ImageOps.contain(im, (size[0]-24, size[1]-24), Image.Resampling.LANCZOS)
        result.alpha_composite(fit, ((size[0]-fit.width)//2, (size[1]-fit.height)//2))
    result.save(path, 'WEBP', quality=86, method=6, exact=True)
    return metadata(path)

review = Image.new('RGB', (1200, 560), '#f0efe8')
draw = ImageDraw.Draw(review)
for i, req in enumerate(requests):
    source = SOURCE / req['source']
    im = Image.open(source).convert('RGBA')
    bounds = im.getchannel('A').getbbox()
    full = im.crop(bounds)
    # Upper-body crop has a stable face/shoulder scale, separate from the full silhouette stage.
    portrait = full.crop((int(full.width*.16), 0, int(full.width*.87), int(full.height*.47)))
    face = full.crop((int(full.width*.26), 0, int(full.width*.76), int(full.height*.31)))
    original = next(a for a in core['assets'] if a['id'] == req['id'])
    row = {'id': req['id'], 'kind': 'hero', 'artKey': original['artKey']}
    entry = {**row, 'source': metadata(source), 'bounds': bounds, 'promptPath': 'assets/source/rivals-v2/generation.json', 'provenance': 'Original OathFront character generated with built-in image_gen; exact prompt and selected PNG retained.', 'license': 'assets/source/LICENSE.md', 'exports': {}}
    for variant, master, size, crop in [('thumb', portrait, (256,256),True), ('hud', face, (128,128),True), ('inspect', portrait, (512,512),True), ('bust',full,(640,960),False)]:
        path = PUBLIC / 'heroes' / req['key'] / f'{variant}.webp'
        entry['exports'][variant] = export(master,path,size,crop)
        row[variant] = '/assets/rivals-v2/' + str(path.relative_to(PUBLIC))
    tile = Image.open(PUBLIC / 'heroes' / req['key'] / 'thumb.webp')
    tile.thumbnail((190,190)); review.paste(tile,(i*200,25),tile)
    tile = Image.open(PUBLIC / 'heroes' / req['key'] / 'bust.webp')
    tile.thumbnail((190,310)); review.paste(tile,(i*200,225),tile)
    draw.text((i*200+8,5),req['key'],fill='#101218')
    manifest['assets'].append(entry); runtime['assets'].append(row)
source=SOURCE/'fivefold-board.png'; im=Image.open(source).convert('RGBA')
row={'id':'board','kind':'board','artKey':'board/scene.webp'}
entry={**row,'source':metadata(source),'promptPath':'assets/source/rivals-v2/board-generation.json','provenance':'Original shared Fivefold battlefield generated with built-in image_gen; exact prompt retained.','license':'assets/source/LICENSE.md','exports':{}}
for variant,name,size in [('thumb','scene.webp',(256,144)),('inspect','scene-inspect.webp',(800,450)),('wide','scene-wide.webp',(1600,900))]:
    path=PUBLIC/'board'/name
    entry['exports'][variant]=export(im,path,size,True)
    row[variant]='/assets/rivals-v2/'+str(path.relative_to(PUBLIC))
manifest['assets'].append(entry);runtime['assets'].append(row)
for path in (SOURCE/'fonts').iterdir():
    destination=PUBLIC/'fonts'/path.name;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,destination)
(SOURCE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(PUBLIC/'manifest.json').write_text(json.dumps(runtime,indent=2)+'\n')
review.save('/tmp/oathfront-rivals-export-review.jpg',quality=94)
print(json.dumps({'assets':len(manifest['assets']), 'webpBytes':sum(v['bytes'] for a in manifest['assets'] for v in a['exports'].values()),'boardBytes':entry['exports']['wide']['bytes'],'maxHeroStageBytes':max(a['exports'].get('bust',{}).get('bytes',0) for a in manifest['assets'])}))
