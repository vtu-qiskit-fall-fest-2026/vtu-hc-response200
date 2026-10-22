"""Run the trained GreenQ circuit on real IBM Quantum hardware.

Uses the parameters trained on the simulator (results/sim/qaoa_w{w}_p{reps}.json),
so the QPU only runs fixed circuits: a few seconds of quantum time per job.

Usage:
  python scripts/run_hardware.py                     # least-busy backend, raw + mitigated jobs
  python scripts/run_hardware.py --backend ibm_marrakesh --mitigation none
  python scripts/run_hardware.py --fetch <job_id>    # collect results of a job submitted earlier

Writes results/hardware/<backend>_<job_id>.json as soon as each job is submitted,
then fills in counts and metrics when results arrive.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from greenq import ibm, runner                       # noqa: E402
from greenq.encoding import Encoding                  # noqa: E402
from greenq.model import Instance                     # noqa: E402
from greenq.qaoa import GreenQAOA                     # noqa: E402

HW_DIR = runner.RESULTS / "hardware"


def record_path(backend_name: str, job_id: str) -> Path:
    return HW_DIR / f"{backend_name}_{job_id}.json"


def wait_and_finish(service, job_id: str, timeout: int) -> None:
    path = next(HW_DIR.glob(f"*_{job_id}.json"))
    record = json.loads(path.read_text())
    job = service.job(job_id)
    t0 = time.time()
    while True:
        status = str(job.status())
        print(f"  {job_id}: {status}")
        if status in ("DONE", "JobStatus.DONE"):
            break
        if status in ("ERROR", "CANCELLED", "JobStatus.ERROR", "JobStatus.CANCELLED"):
            record["status"] = status
            runner.save(record, path)
            raise SystemExit(f"job {job_id} ended with {status}")
        if time.time() - t0 > timeout:
            print(f"  still queued after {timeout}s; fetch later with --fetch {job_id}")
            return
        time.sleep(15)
    result = job.result()
    enc = Encoding(Instance(), record["w_carbon"])
    record["status"] = "DONE"
    try:
        record["quantum_seconds"] = job.usage()
    except Exception:  # usage is informational only
        pass
    try:
        record["job_metrics"] = {k: str(v) for k, v in job.metrics().get("timestamps", {}).items()}
    except Exception:
        pass
    runner.finish(record, runner.counts_from_pub(result[0]), enc, path)
    m = record["metrics"]
    print(f"  saved {path.relative_to(runner.ROOT)}: approx ratio {m['approx_ratio']:.3f} "
          f"(random {m['approx_ratio_random']:.3f}), P(opt) {m['p_optimal']:.4f}, "
          f"best sampled optimal: {m['found_optimum']}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--w", type=float, default=0.5)
    ap.add_argument("--reps", type=int, default=1)
    ap.add_argument("--shots", type=int, default=4000)
    ap.add_argument("--backend", default=None)
    ap.add_argument("--mitigation", choices=["none", "dd_twirl", "both"], default="both")
    ap.add_argument("--timeout", type=int, default=1800, help="seconds to wait for results")
    ap.add_argument("--fetch", default=None, help="job id to collect instead of submitting")
    ap.add_argument("--min-remaining", type=float, default=60, help="refuse to submit below this many QPU seconds")
    args = ap.parse_args()

    service = ibm.get_service()
    if args.fetch:
        wait_and_finish(service, args.fetch, args.timeout)
        return

    usage = ibm.usage_summary(service)
    print("QPU usage:", usage)
    remaining = usage.get("usage_remaining_seconds")
    if remaining is not None and remaining < args.min_remaining:
        raise SystemExit("Not enough QPU time left; refusing to submit.")

    sim_file = runner.RESULTS / "sim" / f"qaoa_w{args.w}_p{args.reps}.json"
    sim = json.loads(sim_file.read_text())
    params = sim["qaoa"]
    enc = Encoding(Instance(), args.w)
    q = GreenQAOA(enc, reps=args.reps)
    circuit = q.bind(params["gammas"], params["betas"])

    backend = ibm.pick_backend(service, args.backend, enc.n_qubits)
    print(f"backend: {backend.name} ({backend.num_qubits} qubits, {backend.status().pending_jobs} pending jobs)")
    isa = runner.transpile_best(circuit, backend)
    stats = runner.circuit_stats(isa)
    print(f"transpiled: depth {stats['depth']}, {stats['two_qubit_gates']} two-qubit gates, qubits {stats['physical_qubits']}")

    modes = ["none", "dd_twirl"] if args.mitigation == "both" else [args.mitigation]
    job_ids = []
    for mode in modes:
        job, opts = runner.submit_sampler(isa, backend, args.shots, mode)
        record = runner.base_record("ibm_hardware", enc, params, args.shots)
        record.update({
            "backend": backend.name, "job_id": job.job_id(), "status": "SUBMITTED",
            "mitigation": mode, "mitigation_options": opts, "circuit": stats,
            "trained_on": str(sim_file.relative_to(runner.ROOT)),
        })
        path = runner.save(record, record_path(backend.name, job.job_id()))
        print(f"submitted {mode}: job {job.job_id()} -> {path.relative_to(runner.ROOT)}")
        job_ids.append(job.job_id())

    for jid in job_ids:
        wait_and_finish(service, jid, args.timeout)


if __name__ == "__main__":
    main()
