"""Print a markdown table of every saved run, computed from the raw counts.

Usage:  python scripts/summarize_results.py
Use this output for the README and slides so no number is copied by hand.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from greenq.encoding import Encoding   # noqa: E402
from greenq.metrics import analyze     # noqa: E402
from greenq.model import Instance      # noqa: E402


def stderr_ratio(counts: dict, cost: np.ndarray) -> float:
    vals = np.repeat([cost[int(b, 2)] for b in counts], list(counts.values()))
    return float(vals.std(ddof=1) / np.sqrt(len(vals)) / (cost.max() - cost.min()))


def row(label: str, counts: dict, enc: Encoding, extra: str = "") -> str:
    m = analyze(counts, enc)
    cost = enc.cost_vector()
    hits = round(m["p_optimal"] * m["shots"])
    rank = sorted(counts.values(), reverse=True).index(counts[m["best_sampled_bitstring"]]) + 1 if m["found_optimum"] else "-"
    return (f"| {label} | {extra} | {m['approx_ratio']:.3f} ± {stderr_ratio(counts, cost):.3f} | "
            f"{100 * m['share_best10pct']:.1f}% | {hits}/{m['shots']} | {rank} | "
            f"{'yes' if m['found_optimum'] else 'no'} |")


def main() -> None:
    inst = Instance()
    runs = [json.loads(f.read_text()) | {"file": f.name}
            for f in sorted((ROOT / "results" / "hardware").glob("*.json"))]
    for w in sorted({r["w_carbon"] for r in runs}):
        enc = Encoding(inst, w)
        cost = enc.cost_vector()
        print(f"\n### Carbon weight w = {w}\n")
        print("| Run | Job | Approx. ratio | Shots in best 10% | Shots on optimum | Optimum's frequency rank | Cheapest shot is optimum |")
        print("|---|---|---|---|---|---|---|")
        uniform = {format(i, f"0{enc.n_qubits}b"): 1 for i in range(len(cost))}
        m = analyze(uniform, enc)
        print(f"| Random guessing | | {m['approx_ratio']:.3f} | 10.0% | ≈{4000 / len(cost):.0f}/4000 | | |")
        for r in runs:
            if r["w_carbon"] == w and r.get("preset", "flexible") == "flexible" and r.get("status") == "DONE":
                label = f"IBM {r['backend']} ({'raw' if r['mitigation'] == 'none' else 'DD + twirling'})"
                print(row(label, r["counts"], enc, f"`{r['job_id']}`"))
        sim = ROOT / "results" / "sim" / f"qaoa_w{w}_p1.json"
        if sim.exists():
            s = json.loads(sim.read_text())
            if "noisy" in s:
                print(row("Noisy simulator (FakeMarrakesh)", s["noisy"]["counts"], enc))
            print(row("Ideal simulator", s["ideal"]["counts"], enc))


if __name__ == "__main__":
    main()
