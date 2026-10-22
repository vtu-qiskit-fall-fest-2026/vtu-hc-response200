"""Robustness to grid-carbon forecast error (Feature 6).

The schedule is chosen from the forecast (the cited/illustrative slot carbon).
Then 'reality' differs: each slot's carbon intensity is perturbed independently
by a uniform random error of up to +/-5% (and +/-10% for context). Power-plant
water follows, because it is derived from the fossil share. For each of 200
seeded draws we re-solve by brute force and measure the chosen plan's regret:
(cost of chosen plan - cost of new best plan) / cost of new best plan, on the
objective of that draw.

Usage:  python scripts/run_robustness.py   -> results/robustness.json
"""
from __future__ import annotations

import json
import sys
from dataclasses import replace
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from greenq import data as D                       # noqa: E402
from greenq.classical import brute_force           # noqa: E402
from greenq.model import Instance                  # noqa: E402

OUT = ROOT / "results" / "robustness.json"
DRAWS = 200
BINS = [0, 0.000001, 0.01, 0.02, 0.05, 1.0]        # exactly best, <1%, 1-2%, 2-5%, >5%
BIN_LABELS = ["still the best", "< 1% worse", "1-2% worse", "2-5% worse", "> 5% worse"]


def study(error: float, w: float, seed: int) -> dict:
    rng = np.random.default_rng(seed)
    chosen = brute_force(Instance(), w)[0].schedule
    regrets = []
    for _ in range(DRAWS):
        slots = [replace(t, carbon_kg_per_kwh=t.carbon_kg_per_kwh * (1 + rng.uniform(-error, error))) for t in D.SLOTS]
        inst = Instance(slots=slots)
        best = brute_force(inst, w)[0]
        regrets.append((inst.objective(chosen, w) - best.objective) / best.objective)
    r = np.array(regrets)
    counts, _ = np.histogram(r, bins=BINS)
    return {
        "error_pct": round(100 * error), "w": w, "draws": DRAWS, "seed": seed,
        "within_5pct": float(np.mean(r <= 0.05)),
        "still_best": float(np.mean(r <= 1e-9)),
        "worst_regret_pct": round(100 * float(r.max()), 3),
        "mean_regret_pct": round(100 * float(r.mean()), 4),
        "histogram": [{"label": l, "share": float(c) / DRAWS} for l, c in zip(BIN_LABELS, counts)],
    }


def main() -> None:
    out = {"note": "Uniform independent error on each slot's grid carbon intensity; the chosen plan is fixed from the forecast; regret is measured against the brute-force best plan for each draw.",
           "studies": []}
    for error in (0.05, 0.10):
        for w in (0.0, 0.5, 1.0):
            s = study(error, w, seed=int(100 * error) * 10 + int(10 * w))
            out["studies"].append(s)
            print(f"±{s['error_pct']}% w={w}: within 5% of new best {s['within_5pct']:.0%}, still best {s['still_best']:.0%}, worst regret {s['worst_regret_pct']}%")
    OUT.write_text(json.dumps(out, indent=1))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
