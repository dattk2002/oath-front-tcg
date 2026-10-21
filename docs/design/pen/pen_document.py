"""Read-only inspection of the Pen 2.20 subset used by OathFront.

This validates references and dependencies, not the full Pen schema or rendering.
Source files are never rewritten. Instance IDs remain distinct from origin IDs.
"""
import copy
import hashlib
import json
from pathlib import Path


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from strings(child)


def inspect_document(path, expected_sha=None):
    path = Path(path).resolve()
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if expected_sha and expected_sha != digest:
        raise ValueError('source hash drift')
    document = json.loads(raw)
    if document.get('version') != '2.20':
        raise ValueError('unsupported Pen version; review its actual schema')
    nodes = {}
    for item in walk(document.get('children', [])):
        if 'id' not in item or 'type' not in item:
            continue
        if item['id'] in nodes:
            raise ValueError(f'duplicate node ID: {item["id"]}')
        if item['type'] not in {'frame', 'text', 'ref', 'rectangle', 'path'}:
            raise ValueError(f'unsupported node type: {item["type"]}')
        nodes[item['id']] = item
    variables = document.get('variables', {})
    for value in strings(document.get('children', [])):
        if value.startswith('$') and value[1:] not in variables:
            raise ValueError(f'undefined variable: {value}')
    dependencies = []
    urls = sorted({n['url'] for n in walk(document) if n.get('type') == 'image'})
    for url in urls:
        target = (path.parent / url).resolve()
        if '://' in url or not target.is_relative_to(path.parent) or not target.is_file():
            raise ValueError(f'unsafe or missing image: {url}')
        dependencies.append({'path': url, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size})

    def locate(root, address):
        current = root
        for segment in address.split('/'):
            found = []
            def visit(n):
                for child in n.get('children', []):
                    if child.get('id') == segment:
                        found.append(child)
                    visit(child)
            visit(current)
            if len(found) != 1:
                raise ValueError(f'unresolved/ambiguous override: {root.get("id")}/{address}')
            current = found[0]
        return current

    def resolve(node, trail=()):
        if node['type'] != 'ref':
            out = copy.deepcopy(node)
            if 'children' in out:
                out['children'] = [resolve(c, trail) for c in node['children']]
            return out
        origin_id = node.get('ref')
        if origin_id in trail:
            raise ValueError(f'reference cycle: {origin_id}')
        origin = nodes.get(origin_id)
        if not origin or not origin.get('reusable'):
            raise ValueError(f'missing/nonreusable origin: {origin_id}')
        out = resolve(origin, (*trail, origin_id))
        for key, value in node.items():
            if key not in {'type', 'ref', 'descendants', 'children'}:
                out[key] = copy.deepcopy(value)
        out['reusable'] = bool(node.get('reusable', False))
        if 'children' in node:
            out['children'] = [resolve(c, trail) for c in node['children']]
        for address, override in node.get('descendants', {}).items():
            target = locate(out, address)
            if 'type' in override:
                replacement = resolve(override, (*trail, origin_id))
                target.clear()
                target.update(replacement)
            else:
                target.update(copy.deepcopy({k: v for k, v in override.items() if k != 'children'}))
                if 'children' in override:
                    target['children'] = [resolve(c, (*trail, origin_id)) for c in override['children']]
        return out

    resolved = {n['id']: resolve(n) for n in document['children']}
    # Include replacements not directly traversed by any top-level instance.
    for node in nodes.values():
        if node['type'] == 'ref':
            resolve(node)
    return {'document': document, 'sha256': digest, 'nodes': nodes, 'resolved': resolved, 'dependencies': dependencies}
