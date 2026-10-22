"""Export everything the demo UI shows into one saved file: results/ui_data.json.

The UI reads only this file (through the FastAPI server), so it works offline
and never touches IBM. Re-run after any new simulator or hardware result:

    python scripts/export_ui_data.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from greenq import data as D                      # noqa: E402
from greenq.classical import brute_force, naive   # noqa: E402
from greenq.encoding import Encoding, onehot_qubits  # noqa: E402
from greenq.metrics import analyze                # noqa: E402
from greenq.model import Instance                 # noqa: E402
from greenq.qaoa import GreenQAOA                 # noqa: E402

OUT = ROOT / "results" / "ui_data.json"
HARDWARE_WEIGHTS = (0.0, 0.5, 1.0)


def deciles(counts: dict, cost: np.ndarray) -> list[float]:
    """Share of shots in each tenth of all schedules, cheapest tenth first."""
    rank = np.argsort(np.argsort(cost, kind="stable"), kind="stable")
    dec = (rank * 10) // len(cost)
    out = np.zeros(10)
    total = sum(counts.values())
    for b, c in counts.items():
        out[dec[int(b, 2)]] += c / total
    return [round(float(x), 5) for x in out]


def stderr_ratio(counts: dict, cost: np.ndarray) -> float:
    vals = np.repeat([cost[int(b, 2)] for b in counts], list(counts.values()))
    return float(vals.std(ddof=1) / np.sqrt(len(vals)) / (cost.max() - cost.min()))


def summarize(counts: dict, enc: Encoding) -> dict:
    cost = enc.cost_vector()
    m = analyze(counts, enc)
    hits = round(m["p_optimal"] * m["shots"])
    best_b = m["best_sampled_bitstring"]
    freq_rank = sorted(counts.values(), reverse=True).index(counts[best_b]) + 1
    se = stderr_ratio(counts, cost)
    span = cost.max() - cost.min()
    random_se = float(cost.std() / np.sqrt(m["shots"]) / span)
    return {
        "shots": m["shots"],
        "approx_ratio": round(m["approx_ratio"], 4),
        "approx_ratio_se": round(se, 4),
        # how many standard errors above random guessing (same shot count)
        "z_vs_random": round((m["approx_ratio"] - m["approx_ratio_random"]) / float(np.hypot(se, random_se)), 1),
        "share_best10": round(m["share_best10pct"], 4),
        "optimum_hits": hits,
        "found_optimum": m["found_optimum"],
        "optimum_frequency_rank": freq_rank if m["found_optimum"] else None,
        "best_sampled_schedule": m["best_sampled_schedule"],
        "deciles": deciles(counts, cost),
    }


def circuit_gates(enc: Encoding, gamma: float, beta: float) -> list[dict]:
    """The p = 1 QAOA circuit as a gate list, read from the real cost operator.

    exp(-i*gamma*c*Z...) is a Z-rotation by angle 2*gamma*c on the listed
    qubits; the mixer is RX(2*beta) on every qubit.
    """
    q = GreenQAOA(enc, reps=1)
    n = enc.n_qubits
    gates = [{"kind": "h", "qubits": list(range(n)), "angle": None}]
    terms = []
    for label, coeff in zip(q.cost_op.paulis.to_labels(), q.cost_op.coeffs):
        qubits = [n - 1 - i for i, ch in enumerate(label) if ch == "Z"]
        kind = {1: "rz", 2: "zz", 4: "zzzz"}[len(qubits)]
        terms.append({"kind": kind, "qubits": sorted(qubits), "angle": round(2 * gamma * float(coeff.real), 4)})
    order = {"rz": 0, "zz": 1, "zzzz": 2}
    gates += sorted(terms, key=lambda g: (order[g["kind"]], g["qubits"]))
    gates.append({"kind": "rx", "qubits": list(range(n)), "angle": round(2 * beta, 4)})
    gates.append({"kind": "measure", "qubits": list(range(n)), "angle": None})
    return gates


def footprint_dict(inst: Instance, sched) -> dict:
    co2, water = inst.footprint(tuple(sched))
    return {"schedule": list(sched), "kg_co2": round(float(co2), 2), "litres": round(float(water), 2)}


def main() -> None:
    inst = Instance()
    base = naive(inst, 0.5)

    sweep = []
    for pct in range(0, 101, 5):
        w = pct / 100
        best, _ = brute_force(inst, w)
        sweep.append({
            "w": w,
            "best": footprint_dict(inst, best.schedule),
            "saved_kg_co2": round(base.kg_co2 - best.kg_co2, 2),
            "saved_litres": round(base.litres - best.litres, 2),
            "hardware": w in HARDWARE_WEIGHTS,
        })

    hw_runs = [json.loads(f.read_text()) for f in sorted((ROOT / "results" / "hardware").glob("*.json"))]
    proof = []
    for w in HARDWARE_WEIGHTS:
        enc = Encoding(inst, w)
        cost = enc.cost_vector()
        uniform = {format(i, f"0{enc.n_qubits}b"): 1 for i in range(len(cost))}
        rand = analyze(uniform, enc)
        entry = {
            "w": w,
            "random": {"approx_ratio": round(rand["approx_ratio"], 4), "share_best10": 0.1,
                       "expected_optimum_hits": round(4000 / len(cost), 1), "deciles": [0.1] * 10},
            "hardware": [],
        }
        for r in hw_runs:
            if r.get("w_carbon") == w and r.get("status") == "DONE":
                entry["hardware"].append({
                    "backend": r["backend"], "job_id": r["job_id"], "mitigation": r["mitigation"],
                    "completed_utc": r.get("completed_utc"), "quantum_seconds": r.get("quantum_seconds"),
                    "two_qubit_gates": r["circuit"]["two_qubit_gates"], "depth": r["circuit"]["depth"],
                    "physical_qubits": r["circuit"]["physical_qubits"],
                    **summarize(r["counts"], enc),
                })
        sim_file = ROOT / "results" / "sim" / f"qaoa_w{w}_p1.json"
        if sim_file.exists():
            s = json.loads(sim_file.read_text())
            entry["ideal"] = summarize(s["ideal"]["counts"], enc)
            entry["qaoa"] = {"gammas": s["qaoa"]["gammas"], "betas": s["qaoa"]["betas"]}
            entry["circuit_gates"] = circuit_gates(enc, s["qaoa"]["gammas"][0], s["qaoa"]["betas"][0])
            if "noisy" in s:
                entry["noisy"] = {"backend": s["noisy"]["backend"], **summarize(s["noisy"]["counts"], enc)}
        proof.append(entry)

    enc = Encoding(inst, 0.5)
    data = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "instance": {
            "sites": [{"key": s.key, "label": s.label, "cooling": s.cooling, "pue": s.pue,
                       "wue": s.wue_l_per_kwh} for s in inst.sites],
            "slots": [{"key": t.key, "label": t.label, "carbon_kg_per_kwh": t.carbon_kg_per_kwh,
                       "grid_water_l_per_kwh": round(t.grid_water_l_per_kwh, 3)} for t in inst.slots],
            "jobs": [{"key": j.key, "label": j.label, "it_energy_kwh": j.it_energy_kwh,
                      "home_site": j.home_site, "submitted_slot": j.submitted_slot} for j in inst.jobs],
            "options": [{"index": k, "site": s.key, "slot": t.key,
                         "kg_co2_per_kwh": round(float(inst.unit[k, 0]), 4),
                         "litres_per_kwh": round(float(inst.unit[k, 1]), 4)}
                        for k, (s, t) in enumerate(inst.options)],
            "congestion_fraction": inst.congestion,
            "slot_note": "Mean of both slots = CEA all-India average 0.710 kg CO2/kWh (cited); the day/night split is illustrative.",
            "n_schedules": inst.n_options ** inst.n_jobs,
        },
        "naive": footprint_dict(inst, base.schedule),
        "sweep": sweep,
        "proof": proof,
        "circuit": {
            "n_qubits": enc.n_qubits,
            "hamiltonian_terms": len(enc.hamiltonian()),
            "onehot_qubits": onehot_qubits(inst),
            "onehot_valid_fraction": round(inst.n_options ** inst.n_jobs / 2 ** onehot_qubits(inst), 6),
            "onehot_two_qubit_gates_estimate": 227,
            "reps_on_hardware": 1,
            # qubit 2j = job j's "when" bit (day/night), qubit 2j+1 = its "where" bit (site A/B)
            "qubit_meaning": [
                {"qubit": 2 * j + b, "job": job.label, "bit": "when" if b == 0 else "where"}
                for j, job in enumerate(inst.jobs) for b in range(2)
            ],
        },
        "totals": {
            "hardware_jobs": sum(len(p["hardware"]) for p in proof),
            "quantum_seconds": sum(h.get("quantum_seconds") or 0 for p in proof for h in p["hardware"]),
        },
        "sources": {
            "cited": [
                {"figure": "Indian grid average carbon intensity", "value": "0.710 kg CO2/kWh", "source": D.SOURCES["cea"]},
                {"figure": "Fossil-only grid intensity (operating margin)", "value": "0.961 kg CO2/kWh", "source": D.SOURCES["cea"]},
                {"figure": "Water consumed by coal plants with cooling towers", "value": f"{D.COAL_TOWER_L_PER_KWH:.2f} L/kWh", "source": D.SOURCES["macknick"]},
            ],
            "illustrative": [
                "Day / night carbon split (0.640 / 0.780 kg/kWh; mean = CEA 0.710)",
                "Site PUE (1.40 evaporative, 1.58 air-cooled), anchored to " + D.SOURCES["uptime"].split(":")[0] + " and the Phoenix study",
                "On-site water use (WUE), inside the 0-2.5 L/kWh range reported by Equinix",
                "Job energies and the overload penalty",
                "Indirect water = fossil share x coal-plant water use (an approximation)",
            ],
            "references": [D.SOURCES[k] for k in ("cea", "macknick", "uptime", "phoenix", "equinix", "greengrid")],
        },
    }
    OUT.write_text(json.dumps(data, indent=1))
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
