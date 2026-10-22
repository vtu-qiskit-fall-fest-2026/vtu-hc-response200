"""Dewy only stands in free space: inside the viewport, in the right-edge lane on
desktop, never on the sidebar, the footer or the content area (widgets,
buttons, slider). Runs the real zone rules (web/src/components/mascot/zones.ts)
in Node. The browser check in scripts/ui_smoke.py also measures Dewy against
every widget and button while it wanders."""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / "web"


def spots():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js not installed")
    r = subprocess.run([node, "scripts/zones-check.mjs"], cwd=WEB, capture_output=True, text=True, timeout=30)
    if r.returncode != 0 and "Unknown file extension" in r.stderr:
        pytest.skip("this Node.js cannot run TypeScript directly (needs 22.6+)")
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_every_spot_is_free_space():
    rows = spots()
    assert {r["size"] for r in rows} >= {"1920x1080", "1366x768", "390x844"}
    for r in rows:
        for check in ("inViewport", "clearOfSidebar", "clearOfFooter", "clearOfContent", "inLane"):
            assert r[check], (r["size"], check, r["spot"])


def test_desktop_has_several_spots_phone_has_one():
    rows = spots()
    assert sum(r["size"] == "1920x1080" for r in rows) >= 3
    assert sum(r["size"] == "390x844" for r in rows) == 1
