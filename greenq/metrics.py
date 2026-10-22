"""Score a measured distribution against the brute-force optimum.

* approximation ratio r = (worst - mean) / (worst - best): 1 = always optimal, 0 = always worst.
  Uniform random guessing gives r_random (reported alongside so the gain is visible).
* P(optimal): share of shots that landed exactly on the optimal schedule.
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
    ranked = sorted(counts.items(), key=lambda kv: -kv[1])[:top]
    return {
        "shots": shots,
        "mean_objective": float(mean),
        "approx_ratio": float((worst - mean) / span),
        "approx_ratio_random": float((worst - cost.mean()) / span),
        "p_optimal": float(p_opt),
        "p_optimal_random": len(opt_states) / len(cost),
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
