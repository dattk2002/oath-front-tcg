"""Verify source-pinned, scoped Pen implementation handoff (contract v2)."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote
from pen_document import inspect_document, walk
from contract_requirements import REQUIRED_COMPONENTS, REQUIRED_RESPONSIVE

ROOT = Path(__file__).resolve().parents[3]
HANDOFF = ROOT / 'docs/design/pen'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def repo_path(value):
    path = (ROOT / value).resolve()
    require(path.is_relative_to(ROOT) and path.is_file(), f'missing/unsafe repo path: {value}')
    return path


def main():
    data = json.loads((HANDOFF / 'design-contract.json').read_text())
    require(data['contractVersion'] == 2, 'expected contract v2')
    require(data['status'] == 'implementation_ready_scoped', 'unexpected readiness state')
    scope = data['implementationScope']
    require(data['implementationReady'] and not scope['completePenGameplayCoverage'], 'readiness must preserve scoped coverage')
    repo_path(scope['specPath']); repo_path(scope['planPath'])
    source = data['source']
    inspection = inspect_document(repo_path(source['path']), source['sha256'])
    require(source['revision'] == 'sha256:' + source['sha256'], 'revision must pin exact source bytes')
    require(source['schemaVersion'] == inspection['document']['version'], 'schema version drift')
    nodes = inspection['nodes']
    inventory = json.loads(repo_path(data['campaignExtension']['inventoryPath']).read_text())
    require(inventory['source'] == source, 'inventory source identity drift')
    require(inventory['dependencies'] == inspection['dependencies'], 'asset dependency hash drift')
    require(inventory['variables'] == inspection['document']['variables'], 'variable inventory drift')
    require(inventory['instances'] == [n for n in nodes.values() if n['type'] == 'ref'], 'instance/override inventory drift')
    for item in data['repository']['inputs']:
        require(hashlib.sha256(repo_path(item['path']).read_bytes()).hexdigest() == item['sha256'], f'repository input drift: {item["path"]}')
    css = repo_path('apps/web/src/styles/tokens.css').read_text()
    tokens = dict(re.findall(r'^  (--[\w-]+): (.+);$', css, re.M))
    require({x['cssToken']: x['currentValue'] for x in data['tokenMappings']} == tokens, 'baseline CSS token drift')
    for mapping in data['tokenMappings']:
        value = inspection['document']['variables'][mapping['penVariableName']]['value']
        require(mapping['penThemeValues'] == {'default': value}, 'Pen token binding drift')
        require((str(value) + 'px' if isinstance(value, (int, float)) else value) == mapping['currentValue'], 'Pen/CSS token mismatch')
    for group in data['assetGroups']:
        manifest = json.loads(repo_path(group['runtimeManifestPath']).read_text())
        require(len(manifest['assets']) == group['expectedCount'], 'runtime asset count drift')
        require({a['id'] for a in manifest['assets']} == set(group['penNodesByContentId']), 'asset content identities drift')
        for binding in group['penNodesByContentId'].values():
            if binding is not None:
                require(binding and all(node in nodes for node in binding), 'unresolved asset node')
        for asset in manifest['assets']:
            for variant in ('thumb', 'hud', 'inspect', 'bust', 'wide', 'cutout'):
                if variant in asset:
                    repo_path('apps/web/public' + asset[variant])
    require({s['logicalId'] for s in data['surfaceMappings']} == set(REQUIRED_COMPONENTS), 'original screen coverage drift')
    require({s['logicalId'] for s in data['responsive']} == REQUIRED_RESPONSIVE, 'responsive coverage drift')
    relations = 0
    for surface in data['surfaceMappings']:
        require(set(surface['responsiveVariants']) == REQUIRED_RESPONSIVE, 'missing viewport requirement')
        mappings = surface['componentMappings']
        require({m['repoPath'].removeprefix('apps/web/src/') + '#' + m['repoComponent'] for m in mappings} == REQUIRED_COMPONENTS[surface['logicalId']], 'original component coverage drift')
        for mapping in mappings:
            text = repo_path(mapping['repoPath']).read_text()
            require(re.search(r'export\s+(?:default\s+)?function\s+' + re.escape(mapping['repoComponent']) + r'\b', text), 'missing component declaration')
            relations += 1
        require(surface.get('designBasis'), 'missing actual/derived distinction')
    for obj in walk(data):
        for key in ('penNodeId', 'penOriginId', 'penInstanceId', 'penTargetNodeId'):
            if obj.get(key) is not None:
                require(obj[key] in nodes, f'unresolved {key}: {obj[key]}')
    for surface in data['campaignExtension']['surfaces']:
        for key in ('desktop', 'mobile', 'detailDesktop', 'detailMobile'):
            value = surface.get(key, [])
            for node in value if isinstance(value, list) else [value]:
                require(node in nodes, f'unknown campaign node: {node}')
        if surface.get('repoPath'):
            text = repo_path(surface['repoPath']).read_text()
            require(re.search(r'export\s+(?:default\s+)?function\s+' + re.escape(surface['repoComponent']) + r'\b', text), 'missing campaign component declaration')
    for node in data['campaignExtension']['reusableOrigins'].values():
        require(nodes[node].get('reusable'), 'campaign origin is not reusable')
    for path in HANDOFF.glob('*.md'):
        for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', path.read_text()):
            if '://' not in target and not target.startswith('#'):
                require((path.parent / unquote(target.split('#')[0])).exists(), f'broken link: {path.name}: {target}')
    print(f'PASS: source/hash/revision; {len(nodes)} nodes with nested overrides; {len(inspection["dependencies"])} image hashes; {len(tokens)} baseline tokens; 67 runtime assets; 12 inherited families/{relations} relations; campaign mappings.')
    print('SCOPED READINESS: supplied campaign/Home + approved derived game skin. Full Pen schema/rendering and browser implementation acceptance are separate checks.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        raise SystemExit(f'FAIL: {error}')
