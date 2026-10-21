import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from pen_document import inspect_document


class PenDocumentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'design.pen'
        (self.path.parent / 'image.webp').write_bytes(b'image fixture')
        self.document = {
            'version': '2.20', 'variables': {'ink': {'type': 'color', 'value': '#101218'}},
            'children': [
                {'id': 'button', 'type': 'frame', 'reusable': True, 'children': [
                    {'id': 'label', 'type': 'text', 'content': 'Default', 'fill': '$ink'}]},
                {'id': 'nested', 'type': 'frame', 'reusable': True, 'children': [
                    {'id': 'inside', 'type': 'ref', 'ref': 'button'}]},
                {'id': 'screen', 'type': 'ref', 'ref': 'nested', 'descendants': {
                    'inside/label': {'content': 'Play now'}}},
                {'id': 'image', 'type': 'rectangle', 'fill': {
                    'type': 'image', 'url': 'image.webp', 'mode': 'fit'}},
            ],
        }

    def inspect(self, expected_sha=None):
        self.path.write_text(json.dumps(self.document))
        return inspect_document(self.path, expected_sha=expected_sha)

    def test_nested_instance_override_changes_only_its_instance(self):
        result = self.inspect()
        self.assertEqual(result['resolved']['screen']['children'][0]['children'][0]['content'], 'Play now')
        self.assertEqual(result['resolved']['button']['children'][0]['content'], 'Default')
        self.assertEqual(len(result['dependencies']), 1)

    def test_replacement_node_is_resolved_as_an_instance(self):
        self.document['children'][2]['descendants'] = {'inside': {
            'id': 'replacement', 'type': 'ref', 'ref': 'button',
            'descendants': {'label': {'content': 'Replacement'}}}}
        self.assertEqual(self.inspect()['resolved']['screen']['children'][0]['children'][0]['content'], 'Replacement')

    def test_missing_or_nonreusable_origin_is_rejected(self):
        self.document['children'][2]['ref'] = 'image'
        with self.assertRaisesRegex(ValueError, 'origin'):
            self.inspect()

    def test_unknown_override_target_is_rejected(self):
        self.document['children'][2]['descendants']['inside/missing'] = {'content': 'No'}
        with self.assertRaisesRegex(ValueError, 'override'):
            self.inspect()

    def test_reference_cycle_is_rejected(self):
        self.document['children'][0]['children'].append({'id': 'cycle', 'type': 'ref', 'ref': 'nested'})
        with self.assertRaisesRegex(ValueError, 'cycle'):
            self.inspect()

    def test_undefined_variable_is_rejected(self):
        self.document['children'][0]['children'][0]['fill'] = '$missing'
        with self.assertRaisesRegex(ValueError, 'variable'):
            self.inspect()

    def test_missing_and_escaped_image_paths_are_rejected(self):
        for url in ('missing.webp', '../image.webp', 'https://example.com/image.webp'):
            with self.subTest(url=url):
                self.document['children'][-1]['fill']['url'] = url
                with self.assertRaisesRegex(ValueError, 'image'):
                    self.inspect()

    def test_hash_drift_and_duplicate_ids_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'hash'):
            self.inspect(expected_sha=hashlib.sha256(b'old source').hexdigest())
        self.document['children'].append(copy.deepcopy(self.document['children'][0]))
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            self.inspect()


if __name__ == '__main__':
    unittest.main()
