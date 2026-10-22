"""QAOA for the GreenQ scheduling Hamiltonian.

Circuit (Qiskit `QAOAAnsatz`), p layers:
    |+>^n  ->  [ exp(-i gamma_l H_C)  then  exp(-i beta_l sum_q X_q) ]  for l = 1..p  ->  measure
* |+>^n is an equal superposition of all 256 schedules.
* The cost layer adds a phase proportional to each schedule's cost.
* The mixer layer lets amplitude flow between schedules that differ in one bit,
  so phases turn into interference that favours cheap schedules.

Training (classical outer loop): choose gamma, beta to minimise CVaR_alpha, the
average cost of the best alpha-fraction of outcomes (Barkoutsos et al., 2020,
Quantum 4, 256). For training we compute the exact output distribution with a
small numpy simulator of this same circuit (the cost layer is diagonal, the
mixer is single-qubit RX gates). tests/test_qaoa.py checks it equals Qiskit's
Statevector of the QAOAAnsatz. The trained circuit then runs through Qiskit
Sampler primitives: an ideal simulator, a noisy simulator of an IBM device, or
real IBM hardware.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit.library import QAOAAnsatz
from qiskit.quantum_info import SparsePauliOp
from scipy.optimize import minimize

from .encoding import Encoding


@dataclass
class QAOAResult:
    reps: int
    gammas: list[float]
    betas: list[float]
    cvar_alpha: float
    cvar: float                  # in objective units
    expected: float              # in objective units
    probs: np.ndarray            # exact output distribution (index = basis state)


class GreenQAOA:
    def __init__(self, enc: Encoding, reps: int = 1, alpha: float = 0.25):
        self.enc = enc
        self.reps = reps
        self.alpha = alpha
        self.cost = enc.cost_vector()                 # objective of every basis state
        H = enc.hamiltonian()
        # Drop the identity term (only a global phase) and rescale so |coeffs| <= 1,
        # which keeps good gamma values in a predictable range.
        labels, coeffs = [], []
        for lab, c in zip(H.paulis.to_labels(), H.coeffs):
            if set(lab) != {"I"}:
                labels.append(lab)
                coeffs.append(float(np.real(c)))
        self.scale = max(abs(c) for c in coeffs)
        self.offset = float(np.real(sum(c for lab, c in zip(H.paulis.to_labels(), H.coeffs) if set(lab) == {"I"})))
        self.cost_op = SparsePauliOp(labels, np.array(coeffs) / self.scale)
        self.scaled_cost = (self.cost - self.offset) / self.scale   # = diag(cost_op)
        self.n = enc.n_qubits

    # ------------------------------------------------------------ circuits
    def ansatz(self) -> QuantumCircuit:
        return QAOAAnsatz(self.cost_op, reps=self.reps, name="GreenQ-QAOA")

    def bind(self, gammas, betas, measure: bool = True) -> QuantumCircuit:
        qc = self.ansatz()
        values = {}
        for p in qc.parameters:
            idx = p.index
            values[p] = gammas[idx] if p.vector.name == "γ" else betas[idx]
        bound = qc.assign_parameters(values)
        if measure:
            bound.measure_all()
        return bound

    # ------------------------------------------------------------ fast exact simulation
    def statevector(self, gammas, betas) -> np.ndarray:
        n = self.n
        psi = np.full(2 ** n, 2 ** (-n / 2), dtype=complex)
        for g, b in zip(gammas, betas):
            psi = psi * np.exp(-1j * g * self.scaled_cost)
            c, s = np.cos(b), -1j * np.sin(b)          # RX(2b) = exp(-i b X)
            psi = psi.reshape([2] * n)
            for axis in range(n):
                a0 = np.take(psi, 0, axis=axis)
                a1 = np.take(psi, 1, axis=axis)
                psi = np.stack([c * a0 + s * a1, s * a0 + c * a1], axis=axis)
            psi = psi.reshape(-1)
        return psi

    def probabilities(self, gammas, betas) -> np.ndarray:
        # numpy reshape puts qubit 0 on the LAST axis; mixer is identical on every
        # qubit and the cost vector is indexed with qubit 0 = least significant bit,
        # so the flat index already matches Qiskit's ordering.
        return np.abs(self.statevector(gammas, betas)) ** 2

    def cvar(self, probs: np.ndarray, alpha: float | None = None) -> float:
        alpha = self.alpha if alpha is None else alpha
        order = np.argsort(self.cost)
        p, c = probs[order], self.cost[order]
        cum = np.cumsum(p)
        take = np.clip(alpha - (cum - p), 0.0, p)     # probability mass used from each state
        return float(take @ c / alpha)

    # ------------------------------------------------------------ training
    def _loss(self, x: np.ndarray) -> float:
        g, b = x[: self.reps], x[self.reps:]
        return self.cvar(self.probabilities(g, b))

    def optimize(self, grid: int = 40, seed: int = 7, init: tuple | None = None) -> QAOAResult:
        p = self.reps
        if init is not None:
            starts = [np.concatenate(init)]
        elif p == 1:
            gs = np.linspace(0.0, np.pi, grid)
            bs = np.linspace(0.0, np.pi, grid)
            vals = np.array([[self._loss(np.array([g, b])) for b in bs] for g in gs])
            flat = np.argsort(vals, axis=None)[:3]
            starts = [np.array([gs[i // grid], bs[i % grid]]) for i in flat]
        else:
            # INTERP-style start (Zhou et al. 2020): stretch the optimum of p-1 layers.
            prev = GreenQAOA(self.enc, p - 1, self.alpha).optimize(grid, seed)
            starts = [np.concatenate([_interp(prev.gammas, p), _interp(prev.betas, p)])]
            rng = np.random.default_rng(seed)
            starts += [starts[0] + rng.normal(0, 0.1, 2 * p) for _ in range(2)]
        best = None
        for x0 in starts:
            res = minimize(self._loss, x0, method="COBYLA", options={"maxiter": 400, "rhobeg": 0.2})
            if best is None or res.fun < best.fun:
                best = res
        g, b = best.x[:p], best.x[p:]
        probs = self.probabilities(g, b)
        return QAOAResult(p, list(map(float, g)), list(map(float, b)), self.alpha,
                          float(best.fun), float(probs @ self.cost), probs)


def _interp(params: list[float], p: int) -> np.ndarray:
    old = np.array([0.0, *params, 0.0])
    q = len(params)
    return np.array([((i) / q) * old[i] + ((q - i) / q) * old[i + 1] for i in range(p)]) if q else np.zeros(p)
