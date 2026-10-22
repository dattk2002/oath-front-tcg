"""Negative regressions for identity binding and non-destructive scene export."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools/assets" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SceneSafety(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.exporter = load("scene_export", "export-card-scenes.py")
        cls.inspector = load("scene_inspect", "inspect-card-scenes.py")
        cls.base = tempfile.TemporaryDirectory()
        cls.template = Path(cls.base.name) / "template"
        cls.exporter.export(cls.template, partial=True, selected={"B01"})

    @classmethod
    def tearDownClass(cls):
        cls.base.cleanup()

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.output = Path(self.directory.name) / "output"
        shutil.copytree(self.template, self.output)
        self.manifest_path = self.output / "source-manifest.json"
        self.manifest = json.loads(self.manifest_path.read_text())
        # A copied cache must be rebound to its actual destination by export.
        for row in self.manifest["assets"]:
            for variant, entry in row["exports"].items():
                entry["path"] = str(self.output / "cards" / f"{row['id'].lower()}-{variant}.webp")
        self.save()

    def tearDown(self):
        self.directory.cleanup()

    def save(self):
        self.manifest_path.write_text(json.dumps(self.manifest))

    def test_genuine_b01_files_cannot_be_claimed_as_gc01(self):
        inventory = json.loads((self.exporter.SOURCE / "inventory.json").read_text())["assets"]
        canonical = next(row for row in inventory if row["id"] == "GC01")
        self.manifest["assets"][0].update(canonical)
        self.manifest["missingSceneIds"] = [row["id"] for row in inventory if row["type"] != "TRICK" and row["id"] != "GC01"]
        self.save()
        runtime = json.loads((self.output / "manifest.json").read_text())
        runtime["assets"] = [{"id": "GC01", "artKey": "cards/gc01.webp", "thumb": "/assets/card-scenes-v1/cards/gc01-thumb.webp", "inspect": "/assets/card-scenes-v1/cards/gc01-inspect.webp"}]
        (self.output / "manifest.json").write_text(json.dumps(runtime))
        self.assertTrue(self.inspector.inspect(self.manifest_path, partial=True))

    def test_export_metadata_must_point_to_the_runtime_id_file(self):
        entry = self.manifest["assets"][0]["exports"]["thumb"]
        wrong = self.output / "cards" / "gc01-thumb.webp"
        shutil.copyfile(entry["path"], wrong)
        entry["path"] = str(wrong)
        self.save()
        self.assertTrue(self.inspector.inspect(self.manifest_path, partial=True))

    def test_retained_tricks_require_both_original_variants(self):
        del self.manifest["retainedTricks"][0]["exports"]["inspect"]
        self.save()
        self.assertTrue(self.inspector.inspect(self.manifest_path, partial=True))

    def test_retained_trick_cannot_use_another_trick_art(self):
        self.manifest["retainedTricks"][0]["exports"]["thumb"] = copy.deepcopy(self.manifest["retainedTricks"][1]["exports"]["thumb"])
        self.save()
        self.assertTrue(self.inspector.inspect(self.manifest_path, partial=True))

    def test_protected_original_trees_are_rejected_before_source_reads(self):
        original_root = self.exporter.ROOT
        self.exporter.ROOT = Path(self.directory.name) / "project"
        try:
            for relative in ("assets/source/fivefold-cards-v3", "apps/web/public/assets/fivefold-cards-v3", "apps/web/public/assets/core-v1/cards", "apps/web/public/assets"):
                with self.subTest(relative=relative):
                    destination = self.exporter.ROOT / relative
                    destination.mkdir(parents=True, exist_ok=True)
                    sentinel = destination / "manifest.json"
                    sentinel.write_text('{"version":"original-sentinel"}')
                    with self.assertRaisesRegex(ValueError, "[Pp]rotected"):
                        self.exporter.export(destination, partial=True, selected={"B01"})
                    self.assertEqual(sentinel.read_text(), '{"version":"original-sentinel"}')
        finally:
            self.exporter.ROOT = original_root

    def test_incompatible_existing_manifest_is_never_overwritten(self):
        sentinel = self.output / "manifest.json"
        sentinel.write_text('{"version":"fivefold-cards-v3"}')
        with self.assertRaisesRegex(ValueError, "[Ii]ncompatible"):
            self.exporter.export(self.output, partial=True, selected={"B01"})
        self.assertEqual(sentinel.read_text(), '{"version":"fivefold-cards-v3"}')

    def test_relocated_cache_uses_destination_metadata(self):
        # Restore template's old paths, as happens when an export directory is copied.
        self.manifest = json.loads((self.template / "source-manifest.json").read_text())
        self.save()
        before = (self.output / "cards/b01-thumb.webp").stat().st_mtime_ns
        result = self.exporter.export(self.output, partial=True, selected={"B01"})
        actual = json.loads(self.manifest_path.read_text())["assets"][0]["exports"]
        self.assertEqual(result["reusedVariants"], 2)
        self.assertEqual(actual["thumb"]["path"], str(self.output / "cards/b01-thumb.webp"))
        self.assertEqual(actual["inspect"]["path"], str(self.output / "cards/b01-inspect.webp"))
        self.assertEqual((self.output / "cards/b01-thumb.webp").stat().st_mtime_ns, before)
        self.assertEqual(self.inspector.inspect(self.manifest_path, partial=True), [])


if __name__ == "__main__":
    unittest.main()
