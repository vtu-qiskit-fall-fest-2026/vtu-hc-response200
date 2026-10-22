import numpy as np
import pytest
from qiskit.quantum_info import Statevector

from greenq.classical import brute_force
from greenq.encoding import Encoding
from greenq.metrics import analyze, probs_to_counts
from greenq.model import Instance
from greenq.qaoa import GreenQAOA
from greenq import runner


@pytest.fixture(scope="module")
def enc():
    return Encoding(Instance(), 0.5)


@pytest.mark.parametrize("reps,gammas,betas", [(1, [0.7], [0.3]), (2, [0.4, 1.1], [2.8, 0.2])])
def test_fast_simulator_matches_qiskit_statevector(enc, reps, gammas, betas):
    q = GreenQAOA(enc, reps=reps)
    qiskit_probs = Statevector(q.bind(gammas, betas, measure=False)).probabilities()
    assert np.allclose(qiskit_probs, q.probabilities(gammas, betas), atol=1e-10)


def test_scaled_cost_operator_is_the_objective(enc):
    q = GreenQAOA(enc)
    diag = np.real(q.cost_op.to_matrix(sparse=True).diagonal())
    assert np.allclose(diag * q.scale + q.offset, enc.cost_vector())


def test_cvar_alpha_one_is_the_mean(enc):
    q = GreenQAOA(enc)
    p = q.probabilities([0.5], [0.4])
    assert q.cvar(p, 1.0) == pytest.approx(p @ q.cost)
    assert q.cvar(p, 0.1) <= q.cvar(p, 1.0)


def test_qaoa_beats_random_guessing(enc):
    res = GreenQAOA(enc, reps=1).optimize(grid=20)
    cost = enc.cost_vector()
    best, worst = brute_force(enc.inst, enc.w_carbon)
    ratio = (worst.objective - res.expected) / (worst.objective - best.objective)
    random_ratio = (worst.objective - cost.mean()) / (worst.objective - best.objective)
    assert ratio > random_ratio + 0.05
    assert res.probs[cost.argmin()] > 2 / len(cost)        # optimum at least 2x more likely than random


def test_sampler_finds_optimum(enc):
    q = GreenQAOA(enc, reps=1)
    res = q.optimize(grid=20)
    counts = runner.run_ideal(q.bind(res.gammas, res.betas), shots=2000)
    m = analyze(counts, enc)
    best, _ = brute_force(enc.inst, enc.w_carbon)
    assert m["found_optimum"]
    assert tuple(m["best_sampled_schedule"]) == best.schedule


def test_analyze_uniform_matches_random_baseline(enc):
    n = enc.n_qubits
    counts = {format(i, f"0{n}b"): 10 for i in range(2 ** n)}
    m = analyze(counts, enc)
    assert m["approx_ratio"] == pytest.approx(m["approx_ratio_random"])
    assert sum(probs_to_counts(np.full(2 ** n, 1 / 2 ** n), n, 500).values()) == 500
