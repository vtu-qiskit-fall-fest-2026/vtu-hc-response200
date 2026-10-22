import itertools

import pytest

from greenq.classical import brute_force, greedy, random_sampling, simulated_annealing
from greenq.model import Instance


@pytest.fixture(scope="module")
def inst():
    return Instance()


def valid(inst, sched):
    return len(sched) == inst.n_jobs and all(0 <= k < inst.n_options for k in sched)


@pytest.mark.parametrize("w", [0.0, 0.5, 1.0])
def test_competitors_return_valid_schedules_no_better_than_optimum(inst, w):
    best, _ = brute_force(inst, w)
    for fn in (greedy, simulated_annealing, random_sampling):
        r = fn(inst, w)
        assert valid(inst, r.schedule)
        assert r.objective >= best.objective - 1e-12
        assert r.objective == pytest.approx(inst.objective(r.schedule, w))


@pytest.mark.parametrize("w", [0.0, 0.5, 1.0])
def test_annealing_reaches_the_optimum_on_the_demo_instance(inst, w):
    best, _ = brute_force(inst, w)
    assert simulated_annealing(inst, w).objective == pytest.approx(best.objective)


def test_greedy_matches_its_definition(inst):
    """Independent re-implementation: largest job first, each takes the option that
    adds the least cost (its own footprint + overlap with jobs already placed)."""
    wt = inst.weights(0.5)
    order = sorted(range(inst.n_jobs), key=lambda j: -inst.jobs[j].it_energy_kwh)
    placed = {}
    for j in order:
        def added(k):
            extra = sum(inst.pair[(min(i, j), max(i, j))] @ wt for i, ki in placed.items() if ki == k)
            return inst.local[j, k] @ wt + extra
        placed[j] = min(range(inst.n_options), key=added)
    assert greedy(inst, 0.5).schedule == tuple(placed[j] for j in range(inst.n_jobs))


def test_brute_force_is_exhaustive(inst):
    best, worst = brute_force(inst, 0.5)
    vals = [inst.objective(s, 0.5) for s in itertools.product(range(4), repeat=4)]
    assert best.objective == pytest.approx(min(vals)) and worst.objective == pytest.approx(max(vals))
