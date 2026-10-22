"""Validate the delivered art bundle without regenerating expensive WebP exports."""
from pathlib import Path
from PIL import Image
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
counts = {'heroes-v5': (8,32), 'event-cards-v1': (12,38), 'world-v1': (4,12),
          'features-v2': (4,12), 'home-v3': (1,3)}
checked = 0
for version, (sources, exports) in counts.items():
    manifest = json.loads((ROOT/'assets/source'/version/'manifest.json').read_text())
    assert len(manifest['sources']) == sources
    assert len(manifest['exports']) == exports
    for kind in ['sources','exports']:
        for record in manifest[kind]:
            path = ROOT/record['path']
            data = path.read_bytes()
            assert len(data) == record['bytes'], path
            assert hashlib.sha256(data).hexdigest() == record['sha256'], path
            with Image.open(path) as im:
                assert im.size == (record['width'],record['height']), path
                if version in ['heroes-v5','event-cards-v1']:
                    assert im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] == 0, path
            if kind == 'exports':
                assert record['bytes'] < 1_500_000, path
            checked += 1
    runtime = json.loads((ROOT/'apps/web/public/assets'/version/'manifest.json').read_text())
    def check_urls(value):
        if isinstance(value, dict):
            for item in value.values(): check_urls(item)
        elif isinstance(value, list):
            for item in value: check_urls(item)
        elif isinstance(value,str) and value.startswith('/assets/'):
            assert (ROOT/'apps/web/public'/value.lstrip('/')).is_file(), value
    check_urls(runtime)
    for atlas in runtime.get('atlases',[]):
        assert len(atlas['frames']) == 32
        for frame in atlas['frames'].values():
            assert frame['x'] >= 0 and frame['y'] >= 0
            assert frame['x']+frame['width'] <= atlas['width']
            assert frame['y']+frame['height'] <= atlas['height']
print(f'PASS: {checked} source/export hashes, dimensions, alpha, byte budgets and public URLs; 32 supplemental atlas frames per quality.')
