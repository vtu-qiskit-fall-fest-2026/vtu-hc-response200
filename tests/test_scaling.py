"""Checks on the saved scaling study (results/scaling.json)."""
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / "results" / "scaling.json"


@pytest.fixture(scope="module")
def sc():
    if not FILE.exists():
        pytest.skip("run scripts/run_scaling.py first")
    return json.loads(FILE.read_text())


def test_sizes_are_measured_and_ordered(sc):
    jobs = [r["jobs"] for r in sc["sizes"]]
    assert jobs == list(range(4, 4 + len(jobs)))
    for r in sc["sizes"]:
        assert r["qubits"] == 2 * r["jobs"] and r["schedules"] == 4 ** r["jobs"]


def test_ratios_are_valid_and_qaoa_beats_random_in_the_ideal_case(sc):
    for r in sc["sizes"]:
        for key in ("qaoa_ideal", "random"):
            assert 0 <= r[key]["approx_ratio"] <= 1
        assert r["qaoa_ideal"]["approx_ratio"] > r["random"]["approx_ratio"]
        if "qaoa_noisy" in r:
            assert 0 <= r["qaoa_noisy"]["approx_ratio"] <= 1


def test_circuit_grows_with_size(sc):
    gates = [r["two_qubit_gates"] for r in sc["sizes"]]
    assert gates == sorted(gates)


def test_four_job_row_matches_the_demo_instance(sc):
    first = sc["sizes"][0]
    assert first["jobs"] == 4 and first["two_qubit_gates"] > 0
    assert all(v["gap_pct"] <= 1e-9 for v in first["classical"].values())
