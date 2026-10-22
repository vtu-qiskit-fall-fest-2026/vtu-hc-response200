"""Classical baselines.

* brute_force: tries every schedule (n_options ** n_jobs of them). This is the
  ground truth we score the quantum result against. It is only possible
  because our instance is small; it grows exponentially with the job count.
* naive: business as usual (home site, run immediately), from model.py.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import product

from .model import Instance


@dataclass
class Result:
    schedule: tuple[int, ...]
    objective: float
    kg_co2: float
    litres: float


def evaluate(inst: Instance, schedule: tuple[int, ...], w_carbon: float) -> Result:
    co2, water = inst.footprint(schedule)
    return Result(tuple(schedule), inst.objective(schedule, w_carbon), float(co2), float(water))


def brute_force(inst: Instance, w_carbon: float = 0.5) -> tuple[Result, Result]:
    """Return (best, worst) schedules by exhaustive search."""
    best = worst = None
    for sched in product(range(inst.n_options), repeat=inst.n_jobs):
        val = inst.objective(sched, w_carbon)
        if best is None or val < best[1]:
            best = (sched, val)
        if worst is None or val > worst[1]:
            worst = (sched, val)
    return evaluate(inst, best[0], w_carbon), evaluate(inst, worst[0], w_carbon)


def naive(inst: Instance, w_carbon: float = 0.5) -> Result:
    return evaluate(inst, inst.naive, w_carbon)
