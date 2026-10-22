import itertools

import numpy as np
import pytest

from greenq import data as D
from greenq.classical import brute_force, greedy, random_sampling, simulated_annealing
from greenq.encoding import Encoding
from greenq.model import Instance

PRESETS = list(D.FLEX_PRESETS)


def inst_for(p):
    return Instance(constraints=D.FLEX_PRESETS[p]["rules"])


@pytest.mark.parametrize("p", PRESETS)
def test_business_as_usual_obeys_every_rule(p):
    inst = inst_for(p)
    assert inst.feasible(inst.naive)


def test_rules_restrict_options_as_documented():
    inst = Instance(constraints={"etl": {"deadline"}, "genome": {"residency"}, "train": {"priority"}})
    by_key = {j.key: i for i, j in enumerate(inst.jobs)}
    opt = inst.options
    assert all(opt[k][1].key == "day" for k in inst.allowed[by_key["etl"]])
    assert all(opt[k][0].key == "evap" for k in inst.allowed[by_key["genome"]])          # home site of genome
    assert all(opt[k][1].key == "night" for k in inst.allowed[by_key["train"]])         # submitted slot of train
    assert len(inst.allowed[by_key["video"] if "video" in by_key else by_key["render"]]) == 4


@pytest.mark.parametrize("p", PRESETS)
@pytest.mark.parametrize("w", [0.0, 0.5, 1.0])
def test_hamiltonian_matches_and_penalises_rule_breaking(p, w):
    inst = inst_for(p)
    enc = Encoding(inst, w)
    cost = enc.cost_vector()
    diag = np.real(enc.hamiltonian().to_matrix(sparse=True).diagonal())
    assert np.allclose(diag, cost)
    ok = np.array([inst.feasible(enc.decode(format(i, "08b"))) for i in range(256)])
    # every rule-breaking schedule costs more than every allowed one
    assert cost[~ok].min() > cost[ok].max() if (~ok).any() else True
    # the lowest-energy state is the constrained brute-force optimum
    best, _ = brute_force(inst, w)
    assert cost.min() == pytest.approx(best.objective)
    # allowed schedules keep their exact classical cost
    for s in itertools.islice((s for s in itertools.product(*inst.allowed)), 20):
        assert cost[int(enc.encode(s), 2)] == pytest.approx(inst.objective(s, w))


@pytest.mark.parametrize("p", PRESETS)
def test_classical_competitors_obey_rules(p):
    inst = inst_for(p)
    for fn in (greedy, simulated_annealing, random_sampling):
        assert inst.feasible(fn(inst, 0.5).schedule)
