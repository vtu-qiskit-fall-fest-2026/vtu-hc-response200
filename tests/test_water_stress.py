import json
from pathlib import Path

import numpy as np
import pytest

from greenq import data as D
from greenq.classical import brute_force
from greenq.encoding import Encoding
from greenq.model import Instance

ROOT = Path(__file__).resolve().parents[1]


def test_no_stress_means_no_change():
    a, b = Instance(), Instance(site_stress=None, grid_stress=0.3)
    assert np.allclose(a.unit, b.unit)


def test_weighted_water_is_litres_times_multipliers():
    ss, gs = {"evap": 0.9, "air": 0.5}, 0.8
    inst = Instance(site_stress=ss, grid_stress=gs)
    for k, (s, t) in enumerate(inst.options):
        expected = s.wue_l_per_kwh[t.key] * ss[s.key] + s.pue * t.grid_water_l_per_kwh * gs
        assert inst.unit[k, 1] == pytest.approx(expected)
    # raw litres are unchanged by weighting
    plain = Instance()
    for sched in [(0, 1, 2, 3), (1, 1, 2, 3), (3, 3, 3, 3)]:
        assert inst.footprint_litres(sched) == pytest.approx(plain.footprint(sched)[1])


@pytest.mark.parametrize("key", list(D.CITY_PRESETS))
def test_city_presets_use_cited_scores_and_solve_consistently(key):
    ss, gs = D.stress_multipliers(key)
    p = D.CITY_PRESETS[key]
    for site in ("evap", "air"):
        assert ss[site] == pytest.approx(D.AQUEDUCT_BWS[p[site][1]][0] / 5)
    assert gs == pytest.approx(D.AQUEDUCT_INDIA[0] / 5)
    inst = Instance(site_stress=ss, grid_stress=gs)
    enc = Encoding(inst, 0.5)
    best, _ = brute_force(inst, 0.5)
    assert enc.cost_vector().min() == pytest.approx(best.objective)


def test_saved_city_results_match_the_model():
    f = ROOT / "results" / "cities.json"
    if not f.exists():
        pytest.skip("run scripts/run_cities.py")
    c = json.loads(f.read_text())
    for p in c["presets"]:
        ss, gs = D.stress_multipliers(p["key"])
        inst = Instance(site_stress=ss, grid_stress=gs)
        mid = next(s for s in p["sweep"] if s["w"] == 0.5)
        assert tuple(mid["schedule"]) == brute_force(inst, 0.5)[0].schedule
