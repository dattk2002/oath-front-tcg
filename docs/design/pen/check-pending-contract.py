"""Compatibility entry for the source-pinned v2 design contract checker."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("check-design-contract.py")), run_name="__main__")
