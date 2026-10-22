"""Scaling study (Feature 3): how GreenQ's QAOA behaves as the job count grows.

Same 2 sites x 2 slots, 4 to 11 jobs (8 to 22 qubits). The 4 demo jobs come
first; extra jobs are generated from a fixed seed and are ILLUSTRATIVE.
For each size it records:
  * qubits, Hamiltonian terms
  * two-qubit gates and depth after transpiling the p=1 circuit for the
    ibm_marrakesh layout (FakeMarrakesh, optimisation level 3)
  * QAOA p=1 trained on the exact simulator: approximation ratio and P(optimal)
  * the same circuit on a noisy simulator of ibm_marrakesh (sizes where it runs
    in reasonable time): approximation ratio and share of shots in the best 10%
  * exhaustive search, greedy, simulated annealing and random sampling:
    gap to the optimum and runtime
Nothing is extrapolated. Usage:  python scripts/run_scaling.py [--max-jobs 11]
Writes results/scaling.json after every size.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from greenq import data as D                                          # noqa: E402
from greenq import runner                                             # noqa: E402
from greenq.classical import greedy, random_sampling, simulated_annealing, timed  # noqa: E402
from greenq.encoding import Encoding                                  # noqa: E402
from greenq.metrics import analyze                                    # noqa: E402
from greenq.model import Instance                                     # noqa: E402
from greenq.qaoa import GreenQAOA                                     # noqa: E402

OUT = ROOT / "results" / "scaling.json"
W = 0.5
NOISY_MAX_QUBITS = 16   # noisy trajectories get slow beyond this on a laptop


def extra_jobs(n: int, seed: int = 42) -> list[D.Job]:
    """ILLUSTRATIVE extra jobs: 200-1,450 kWh, random home site and arrival slot."""
    rng = np.random.default_rng(seed)
    jobs = []
    for i in range(n):
        jobs.append(D.Job(f"job{i + 5}", f"Batch job {i + 5}", float(rng.integers(4, 30) * 50),
                          ["evap", "air"][int(rng.integers(2))], ["day", "night"][int(rng.integers(2))]))
    return jobs


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-jobs", type=int, default=11)
    args = ap.parse_args()
    from qiskit_ibm_runtime.fake_provider import FakeMarrakesh

    fake = FakeMarrakesh()
    extras = extra_jobs(args.max_jobs - 4)
    out = {"weight": W, "sites": 2, "slots": 2, "backend_layout": fake.name,
           "note": "Jobs beyond the 4 demo jobs are illustrative (seeded). Runtimes are on the demo laptop.",
           "sizes": []}
    for n in range(4, args.max_jobs + 1):
        t_size = time.time()
        inst = Instance(jobs=list(D.JOBS) + extras[: n - 4])
        enc = Encoding(inst, W)
        n_states = 2 ** enc.n_qubits

        # exhaustive search (vectorised over all bitstrings)
        t = time.perf_counter()
        cost = enc.cost_vector()
        best_val, worst_val = float(cost.min()), float(cost.max())
        t_exhaustive = (time.perf_counter() - t) * 1000
        gap = lambda v: round(100 * (v - best_val) / best_val, 3)  # noqa: E731

        # QAOA p=1 on the exact simulator
        q = GreenQAOA(enc, reps=1)
        grid = 40 if enc.n_qubits <= 14 else 24 if enc.n_qubits <= 20 else 14
        t = time.perf_counter()
        res = q.optimize(grid=grid)
        t_train = (time.perf_counter() - t) * 1000
        span = worst_val - best_val
        ideal_ratio = (worst_val - res.expected) / span
        random_ratio = (worst_val - float(cost.mean())) / span
        p_opt = float(res.probs[np.isclose(cost, best_val)].sum())
        rank = np.argsort(np.argsort(cost, kind="stable"), kind="stable")
        top = rank < max(1, round(0.1 * n_states))
        ideal_best10 = float(res.probs[top].sum())

        # transpile for the IBM layout
        circuit = q.bind(res.gammas, res.betas)
        t = time.perf_counter()
        isa = runner.transpile_best(circuit, fake, seeds=3 if enc.n_qubits <= 16 else 2)
        t_transpile = time.perf_counter() - t
        stats = runner.circuit_stats(isa)

        row = {
            "jobs": n, "qubits": enc.n_qubits, "schedules": n_states, "hamiltonian_terms": len(enc.hamiltonian()),
            "two_qubit_gates": stats["two_qubit_gates"], "depth": stats["depth"], "two_qubit_depth": stats["two_qubit_depth"],
            "transpile_seconds": round(t_transpile, 1),
            "qaoa_ideal": {"approx_ratio": round(ideal_ratio, 4), "p_optimal": round(p_opt, 5),
                           "share_best10": round(ideal_best10, 4), "train_ms": round(t_train, 1), "grid": grid,
                           "gamma": res.gammas[0], "beta": res.betas[0]},
            "random": {"approx_ratio": round(random_ratio, 4), "p_optimal": round(float(np.isclose(cost, best_val).sum()) / n_states, 6),
                       "share_best10": round(float(top.mean()), 4)},
            "exhaustive_ms": round(t_exhaustive, 2),
        }

        # noisy simulation of the device, where it is fast enough
        if enc.n_qubits <= NOISY_MAX_QUBITS:
            t = time.perf_counter()
            job, _ = runner.submit_sampler(isa, fake, 4000)
            counts = runner.counts_from_pub(job.result()[0])
            m = analyze(counts, enc)
            row["qaoa_noisy"] = {"approx_ratio": round(m["approx_ratio"], 4), "share_best10": round(m["share_best10pct"], 4),
                                 "p_optimal": round(m["p_optimal"], 5), "found_optimum": m["found_optimum"],
                                 "seconds": round(time.perf_counter() - t, 1)}

        # classical competitors
        (g, t_g) = timed(greedy, inst, W, repeats=3)
        (sa, t_sa) = timed(simulated_annealing, inst, W, repeats=1)
        (rs, t_rs) = timed(random_sampling, inst, W, repeats=1)
        row["classical"] = {
            "greedy": {"gap_pct": gap(g.objective), "ms": round(t_g, 3)},
            "annealing": {"gap_pct": gap(sa.objective), "ms": round(t_sa, 1)},
            "random_4000": {"gap_pct": gap(rs.objective), "ms": round(t_rs, 1)},
        }
        row["seconds_total"] = round(time.time() - t_size, 1)
        out["sizes"].append(row)
        OUT.write_text(json.dumps(out, indent=1))
        noisy = row.get("qaoa_noisy", {}).get("approx_ratio", "-")
        print(f"{n} jobs / {enc.n_qubits} q: {row['two_qubit_gates']} 2q gates, depth {row['depth']} | "
              f"ideal AR {ideal_ratio:.3f} (random {random_ratio:.3f}) noisy AR {noisy} | "
              f"greedy gap {row['classical']['greedy']['gap_pct']}% SA gap {row['classical']['annealing']['gap_pct']}% "
              f"random gap {row['classical']['random_4000']['gap_pct']}% | {row['seconds_total']}s", flush=True)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
