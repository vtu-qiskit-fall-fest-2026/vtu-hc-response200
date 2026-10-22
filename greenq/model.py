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
    # Feature 2: per-job rules, keyed by job key. Values are sets drawn from
    #   "deadline"  - must finish in the day slot (cannot move to night)
    #   "residency" - data must stay at the job's home site
    #   "priority"  - critical: must run in the slot it was submitted to
    constraints: dict[str, set[str]] = field(default_factory=dict)
    # Feature 4: water-stress weighting. When set, "water" in the objective and
    # footprints means stress-weighted litres: on-site litres x the site's
    # multiplier + power-plant litres x the grid multiplier. Raw litres stay
    # available as unit_litres / footprint_litres().
    site_stress: dict[str, float] | None = None
    grid_stress: float = 1.0

    def __post_init__(self) -> None:
        # Option index k = site_index * n_slots + slot_index.
        # With 2 sites x 2 slots: bit 0 of k is "when", bit 1 is "where".
        self.options = [(s, t) for s in self.sites for t in self.slots]
        # unit[k] = (kg CO2, litres) per kWh of IT energy at option k
        self.unit_litres = np.array([
            s.wue_l_per_kwh[t.key] + s.pue * t.grid_water_l_per_kwh for s, t in self.options
        ])
        stress = self.site_stress or {}
        gs = self.grid_stress if self.site_stress else 1.0
        self.unit = np.array([
            (s.pue * t.carbon_kg_per_kwh,
             s.wue_l_per_kwh[t.key] * stress.get(s.key, 1.0) + s.pue * t.grid_water_l_per_kwh * gs)
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
        # allowed[j] = option indices job j may use under its rules
        self.allowed = [self._allowed_for(j) for j in self.jobs]
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

    def _allowed_for(self, job: D.Job) -> list[int]:
        rules = self.constraints.get(job.key, set())
        ok = []
        for k, (s, t) in enumerate(self.options):
            if "deadline" in rules and t.key == "night":
                continue
            if "residency" in rules and s.key != job.home_site:
                continue
            if "priority" in rules and t.key != job.submitted_slot:
                continue
            ok.append(k)
        if not ok:
            raise ValueError(f"rules leave no option for job {job.key}")
        return ok

    def feasible(self, schedule: tuple[int, ...]) -> bool:
        return all(k in self.allowed[j] for j, k in enumerate(schedule))

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

    def footprint_litres(self, schedule: tuple[int, ...]) -> float:
        """Raw (unweighted) litres for a schedule, even when stress weighting is on."""
        e = self.energy
        total = sum(e[j] * self.unit_litres[k] for j, k in enumerate(schedule))
        mean = float(self.unit_litres.mean())
        for i, j in self.pair:
            if schedule[i] == schedule[j]:
                total += self.congestion * (e[i] + e[j]) * mean
        return float(total)

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
