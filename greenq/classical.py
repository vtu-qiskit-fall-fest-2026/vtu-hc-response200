"""Classical baselines.

* brute_force: tries every schedule (n_options ** n_jobs of them). This is the
  ground truth we score the quantum result against. It is only possible
  because our instance is small; it grows exponentially with the job count.
* naive: business as usual (home site, run immediately), from model.py.
* greedy, simulated_annealing, random_sampling: fair classical competitors
  that QAOA is compared against (see scripts/run_baselines.py).
"""
from __future__ import annotations

import math
import time
from dataclasses import dataclass
from itertools import product

import numpy as np

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


# ---------------------------------------------------------------------------
# Fair classical competitors (Feature 1). Both work on the same objective as
# QAOA and brute force: local cost per job plus the pairwise overlap cost.
# ---------------------------------------------------------------------------


def _tables(inst: Instance, w_carbon: float):
    """Objective split into per-job option costs and per-pair overlap costs."""
    wt = inst.weights(w_carbon)
    local = inst.local @ wt                                   # (jobs, options)
    pair = {ij: float(v @ wt) for ij, v in inst.pair.items()}  # same-option penalty
    return local, pair


def greedy(inst: Instance, w_carbon: float = 0.5) -> Result:
    """Largest job first; each takes the option with the lowest added cost
    given the jobs already placed (overlap cost included)."""
    local, pair = _tables(inst, w_carbon)
    order = sorted(range(inst.n_jobs), key=lambda j: -inst.energy[j])
    sched: list[int | None] = [None] * inst.n_jobs
    for j in order:
        def added(k: int) -> float:
            extra = sum(pair[(min(i, j), max(i, j))] for i in range(inst.n_jobs) if sched[i] == k)
            return local[j, k] + extra
        sched[j] = min(range(inst.n_options), key=added)
    return evaluate(inst, tuple(sched), w_carbon)  # type: ignore[arg-type]


def simulated_annealing(inst: Instance, w_carbon: float = 0.5, steps: int | None = None,
                        restarts: int = 3, seed: int = 1) -> Result:
    """Single-job reassignment moves with geometric cooling; best of a few restarts."""
    local, pair = _tables(inst, w_carbon)
    n, m = inst.n_jobs, inst.n_options
    steps = steps or 400 * n
    rng = np.random.default_rng(seed)

    def cost(s: list[int]) -> float:
        c = sum(local[j, s[j]] for j in range(n))
        return c + sum(v for (i, j), v in pair.items() if s[i] == s[j])

    def delta(s: list[int], j: int, k: int) -> float:
        d = local[j, k] - local[j, s[j]]
        for i in range(n):
            if i == j:
                continue
            p = pair[(min(i, j), max(i, j))]
            d += p * ((s[i] == k) - (s[i] == s[j]))
        return d

    scale = float(np.ptp(local)) or 1.0
    best_s, best_c = None, math.inf
    for _ in range(restarts):
        s = [int(x) for x in rng.integers(0, m, n)]
        c = cost(s)
        t0, t1 = 0.5 * scale, 0.002 * scale
        for step in range(steps):
            temp = t0 * (t1 / t0) ** (step / max(steps - 1, 1))
            j = int(rng.integers(n))
            k = int(rng.integers(m - 1))
            k = k + 1 if k >= s[j] else k            # a different option
            d = delta(s, j, k)
            if d <= 0 or rng.random() < math.exp(-d / temp):
                s[j] = k
                c += d
                if c < best_c:
                    best_s, best_c = list(s), c
        if c < best_c:
            best_s, best_c = list(s), c
    return evaluate(inst, tuple(best_s), w_carbon)  # type: ignore[arg-type]


def random_sampling(inst: Instance, w_carbon: float = 0.5, samples: int = 4000, seed: int = 2) -> Result:
    """Best of `samples` uniformly random schedules: the same shot budget QAOA gets."""
    rng = np.random.default_rng(seed)
    best = None
    for s in rng.integers(0, inst.n_options, size=(samples, inst.n_jobs)):
        sched = tuple(int(x) for x in s)
        val = inst.objective(sched, w_carbon)
        if best is None or val < best[1]:
            best = (sched, val)
    return evaluate(inst, best[0], w_carbon)


def timed(fn, *args, repeats: int = 5, **kwargs):
    """Run fn several times; return (result, median runtime in milliseconds)."""
    times, out = [], None
    for _ in range(repeats):
        t = time.perf_counter()
        out = fn(*args, **kwargs)
        times.append((time.perf_counter() - t) * 1000)
    return out, float(np.median(times))
