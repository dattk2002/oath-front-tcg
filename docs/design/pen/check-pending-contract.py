"""Check the awaiting-design handoff, not a Pen file or implementation readiness."""
from pathlib import Path
import hashlib
import json
import re
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[3]
HANDOFF = ROOT / 'docs/design/pen'

# Required repository components and viewports are pinned independently of the JSON.
REQUIRED_COMPONENTS = {
    'shell_home': {
        'app/App.tsx#App',
        'app/layout.tsx#Layout',
    },
    'hero_roster': {
        'features/hero/HeroSelect.tsx#HeroSelect',
        'features/hero/HeroInspect.tsx#HeroInspect',
    },
    'decks_collection': {
        'features/deck/DeckScreen.tsx#DeckScreen',
        'features/deck/DeckList.tsx#DeckList',
        'features/deck/DeckBuilder.tsx#DeckBuilder',
        'features/deck/CardCollection.tsx#CardCollection',
        'features/deck/CardCollection.tsx#QuantityControls',
        'features/deck/ManaCurve.tsx#ManaCurve',
    },
    'setup': {
        'features/setup/PresetSetup.tsx#PresetSetup',
    },
    'mulligan': {
        'features/match/MatchScreen.tsx#MatchScreen',
        'features/match/Hand.tsx#Hand',
    },
    'battle': {
        'features/match/MatchScreen.tsx#MatchScreen',
        'features/match/MatchShell.tsx#MatchShell',
        'features/match/Board.tsx#Board',
        'features/match/HeroPanel.tsx#HeroPanel',
        'features/match/Hand.tsx#Hand',
        'features/match/PhaseControl.tsx#PhaseControl',
        'features/match/BattleScene.tsx#BattleScene',
    },
    'inspect_log': {
        'features/match/InspectPanel.tsx#InspectPanel',
        'features/match/BattleLog.tsx#BattleLog',
        'features/match/ArtImage.tsx#ArtImage',
    },
    'block_response': {
        'features/match/BlockResponse.tsx#BlockResponse',
    },
    'pause_recovery': {
        'features/match/PauseDialog.tsx#PauseDialog',
        'features/match/RecoveryControls.tsx#RecoveryControls',
        'features/auth/SessionRecovery.tsx#SessionRecovery',
    },
    'results_history': {
        'features/match/ResultDialog.tsx#ResultDialog',
        'features/match/ResultDialog.tsx#ResultDetail',
        'features/history/HistoryScreen.tsx#HistoryScreen',
    },
    'settings_tutorial': {
        'features/settings/SettingsDialog.tsx#SettingsDialog',
        'features/tutorial/TutorialOverlay.tsx#TutorialOverlay',
        'features/tutorial/tutorial-controller.tsx#TutorialEntry',
    },
    'auth': {
        'features/auth/AuthPanel.tsx#AuthPanel',
        'features/auth/MergeConflictDialog.tsx#MergeConflictDialog',
        'features/auth/SessionRecovery.tsx#SessionRecovery',
    },
}
REQUIRED_RESPONSIVE = {'mobile', 'compact', 'desktop', 'reflow'}


def require(condition, message):
    if not condition:
        raise SystemExit(f'FAIL: {message}')


def repo_path(value):
    path = (ROOT / value).resolve()
    require(path.is_relative_to(ROOT) and path.exists(), f'missing repo path: {value}')
    return path


data = json.loads((HANDOFF / 'design-contract.json').read_text())
require(data['contractVersion'] == 1, 'unsupported contract version')
require(data['status'] == 'awaiting_design', 'this checker supports awaiting_design only')
require(data['implementationReady'] is False, 'pending design cannot be implementation-ready')
require(set(data['source']) == {'path', 'sha256', 'revision', 'schemaVersion', 'documentId', 'inspectedAt'}, 'source fields changed')
require(all(value is None for value in data['source'].values()), 'actual design identity must remain unresolved')
require(data['conflictReview'] == {'status': 'not_performed_no_design', 'conflicts': None}, 'pending conflicts must not imply completed review')
require(all(value == 'not_run_no_design' for key, value in data['validation'].items() if key != 'evidencePaths'), 'pending validation cannot claim success')
require(data['validation']['evidencePaths'] == [], 'no design evidence exists yet')


def check_references(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key in {'repoPath', 'runtimeManifestPath', 'sourceManifestPath', 'englishCatalogPath', 'assetResolverPath'}:
                repo_path(item)
            elif key in {'repoPaths', 'protectedRepoPaths'}:
                for path in item:
                    repo_path(path)
            if key.startswith('pen'):
                require(item is None or (key == 'penNodesByContentId' and all(v is None for v in item.values())), f'{key} must remain unresolved')
            check_references(item)
    elif isinstance(value, list):
        for item in value:
            check_references(item)


check_references(data)
for item in data['repository']['inputs']:
    require(hashlib.sha256(repo_path(item['path']).read_bytes()).hexdigest() == item['sha256'], f'repository input drift: {item["path"]}')
css = repo_path('apps/web/src/styles/tokens.css').read_text()
tokens = dict(re.findall(r'^  (--[\w-]+): (.+);$', css, re.M))
mapped = {item['cssToken']: item['currentValue'] for item in data['tokenMappings']}
require(len(mapped) == len(data['tokenMappings']) and mapped == tokens, 'CSS token mapping differs from source')
for group in data['assetGroups']:
    manifest = json.loads(repo_path(group['runtimeManifestPath']).read_text())
    ids = [item['id'] for item in manifest['assets']]
    require(len(ids) == len(set(ids)) == group['expectedCount'], 'asset count or uniqueness mismatch')
    require(set(ids) == set(group['penNodesByContentId']), 'asset IDs differ from manifest')
    require(group['version'] == manifest['version'], 'asset version mismatch')
    for asset in manifest['assets']:
        for variant in ('thumb', 'hud', 'inspect', 'bust', 'wide', 'cutout'):
            if variant in asset:
                repo_path('apps/web/public' + asset[variant])
require([group['expectedCount'] for group in data['assetGroups']] == [7, 60], 'expected six heroes, board and sixty cards')
for collection in ('surfaceMappings', 'responsive', 'motionMappings'):
    ids = [item['logicalId'] for item in data[collection]]
    require(len(ids) == len(set(ids)), f'duplicate logical IDs in {collection}')
require({item['logicalId'] for item in data['surfaceMappings']} == set(REQUIRED_COMPONENTS), 'required screen family IDs differ')
require({item['logicalId'] for item in data['responsive']} == REQUIRED_RESPONSIVE, 'required responsive IDs differ')
component_count = 0
motion_ids = {item['logicalId'] for item in data['motionMappings']}
for surface in data['surfaceMappings']:
    require(set(surface['responsiveVariants']) == REQUIRED_RESPONSIVE, 'missing responsive requirement')
    expected = REQUIRED_COMPONENTS[surface['logicalId']]
    mappings = surface.get('componentMappings', [])
    keys = [item['repoPath'].removeprefix('apps/web/src/') + '#' + item['repoComponent'] for item in mappings]
    require(len(keys) == len(set(keys)) and set(keys) == expected, f'component coverage differs: {surface["logicalId"]}')
    expected_paths = {'apps/web/src/' + item.split('#', 1)[0] for item in expected}
    require(len(surface['repoPaths']) == len(expected_paths) and set(surface['repoPaths']) == expected_paths, f'repository path coverage differs: {surface["logicalId"]}')
    for mapping in mappings:
        source = repo_path(mapping['repoPath']).read_text()
        require(re.search(r'export\s+(?:default\s+)?function\s+' + re.escape(mapping['repoComponent']) + r'\b', source), f'component declaration missing: {mapping["repoComponent"]}')
        origins = mapping.get('originBindings', [])
        variants = [item.get('logicalVariant') for item in origins]
        require(origins and all(isinstance(item, str) and item for item in variants) and len(variants) == len(set(variants)), 'origin bindings need unique logical variants')
        for origin in origins:
            require('penOriginId' in origin and origin['penOriginId'] is None, 'origin ID must be explicitly unresolved')
            instances = origin.get('instances', [])
            usages = [item.get('logicalUsage') for item in instances]
            require(instances and all(isinstance(item, str) and item for item in usages) and len(usages) == len(set(usages)), 'instance bindings need unique logical usages')
            for instance in instances:
                require({'penInstanceId', 'penOverrides'} <= set(instance) and instance['penInstanceId'] is None and instance['penOverrides'] is None, 'instance ID and overrides must be explicitly unresolved')
        component_count += 1
    require(set(surface['motionCueIds']) <= motion_ids, 'unknown motion cue')

link_count = 0
for path in sorted(HANDOFF.glob('*.md')):
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', path.read_text()):
        if '://' in target or target.startswith('#'):
            continue
        target_path = unquote(target.split('#', 1)[0])
        require((path.parent / target_path).exists(), f'broken local link in {path.name}: {target}')
        link_count += 1
print(f'PASS: pending JSON; {len(tokens)} tokens; 67 asset IDs/exports; {len(data["surfaceMappings"])} screen families; {component_count} component relations; repository hashes/paths; {link_count} handoff links.')
print('DESIGN NOT VALIDATED: no .pen source, node mappings or implementation approval.')
