"""Train QAOA on the simulator and sample it on ideal and noisy simulators.

Usage:  python scripts/run_sim.py [--w 0.5] [--reps 1] [--shots 4000] [--no-noisy]
Writes: results/sim/qaoa_w{w}_p{reps}.json
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from greenq.classical import brute_force, naive          # noqa: E402
from greenq.encoding import Encoding                      # noqa: E402
from greenq.metrics import analyze                        # noqa: E402
from greenq.model import Instance                         # noqa: E402
from greenq import data as D                              # noqa: E402
from greenq.qaoa import GreenQAOA                         # noqa: E402
from greenq import runner                                 # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--w", type=float, default=0.5, help="carbon weight (0 = water only, 1 = carbon only)")
    ap.add_argument("--reps", type=int, default=1)
    ap.add_argument("--shots", type=int, default=4000)
    ap.add_argument("--no-noisy", action="store_true")
    ap.add_argument("--preset", default="flexible", choices=list(D.FLEX_PRESETS), help="job rules (Feature 2)")
    args = ap.parse_args()

    inst = Instance(constraints=D.FLEX_PRESETS[args.preset]["rules"])
    enc = Encoding(inst, args.w)
    best, worst = brute_force(inst, args.w)
    base = naive(inst, args.w)
    print(f"{enc.n_qubits} qubits, {len(enc.hamiltonian())} Hamiltonian terms")
    print(f"naive objective {base.objective:.4f} | optimum {best.objective:.4f} {best.schedule}")

    q = GreenQAOA(enc, reps=args.reps)
    t0 = time.time()
    res = q.optimize()
    print(f"trained p={args.reps} in {time.time() - t0:.1f}s: gamma={res.gammas} beta={res.betas}")
    params = {"reps": res.reps, "gammas": res.gammas, "betas": res.betas,
              "cvar_alpha": res.cvar_alpha, "scale": q.scale}

    circuit = q.bind(res.gammas, res.betas)
    record = runner.base_record("simulator", enc, params, args.shots)
    record["preset"] = args.preset
    record["classical"] = {
        "optimal_schedule": list(best.schedule), "optimal_objective": best.objective,
        "optimal_kg_co2": best.kg_co2, "optimal_litres": best.litres,
        "naive_schedule": list(base.schedule), "naive_objective": base.objective,
        "naive_kg_co2": base.kg_co2, "naive_litres": base.litres,
    }
    record["exact_probabilities_top"] = {
        format(int(i), f"0{enc.n_qubits}b"): float(res.probs[i]) for i in res.probs.argsort()[::-1][:20]
    }

    ideal = runner.run_ideal(circuit, args.shots)
    record["ideal"] = {"counts": ideal, "metrics": analyze(ideal, enc)}
    m = record["ideal"]["metrics"]
    print(f"ideal:  approx ratio {m['approx_ratio']:.3f} (random {m['approx_ratio_random']:.3f}), "
          f"P(opt) {m['p_optimal']:.4f} (random {m['p_optimal_random']:.4f})")

    if not args.no_noisy:
        from qiskit_ibm_runtime.fake_provider import FakeMarrakesh

        fake = FakeMarrakesh()
        isa = runner.transpile_best(circuit, fake)
        job, _ = runner.submit_sampler(isa, fake, args.shots)
        noisy = runner.counts_from_pub(job.result()[0])
        record["noisy"] = {"backend": fake.name, "circuit": runner.circuit_stats(isa),
                           "counts": noisy, "metrics": analyze(noisy, enc)}
        m = record["noisy"]["metrics"]
        print(f"noisy ({fake.name}, {record['noisy']['circuit']['two_qubit_gates']} 2q gates): "
              f"approx ratio {m['approx_ratio']:.3f}, P(opt) {m['p_optimal']:.4f}")

    suffix = "" if args.preset == "flexible" else f"_{args.preset}"
    path = runner.RESULTS / "sim" / f"qaoa_w{args.w}_p{args.reps}{suffix}.json"
    runner.save(record, path)
    print("saved", path.relative_to(runner.ROOT))


if __name__ == "__main__":
    main()
