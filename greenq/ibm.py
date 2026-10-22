"""IBM Quantum connection. The API token is read from .env and never printed or saved."""
from __future__ import annotations

import os

from dotenv import load_dotenv

from .runner import ROOT


def get_service():
    from qiskit_ibm_runtime import QiskitRuntimeService

    load_dotenv(ROOT / ".env")
    token = os.environ.get("IBM_QUANTUM_TOKEN")
    if not token:
        raise RuntimeError("IBM_QUANTUM_TOKEN is not set. Put it in .env (see README).")
    instance = os.environ.get("IBM_QUANTUM_INSTANCE") or None   # optional CRN
    return QiskitRuntimeService(channel="ibm_quantum_platform", token=token, instance=instance)


def pick_backend(service, name: str | None, min_qubits: int):
    if name:
        return service.backend(name)
    return service.least_busy(operational=True, simulator=False, min_num_qubits=min_qubits)


def usage_summary(service) -> dict:
    u = service.usage()
    return {k: u.get(k) for k in ("usage_consumed_seconds", "usage_limit_seconds", "usage_remaining_seconds")}
