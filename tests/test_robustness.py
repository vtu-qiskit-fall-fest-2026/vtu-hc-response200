"""Checks on the saved robustness study (results/robustness.json)."""
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / "results" / "robustness.json"


@pytest.fixture(scope="module")
def rb():
    if not FILE.exists():
        pytest.skip("run scripts/run_robustness.py first")
    return json.loads(FILE.read_text())


def test_histograms_sum_to_one_and_match_headlines(rb):
    for s in rb["studies"]:
        total = sum(h["share"] for h in s["histogram"])
        assert total == pytest.approx(1.0)
        assert s["histogram"][0]["share"] == pytest.approx(s["still_best"])
        assert 0 <= s["still_best"] <= s["within_5pct"] <= 1
        assert s["worst_regret_pct"] >= 0


def test_zero_error_means_zero_regret():
    import importlib.util
    spec = importlib.util.spec_from_file_location("rob", ROOT / "scripts" / "run_robustness.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.DRAWS = 5
    s = mod.study(0.0, 0.5, seed=1)
    assert s["still_best"] == 1.0 and s["worst_regret_pct"] == 0
