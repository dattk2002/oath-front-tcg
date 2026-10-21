"""Validate the shipped derivatives separately from the immutable Pen masters."""
import hashlib
import re


def validate_runtime_assets(root, manifest, design_sha, nodes):
    root = root.resolve()
    public = (root / 'apps/web/public').resolve()
    if manifest['designSha256'] != design_sha:
        raise ValueError('runtime manifest design hash drift')

    def checked(base, name):
        path = (base / name).resolve()
        if not path.is_relative_to(base) or not path.is_file():
            raise ValueError(f'missing/unsafe asset path: {name}')
        return path

    def hashed(base, name, digest):
        if not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{64}', digest):
            raise ValueError(f'invalid required asset hash: {name}')
        path = checked(base, name)
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(f'asset hash drift: {name}')
        return path

    outputs = set()
    for item in manifest['assets']:
        name = item['output']
        if name in outputs:
            raise ValueError(f'duplicate output: {name}')
        outputs.add(name)
        path = hashed(public, name, item['sha256'])
        if 'source' in item:
            hashed(root, item['source'], item['sourceSha256'])
        if 'sourceNode' in item and item['sourceNode'] not in nodes:
            raise ValueError(f'unknown source node: {item["sourceNode"]}')
        if 'license' in item:
            checked(path.parent, item['license'])
    return len(outputs)
