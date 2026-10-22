"""City presets with regional water stress (Feature 4).

For each preset (site cities -> WRI Aqueduct 4.0 state water stress), re-solve
every priority setting by brute force on stress-weighted water, and run QAOA
(p=1) on the ideal simulator at the balanced setting. No hardware.

Usage:  python scripts/run_cities.py   -> results/cities.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from greenq import data as D                       # noqa: E402
from greenq import runner                          # noqa: E402
from greenq.classical import brute_force, naive    # noqa: E402
from greenq.encoding import Encoding               # noqa: E402
from greenq.metrics import analyze                 # noqa: E402
from greenq.model import Instance                  # noqa: E402
from greenq.qaoa import GreenQAOA                  # noqa: E402

OUT = ROOT / "results" / "cities.json"


def main() -> None:
    base = Instance()
    plain = {round(p / 100, 2): brute_force(base, p / 100)[0].schedule for p in range(0, 101, 5)}
    out = {"source": D.SOURCES["aqueduct"],
           "mapping": "multiplier = Aqueduct baseline water stress score / 5 (illustrative); state score used for the city; "
                      "India country score used for power-plant water; grid carbon stays the CEA national average (one national grid).",
           "india": {"score": D.AQUEDUCT_INDIA[0], "label": D.AQUEDUCT_INDIA[1]},
           "presets": []}
    for key, p in D.CITY_PRESETS.items():
        ss, gs = D.stress_multipliers(key)
        inst = Instance(site_stress=ss, grid_stress=gs)
        nv = naive(inst, 0.5)
        sweep = []
        for pct in range(0, 101, 5):
            w = pct / 100
            b, _ = brute_force(inst, w)
            sweep.append({
                "w": w, "schedule": list(b.schedule),
                "kg_co2": round(b.kg_co2, 2),
                "weighted_litres": round(b.litres, 2),
                "litres": round(inst.footprint_litres(b.schedule), 2),
                "same_as_unweighted": tuple(b.schedule) == plain[round(w, 2)],
            })
        enc = Encoding(inst, 0.5)
        q = GreenQAOA(enc)
        r = q.optimize()
        m = analyze(runner.run_ideal(q.bind(r.gammas, r.betas), 4000), enc)
        out["presets"].append({
            "key": key, "label": p["label"],
            "sites": {site: {"city": p[site][0], "state": p[site][1], "score": D.AQUEDUCT_BWS[p[site][1]][0],
                             "label": D.AQUEDUCT_BWS[p[site][1]][1], "multiplier": round(ss[site], 3)} for site in ("evap", "air")},
            "grid_multiplier": round(gs, 3),
            "naive": {"kg_co2": round(nv.kg_co2, 2), "weighted_litres": round(nv.litres, 2),
                      "litres": round(inst.footprint_litres(inst.naive), 2)},
            "sweep": sweep,
            "qaoa_sim_balanced": {"share_best10": round(m["share_best10pct"], 4), "approx_ratio": round(m["approx_ratio"], 4),
                                  "found_optimum": m["found_optimum"], "optimum_hits": round(m["p_optimal"] * 4000)},
        })
        changed = sum(not s["same_as_unweighted"] for s in sweep)
        print(f"{p['label']}: plan differs from unweighted at {changed}/21 settings; QAOA sim best10 {m['share_best10pct']:.3f}, found optimum {m['found_optimum']}")
    OUT.write_text(json.dumps(out, indent=1))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
