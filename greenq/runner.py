"""Run a trained GreenQ circuit through a Qiskit Sampler and save everything.

One code path for all three targets:
  * "ideal"  - qiskit StatevectorSampler (perfect, noiseless)
  * "noisy"  - qiskit-ibm-runtime SamplerV2 on a fake IBM backend (Aer + that device's noise model)
  * "ibm"    - qiskit-ibm-runtime SamplerV2 on real IBM Quantum hardware (job mode)

Records are written to results/ as JSON the moment a job is submitted and again
when its results arrive, so a demo never depends on the queue.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorSampler
from qiskit.transpiler import generate_preset_pass_manager

from .encoding import Encoding
from .metrics import analyze

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "results"


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def two_qubit_count(qc: QuantumCircuit) -> int:
    return sum(1 for inst in qc.data if inst.operation.num_qubits == 2)


def transpile_best(circuit: QuantumCircuit, backend, seeds: int = 8) -> QuantumCircuit:
    """Transpile at optimisation level 3 with several seeds; keep the fewest 2-qubit gates."""
    best = None
    for seed in range(seeds):
        pm = generate_preset_pass_manager(optimization_level=3, backend=backend, seed_transpiler=seed)
        isa = pm.run(circuit)
        if best is None or two_qubit_count(isa) < two_qubit_count(best):
            best = isa
    return best


def circuit_stats(isa: QuantumCircuit) -> dict:
    layout = isa.layout.final_index_layout() if isa.layout is not None else None
    return {
        "depth": isa.depth(),
        "two_qubit_gates": two_qubit_count(isa),
        "two_qubit_depth": isa.depth(lambda i: i.operation.num_qubits == 2),
        "ops": {k: int(v) for k, v in isa.count_ops().items()},
        "physical_qubits": layout,
    }


def counts_from_pub(pub_result) -> dict[str, int]:
    return pub_result.data.meas.get_counts()


def run_ideal(circuit: QuantumCircuit, shots: int, seed: int = 11) -> dict[str, int]:
    job = StatevectorSampler(seed=seed).run([circuit], shots=shots)
    return counts_from_pub(job.result()[0])


def configure_mitigation(sampler, mitigation: str) -> dict:
    """'none' or 'dd_twirl' (dynamical decoupling XY4 + gate and measurement twirling)."""
    if mitigation == "dd_twirl":
        sampler.options.dynamical_decoupling.enable = True
        sampler.options.dynamical_decoupling.sequence_type = "XY4"
        sampler.options.twirling.enable_gates = True
        sampler.options.twirling.enable_measure = True
        return {"dynamical_decoupling": "XY4", "twirling": "gates+measure"}
    return {}


def submit_sampler(isa: QuantumCircuit, backend, shots: int, mitigation: str = "none"):
    from qiskit_ibm_runtime import SamplerV2

    sampler = SamplerV2(mode=backend)
    opts = configure_mitigation(sampler, mitigation)
    job = sampler.run([isa], shots=shots)
    return job, opts


def save(record: dict, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2))
    return path


def base_record(target: str, enc: Encoding, qaoa_params: dict, shots: int) -> dict:
    return {
        "target": target,
        "created_utc": now(),
        "w_carbon": enc.w_carbon,
        "n_jobs": enc.inst.n_jobs,
        "n_options": enc.inst.n_options,
        "n_qubits": enc.n_qubits,
        "shots": shots,
        "qaoa": qaoa_params,
    }


def finish(record: dict, counts: dict[str, int], enc: Encoding, path: Path, t0: float | None = None) -> dict:
    record["counts"] = counts
    record["metrics"] = analyze(counts, enc)
    record["completed_utc"] = now()
    if t0 is not None:
        record["wall_seconds"] = round(time.time() - t0, 1)
    save(record, path)
    return record
