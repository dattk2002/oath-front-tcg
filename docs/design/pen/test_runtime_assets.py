import copy
import hashlib
import tempfile
import unittest
from pathlib import Path
from runtime_assets import validate_runtime_assets


class RuntimeAssetsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'apps/web/public/assets').mkdir(parents=True)
        (self.root / 'source.png').write_bytes(b'source')
        (self.root / 'apps/web/public/assets/hero.webp').write_bytes(b'hero')
        self.manifest = {'designSha256': 'design-hash', 'assets': [{
            'output': 'assets/hero.webp', 'sha256': hashlib.sha256(b'hero').hexdigest(),
            'source': 'source.png', 'sourceSha256': hashlib.sha256(b'source').hexdigest()}]}

    def validate(self, manifest=None):
        validate_runtime_assets(self.root, manifest or self.manifest, 'design-hash', {'logo': {}})

    def test_valid_derivative(self):
        self.validate()

    def test_rejects_changed_derivative(self):
        (self.root / 'apps/web/public/assets/hero.webp').write_bytes(b'wrong')
        with self.assertRaisesRegex(ValueError, 'hash'):
            self.validate()

    def test_rejects_changed_source(self):
        (self.root / 'source.png').write_bytes(b'wrong')
        with self.assertRaisesRegex(ValueError, 'hash'):
            self.validate()

    def test_rejects_escape_duplicate_and_unknown_node(self):
        for field, value in [('output', '../../../../source.png'), ('sourceNode', 'missing')]:
            with self.subTest(field=field):
                manifest = copy.deepcopy(self.manifest)
                manifest['assets'][0][field] = value
                with self.assertRaises(ValueError):
                    self.validate(manifest)
        self.manifest['assets'].append(self.manifest['assets'][0])
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            self.validate()


if __name__ == '__main__':
    unittest.main()
