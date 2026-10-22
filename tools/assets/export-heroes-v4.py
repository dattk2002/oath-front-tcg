"""Export size/crop derivatives of generated originals; no semantic image edits."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib
import json
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/source/heroes-v4'
PUBLIC = ROOT / 'apps/web/public/assets/heroes-v4'
PUBLIC.mkdir(parents=True, exist_ok=True)
requests = json.loads((SOURCE / 'generation.json').read_text())['requests']
# Face focal points are reviewed against the generated full image, not inferred from class.
faces = {
'briar':(.55,.10,.34), 'aster':(.64,.13,.32), 'lumen':(.53,.13,.34),
'cinder':(.59,.13,.36), 'vesper':(.62,.10,.34), 'morrow':(.63,.13,.32),
'solenne':(.60,.17,.32), 'cairn':(.44,.17,.38), 'zephyr':(.73,.13,.34),
'meridian':(.63,.13,.32), 'mossweld':(.45,.30,.52), 'halcyon':(.52,.13,.32),
'rowan':(.63,.20,.38), 'rook':(.43,.14,.34), 'nyxara':(.45,.12,.32),
'brimstone':(.71,.19,.38), 'sable':(.53,.09,.34), 'vanta':(.61,.13,.40),
'gravemarch':(.62,.13,.36), 'scoria':(.64,.17,.37),
}
def metadata(path):
 data=path.read_bytes()
 with Image.open(path) as im:
  return {'path':str(path.relative_to(ROOT)), 'sha256':hashlib.sha256(data).hexdigest(), 'bytes':len(data), 'width':im.width, 'height':im.height,'alpha':im.mode=='RGBA' and im.getchannel('A').getextrema()[0]<255}
def export(im,path,size,crop=False):
 path.parent.mkdir(parents=True,exist_ok=True)
 if crop: result=ImageOps.fit(im,size,Image.Resampling.LANCZOS)
 else:
  result=Image.new('RGBA',size)
  fit=ImageOps.contain(im,(size[0]-16,size[1]-16),Image.Resampling.LANCZOS)
  result.alpha_composite(fit,((size[0]-fit.width)//2,(size[1]-fit.height)//2))
 result.save(path,'WEBP',quality=86,method=6,exact=True)
 return metadata(path)
manifest={'version':'heroes-v4','catalogVersion':'heroes_v1','assets':[]}
runtime={'version':'heroes-v4','catalogVersion':'heroes_v1','assets':[]}
review=Image.new('RGB',(1600,1000),'#eeede7');draw=ImageDraw.Draw(review)
for i,req in enumerate(requests):
 source=SOURCE/req['source']
 if not source.exists(): continue
 im=Image.open(source).convert('RGBA');full=im.crop(im.getchannel('A').getbbox())
 cx,cy,span=faces[req['key']]; side=span*im.width
 box=(round(cx*im.width-side/2),round(cy*im.height-side/2),round(cx*im.width+side/2),round(cy*im.height+side/2))
 face=im.crop(box)
 portrait=im.crop((0,0,im.width,int(im.height*.56)))
 row={'id':req['id'],'kind':'hero','artKey':f"heroes/{req['id'].lower()}/portrait.webp"}
 entry={**row,'source':metadata(source),'faceCrop':box,'promptPath':'assets/source/heroes-v4/generation.json','provenance':'Original OathFront hero generated using built-in image_gen; exact prompt and PNG retained.','license':'assets/source/LICENSE.md','exports':{}}
 for variant,master,size,crop in [('thumb',portrait,(256,256),True),('hud',face,(128,128),True),('inspect',portrait,(512,512),True),('bust',full,(640,960),False)]:
  path=PUBLIC/'heroes'/req['key']/f'{variant}.webp'
  entry['exports'][variant]=export(master,path,size,crop)
  row[variant]='/assets/heroes-v4/'+str(path.relative_to(PUBLIC))
 x=(i%5)*320;y=(i//5)*250
 tile=Image.open(PUBLIC/'heroes'/req['key']/'bust.webp');tile.thumbnail((160,220));review.paste(tile,(x,y+24),tile)
 tile=Image.open(PUBLIC/'heroes'/req['key']/'hud.webp');review.paste(tile,(x+170,y+50),tile)
 draw.text((x+8,y+8),req['key'],fill='#202127')
 manifest['assets'].append(entry);runtime['assets'].append(row)
(SOURCE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(PUBLIC/'manifest.json').write_text(json.dumps(runtime,indent=2)+'\n')
review.save(SOURCE/'crop-review.jpg',quality=92)
print(json.dumps({'heroes':len(manifest['assets']),'runtimeBytes':sum(v['bytes'] for a in manifest['assets'] for v in a['exports'].values())}))
