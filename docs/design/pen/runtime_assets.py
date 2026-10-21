"""Validate the shipped derivatives separately from the immutable Pen masters."""
import hashlib


def validate_runtime_assets(root, manifest, design_sha, nodes):
    root = root.resolve()
    public = (root / 'apps/web/public').resolve()
    if manifest['designSha256'] != design_sha:
        raise ValueError('runtime manifest design hash drift')

    def checked(base, name, digest=None):
        path = (base / name).resolve()
        if not path.is_relative_to(base) or not path.is_file():
            raise ValueError(f'missing/unsafe asset path: {name}')
        if digest and hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(f'asset hash drift: {name}')
        return path

    outputs = set()
    for item in manifest['assets']:
        name = item['output']
        if name in outputs:
            raise ValueError(f'duplicate output: {name}')
        outputs.add(name)
        path = checked(public, name, item['sha256'])
        if 'source' in item:
            checked(root, item['source'], item['sourceSha256'])
        if 'sourceNode' in item and item['sourceNode'] not in nodes:
            raise ValueError(f'unknown source node: {item["sourceNode"]}')
        if 'license' in item:
            checked(path.parent, item['license'])
    return len(outputs)
