"""Compare every method on the same objective (Feature 1: fair baselines).

For each hardware-tested weight (0, 0.5, 1): business as usual, greedy,
simulated annealing, random sampling (4,000 guesses = the QAOA shot budget),
QAOA on the simulator, QAOA on IBM hardware (from the saved counts), and the
true best (brute force). Reports cost reached, gap to the optimum and runtime.

Usage:  python scripts/run_baselines.py      -> results/baselines.json
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from greenq import runner                                       # noqa: E402
from greenq.classical import (brute_force, evaluate, greedy, naive,   # noqa: E402
                              random_sampling, simulated_annealing, timed)
from greenq.encoding import Encoding                            # noqa: E402
from greenq.metrics import analyze                              # noqa: E402
from greenq.model import Instance                               # noqa: E402
from greenq.qaoa import GreenQAOA                               # noqa: E402

OUT = ROOT / "results" / "baselines.json"


def row(method, res, best, runtime_ms, note, kind):
    return {
        "method": method, "kind": kind,
        "objective": round(res.objective, 6),
        "gap_pct": round(100 * (res.objective - best.objective) / best.objective, 3),
        "kg_co2": round(res.kg_co2, 2), "litres": round(res.litres, 2),
        "schedule": list(res.schedule),
        "runtime_ms": None if runtime_ms is None else round(runtime_ms, 3),
        "note": note,
    }


def main() -> None:
    inst = Instance()
    hw = [json.loads(f.read_text()) for f in sorted((ROOT / "results" / "hardware").glob("*.json"))]
    out = {"instance": f"{inst.n_jobs} jobs x {inst.n_options} options = {inst.n_options ** inst.n_jobs} schedules",
           "runtimes": "median of repeated runs on the demo laptop; QPU time excludes queueing",
           "weights": []}
    for w in (0.0, 0.5, 1.0):
        enc = Encoding(inst, w)
        (best, _), t_bf = timed(brute_force, inst, w)
        g, t_g = timed(greedy, inst, w)
        sa, t_sa = timed(simulated_annealing, inst, w)
        rs, t_rs = timed(random_sampling, inst, w, repeats=3)

        # QAOA on the simulator: train + sample 4,000 shots, timed end to end.
        t0 = time.perf_counter()
        q = GreenQAOA(enc)
        r = q.optimize()
        counts = runner.run_ideal(q.bind(r.gammas, r.betas), 4000)
        t_q = (time.perf_counter() - t0) * 1000
        m = analyze(counts, enc)
        qsim = evaluate(inst, tuple(m["best_sampled_schedule"]), w)

        rows = [
            row("Business as usual", naive(inst, w), best, None, "every job at home, immediately", "baseline"),
            row("Greedy", g, best, t_g, "largest job first, cheapest slot given jobs already placed", "classical"),
            row("Simulated annealing", sa, best, t_sa, "3 restarts, single-job moves", "classical"),
            row("Random sampling (4,000)", rs, best, t_rs, "best of 4,000 random schedules: the same shot budget as QAOA", "classical"),
            row("QAOA, simulator", qsim, best, t_q, f"train + 4,000 shots; approx. ratio {m['approx_ratio']:.3f}", "quantum-sim"),
        ]
        raw = next(h for h in hw if h.get("w_carbon") == w and h.get("preset", "flexible") == "flexible" and h.get("mitigation") == "none" and h.get("status") == "DONE")
        mh = analyze(raw["counts"], enc)
        qhw = evaluate(inst, tuple(mh["best_sampled_schedule"]), w)
        rows.append(row(f"QAOA, IBM {raw['backend']}", qhw, best, (raw.get("quantum_seconds") or 0) * 1000,
                        f"job {raw['job_id']}; {raw.get('quantum_seconds')} s QPU, queue not counted; approx. ratio {mh['approx_ratio']:.3f}", "quantum-hw"))
        rows.append(row("True best (brute force)", best, best, t_bf, f"checks all {inst.n_options ** inst.n_jobs} schedules", "referee"))
        out["weights"].append({"w": w, "rows": rows})
        print(f"w={w}: " + ", ".join(f"{x['method']} gap {x['gap_pct']}% ({x['runtime_ms']} ms)" for x in rows))
    OUT.write_text(json.dumps(out, indent=1))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
