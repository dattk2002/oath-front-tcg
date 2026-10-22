"""Responsive exports of original ensemble key art."""
from PIL import Image, ImageOps
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'assets/source/home-v2/ensemble.png'
public=ROOT/'apps/web/public/assets/home-v2';public.mkdir(parents=True,exist_ok=True)
im=Image.open(source).convert('RGB');rows=[]
for name,size in [('ensemble-wide',(1920,1080)),('ensemble-medium',(1200,675)),('ensemble-small',(768,432))]:
 path=public/(name+'.webp');ImageOps.fit(im,size,Image.Resampling.LANCZOS).save(path,'WEBP',quality=86,method=6)
 data=path.read_bytes();rows.append({'path':str(path.relative_to(ROOT)),'url':'/assets/home-v2/'+path.name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'width':size[0],'height':size[1]})
manifest={'version':'home-v2','source':{'path':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()},'promptPath':'assets/source/home-v2/generation.json','exports':rows}
(ROOT/'assets/source/home-v2/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(rows))
