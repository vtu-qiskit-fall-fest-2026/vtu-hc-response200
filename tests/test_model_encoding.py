import itertools
from dataclasses import replace

import numpy as np
import pytest

from greenq import data as D
from greenq.classical import brute_force, naive
from greenq.encoding import Encoding
from greenq.model import Instance


@pytest.fixture
def inst():
    return Instance()


def test_cited_constants():
    assert D.GRID_AVG_T_PER_MWH == 0.710
    assert D.COAL_TOWER_L_PER_KWH == pytest.approx(2.60, abs=0.01)
    # illustrative day/night profile must average to the cited CEA figure
    assert np.mean([s.carbon_kg_per_kwh for s in D.SLOTS]) == pytest.approx(D.GRID_AVG_T_PER_MWH)


def test_footprint_by_hand(inst):
    # one job alone: CO2 = E * PUE * carbon, water = E * (WUE + PUE * grid water)
    k = inst.option_index("evap", "day")
    site, slot = inst.options[k]
    e = inst.jobs[0].it_energy_kwh
    co2, water = inst.local[0, k]
    assert co2 == pytest.approx(e * site.pue * slot.carbon_kg_per_kwh)
    assert water == pytest.approx(e * (site.wue_l_per_kwh["day"] + site.pue * slot.grid_water_l_per_kwh))


def test_congestion_only_when_sharing(inst):
    spread = (0, 1, 2, 3)
    shared = (0, 0, 2, 3)
    no_pairs = sum(inst.local[j, k] for j, k in enumerate(spread))
    assert np.allclose(inst.footprint(spread), no_pairs)
    alone = sum(inst.local[j, k] for j, k in enumerate(shared))
    assert np.allclose(inst.footprint(shared), alone + inst.pair[(0, 1)])


def test_encode_decode_roundtrip(inst):
    enc = Encoding(inst)
    assert enc.n_qubits == 8
    for sched in itertools.product(range(4), repeat=4):
        assert enc.decode(enc.encode(sched)) == sched


def test_every_bitstring_is_a_valid_schedule(inst):
    enc = Encoding(inst)
    for s in range(2 ** enc.n_qubits):
        assert enc.decode(format(s, "08b")) is not None


@pytest.mark.parametrize("w", [0.0, 0.5, 1.0])
def test_hamiltonian_diagonal_equals_objective(inst, w):
    """The quantum cost operator gives exactly the classical objective on every schedule."""
    enc = Encoding(inst, w)
    diag = np.real(enc.hamiltonian().to_matrix(sparse=True).diagonal())
    for sched in itertools.product(range(4), repeat=4):
        idx = int(enc.encode(sched), 2)
        assert diag[idx] == pytest.approx(inst.objective(sched, w), abs=1e-9)
    assert np.allclose(diag, enc.cost_vector())


def test_hamiltonian_with_unused_codes():
    """3 sites x 2 slots = 6 options -> 3 qubits per job, 2 unused codes get a penalty."""
    third = replace(D.SITES[1], key="air2", label="Site C")
    inst = Instance(jobs=D.JOBS[:2], sites=[*D.SITES, third])
    enc = Encoding(inst)
    assert enc.bits == 3
    diag = np.real(enc.hamiltonian().to_matrix(sparse=True).diagonal())
    assert np.allclose(diag, enc.cost_vector())
    best_idx = int(np.argmin(diag))
    assert enc.decode(format(best_idx, f"0{enc.n_qubits}b")) is not None


def test_brute_force_beats_naive(inst):
    for w in (0.0, 0.5, 1.0):
        best, worst = brute_force(inst, w)
        assert best.objective <= naive(inst, w).objective <= worst.objective
        assert best.objective == pytest.approx(Encoding(inst, w).cost_vector().min())
