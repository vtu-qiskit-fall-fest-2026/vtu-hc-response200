"""Footprint model: how much CO2 and water a schedule costs.

A *schedule* gives each job one *option* = (site, time slot).

Per job j at option k (all per run):
    energy  = E_j * PUE_site                                  (kWh)
    CO2     = energy * carbon_slot                             (kg)
    water   = E_j * WUE_site,slot  +  energy * grid_water_slot (litres)
              (on-site cooling)       (water used at power plants)

Coupling between jobs: two jobs at the same option overflow its spare
headroom and cost an extra CONGESTION_FRACTION of their energy, charged at the
average footprint of all options (see data.py, illustrative).

The optimisation objective blends both goals, normalised by the naive schedule
so they are comparable:
    objective = w * CO2 / CO2_naive + (1 - w) * water / water_naive
w = 1 means carbon only, w = 0 means water only.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from itertools import combinations

import numpy as np

from . import data as D


@dataclass
class Instance:
    jobs: list[D.Job] = field(default_factory=lambda: list(D.JOBS))
    sites: list[D.Site] = field(default_factory=lambda: list(D.SITES))
    slots: list[D.Slot] = field(default_factory=lambda: list(D.SLOTS))
    congestion: float = D.CONGESTION_FRACTION

    def __post_init__(self) -> None:
        # Option index k = site_index * n_slots + slot_index.
        # With 2 sites x 2 slots: bit 0 of k is "when", bit 1 is "where".
        self.options = [(s, t) for s in self.sites for t in self.slots]
        # unit[k] = (kg CO2, litres) per kWh of IT energy at option k
        self.unit = np.array([
            (s.pue * t.carbon_kg_per_kwh,
             s.wue_l_per_kwh[t.key] + s.pue * t.grid_water_l_per_kwh)
            for s, t in self.options
        ])
        self.energy = np.array([j.it_energy_kwh for j in self.jobs])
        # local[j, k, m]: footprint m (0=CO2, 1=water) of job j alone at option k
        self.local = self.energy[:, None, None] * self.unit[None, :, :]
        # pair[i, j, m]: extra footprint if jobs i and j share any option
        mean_unit = self.unit.mean(axis=0)
        self.pair = {
            (i, j): self.congestion * (self.energy[i] + self.energy[j]) * mean_unit
            for i, j in combinations(range(self.n_jobs), 2)
        }
        self.naive = self.naive_schedule()
        self.naive_footprint = self.footprint(self.naive)

    @property
    def n_jobs(self) -> int:
        return len(self.jobs)

    @property
    def n_options(self) -> int:
        return len(self.options)

    def option_index(self, site_key: str, slot_key: str) -> int:
        for k, (s, t) in enumerate(self.options):
            if s.key == site_key and t.key == slot_key:
                return k
        raise KeyError((site_key, slot_key))

    def option_label(self, k: int) -> str:
        s, t = self.options[k]
        return f"{s.label} - {t.label}"

    def naive_schedule(self) -> tuple[int, ...]:
        """Business as usual: run every job at its home site, as soon as submitted."""
        return tuple(self.option_index(j.home_site, j.submitted_slot) for j in self.jobs)

    def footprint(self, schedule: tuple[int, ...]) -> np.ndarray:
        """Return [kg CO2, litres water] for a schedule (tuple of option indices)."""
        total = sum(self.local[j, k] for j, k in enumerate(schedule))
        for (i, j), extra in self.pair.items():
            if schedule[i] == schedule[j]:
                total = total + extra
        return np.asarray(total, dtype=float)

    def weights(self, w_carbon: float) -> np.ndarray:
        """Per-unit weights that turn [kg, litres] into the blended objective."""
        co2_ref, water_ref = self.naive_footprint
        return np.array([w_carbon / co2_ref, (1.0 - w_carbon) / water_ref])

    def objective(self, schedule: tuple[int, ...], w_carbon: float = 0.5) -> float:
        return float(self.footprint(schedule) @ self.weights(w_carbon))

    def describe(self, schedule: tuple[int, ...]) -> list[dict]:
        rows = []
        for j, k in enumerate(schedule):
            s, t = self.options[k]
            co2, water = self.local[j, k]
            rows.append({
                "job": self.jobs[j].label,
                "it_energy_kwh": self.jobs[j].it_energy_kwh,
                "site": s.label,
                "slot": t.label,
                "kg_co2": round(float(co2), 1),
                "litres": round(float(water), 1),
            })
        return rows
