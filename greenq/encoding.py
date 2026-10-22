"""Binary encoding of schedules into qubits, and the cost Hamiltonian.

Encoding: each job gets b = ceil(log2(n_options)) qubits. Job j owns qubits
j*b ... j*b + b - 1 and their bits, read as a binary number, are the option
index (qubit j*b is the least significant bit). With 2 sites x 2 slots that is
two qubits per job: bit 0 = "when" (day/night), bit 1 = "where" (site A/B).

Because every bit pattern is a real option, every measured bitstring is a
complete schedule. (If n_options is not a power of 2, the unused codes get a
penalty.) Compare one-hot encoding, which needs n_options qubits per job and
where most bitstrings break the "exactly one option per job" rule.

Cost Hamiltonian: the objective is a function f(x) of the bits. Writing bit
x_q in terms of the Pauli Z eigenvalue z_q = (-1)^x_q, any such function is an
exact sum of products of Z's (its Walsh-Hadamard expansion), so
    H = sum_S  c_S  prod_{q in S} Z_q        and    <x|H|x> = f(x).
We build it in two parts, without ever listing all 2^n states:
  * each job's own cost: a 2^b-entry table, expanded on its b qubits;
  * each pair's congestion cost: "jobs i and j share a code" equals
    prod_bits (1 + Z_ib Z_jb) / 2, which gives ZZ and ZZZZ terms.
"""
from __future__ import annotations

import math
from itertools import product

import numpy as np
from qiskit.quantum_info import SparsePauliOp

from .model import Instance

INVALID_PENALTY = 10.0  # added to the objective for an unused code (non power-of-2 options)


class Encoding:
    def __init__(self, inst: Instance, w_carbon: float = 0.5):
        self.inst = inst
        self.w_carbon = w_carbon
        self.bits = max(1, math.ceil(math.log2(inst.n_options)))
        self.n_qubits = inst.n_jobs * self.bits
        wt = inst.weights(w_carbon)
        # objective contributions in blended (dimensionless) units
        self.local_cost = inst.local @ wt                        # shape (jobs, options)
        self.pair_cost = {ij: float(v @ wt) for ij, v in inst.pair.items()}

    # ------------------------------------------------------------ decoding
    def qubits_of(self, job: int) -> list[int]:
        return [job * self.bits + b for b in range(self.bits)]

    def codes_from_int(self, state: int) -> tuple[int, ...]:
        mask = (1 << self.bits) - 1
        return tuple((state >> (j * self.bits)) & mask for j in range(self.inst.n_jobs))

    def decode(self, bitstring: str) -> tuple[int, ...] | None:
        """Qiskit bitstring (qubit 0 is the rightmost character) -> schedule, or None if invalid."""
        codes = self.codes_from_int(int(bitstring.replace(" ", ""), 2))
        if any(c >= self.inst.n_options for c in codes):
            return None
        return codes

    def encode(self, schedule: tuple[int, ...]) -> str:
        state = sum(k << (j * self.bits) for j, k in enumerate(schedule))
        return format(state, f"0{self.n_qubits}b")

    # ------------------------------------------------------------ cost of every state
    def cost_vector(self) -> np.ndarray:
        """Objective for every basis state, indexed like Statevector.probabilities()."""
        if self.n_qubits > 24:
            raise ValueError("too many qubits to enumerate")
        states = np.arange(2 ** self.n_qubits)
        mask = (1 << self.bits) - 1
        codes = [(states >> (j * self.bits)) & mask for j in range(self.inst.n_jobs)]
        table = self._local_table()                              # (jobs, 2^bits)
        cost = np.zeros(states.shape, dtype=float)
        for j, c in enumerate(codes):
            cost += table[j][c]
        for (i, j), w in self.pair_cost.items():
            cost += w * (codes[i] == codes[j])
        return cost

    def _local_table(self) -> np.ndarray:
        table = np.full((self.inst.n_jobs, 2 ** self.bits), INVALID_PENALTY)
        table[:, : self.inst.n_options] = self.local_cost
        return table

    # ------------------------------------------------------------ Hamiltonian
    def hamiltonian(self) -> SparsePauliOp:
        n = self.n_qubits
        terms: dict[tuple[int, ...], float] = {}

        def add(qubits: tuple[int, ...], coeff: float) -> None:
            key = tuple(sorted(qubits))
            terms[key] = terms.get(key, 0.0) + coeff

        # Local terms: Walsh-Hadamard expansion of each job's 2^b cost table.
        table = self._local_table()
        nb = self.bits
        for j in range(self.inst.n_jobs):
            q = self.qubits_of(j)
            for subset_mask in range(2 ** nb):
                coeff = 0.0
                for code in range(2 ** nb):
                    parity = bin(code & subset_mask).count("1") % 2
                    coeff += table[j][code] * (-1) ** parity
                coeff /= 2 ** nb
                add(tuple(q[b] for b in range(nb) if subset_mask >> b & 1), coeff)

        # Pair terms: w * prod_b (1 + Z_ib Z_jb) / 2
        for (i, j), w in self.pair_cost.items():
            qi, qj = self.qubits_of(i), self.qubits_of(j)
            for chosen in product([0, 1], repeat=nb):
                qubits = tuple(x for b in range(nb) if chosen[b] for x in (qi[b], qj[b]))
                add(qubits, w / 2 ** nb)

        labels = []
        for qubits, coeff in terms.items():
            if abs(coeff) < 1e-12:
                continue
            chars = ["I"] * n
            for q in qubits:
                chars[n - 1 - q] = "Z"   # Qiskit labels: rightmost char is qubit 0
            labels.append(("".join(chars), coeff))
        return SparsePauliOp.from_list(labels)


def onehot_qubits(inst: Instance) -> int:
    """Qubits a one-hot QUBO would need (for comparison in docs/UI)."""
    return inst.n_jobs * inst.n_options
