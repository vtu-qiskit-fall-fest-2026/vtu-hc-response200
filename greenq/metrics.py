"""Score a measured distribution against the brute-force optimum.

* approximation ratio r = (worst - mean) / (worst - best): 1 = always optimal, 0 = always worst.
  Uniform random guessing gives r_random (reported alongside so the gain is visible).
* P(optimal): share of shots that landed exactly on the optimal schedule.
* share in best 10%: share of shots in the cheapest 10% of all schedules (random = 10%).
* best sampled: the cheapest schedule seen in any shot. This is what GreenQ outputs.
  (Honest note: with 256 schedules and thousands of shots, even random sampling
  would usually see the optimum; the distribution metrics above are what show
  the quantum circuit doing useful work.)
"""
from __future__ import annotations

import numpy as np

from .encoding import Encoding


def analyze(counts: dict[str, int], enc: Encoding, top: int = 10) -> dict:
    cost = enc.cost_vector()
    best, worst = float(cost.min()), float(cost.max())
    opt_states = set(np.flatnonzero(np.isclose(cost, best)).tolist())
    shots = sum(counts.values())
    idx = {b: int(b.replace(" ", ""), 2) for b in counts}
    mean = sum(cost[idx[b]] * c for b, c in counts.items()) / shots
    p_opt = sum(c for b, c in counts.items() if idx[b] in opt_states) / shots
    best_b = min(counts, key=lambda b: cost[idx[b]])
    span = worst - best
    # share of shots that land in the cheapest 10% of all schedules (random = 10%)
    rank = np.argsort(np.argsort(cost, kind="stable"), kind="stable")
    top_n = max(1, round(0.1 * len(cost)))
    top10 = sum(c for b, c in counts.items() if rank[idx[b]] < top_n) / shots
    ranked = sorted(counts.items(), key=lambda kv: -kv[1])[:top]
    return {
        "shots": shots,
        "mean_objective": float(mean),
        "approx_ratio": float((worst - mean) / span),
        "approx_ratio_random": float((worst - cost.mean()) / span),
        "p_optimal": float(p_opt),
        "p_optimal_random": len(opt_states) / len(cost),
        "share_best10pct": float(top10),
        "share_best10pct_random": top_n / len(cost),
        "best_sampled_bitstring": best_b,
        "best_sampled_schedule": list(enc.decode(best_b)),
        "best_sampled_objective": float(cost[idx[best_b]]),
        "found_optimum": idx[best_b] in opt_states,
        "optimal_objective": best,
        "worst_objective": worst,
        "top_outcomes": [
            {"bitstring": b, "count": c, "schedule": list(enc.decode(b)), "objective": float(cost[idx[b]])}
            for b, c in ranked
        ],
    }


def probs_to_counts(probs: np.ndarray, n_qubits: int, shots: int, seed: int = 0) -> dict[str, int]:
    rng = np.random.default_rng(seed)
    draws = rng.multinomial(shots, probs / probs.sum())
    return {format(i, f"0{n_qubits}b"): int(c) for i, c in enumerate(draws) if c}


def analyze_rules(counts: dict[str, int], enc: Encoding) -> dict:
    """Feature 2: scoring when jobs have rules. Rule-breaking schedules are
    penalised in the Hamiltonian; here we report how many shots obeyed every
    rule, and rank the obeying ones against all allowed schedules."""
    inst = enc.inst
    cost = enc.cost_vector()
    n = enc.n_qubits
    ok = np.array([bool((s := enc.decode(format(i, f"0{n}b"))) and inst.feasible(s)) for i in range(len(cost))])
    allowed = np.flatnonzero(ok)
    order = allowed[np.argsort(cost[allowed], kind="stable")]
    top_n = max(1, round(0.1 * len(allowed)))
    top = set(order[:top_n].tolist())
    best = float(cost[order[0]])
    shots = sum(counts.values())
    idx = {b: int(b.replace(" ", ""), 2) for b in counts}
    feas = sum(c for b, c in counts.items() if ok[idx[b]])
    best_b = min((b for b in counts if ok[idx[b]]), key=lambda b: cost[idx[b]], default=None)
    return {
        "shots": shots,
        "allowed_schedules": int(len(allowed)),
        "share_obeying_rules": feas / shots,
        "share_obeying_rules_random": len(allowed) / len(cost),
        "share_best10_allowed": sum(c for b, c in counts.items() if idx[b] in top) / shots,
        "share_best10_allowed_random": top_n / len(cost),
        "optimum_hits": sum(c for b, c in counts.items() if np.isclose(cost[idx[b]], best)),
        "found_optimum": best_b is not None and bool(np.isclose(cost[idx[best_b]], best)),
        "best_sampled_schedule": list(enc.decode(best_b)) if best_b else None,
    }
