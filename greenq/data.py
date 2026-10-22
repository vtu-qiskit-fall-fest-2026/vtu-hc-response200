"""Input data for GreenQ: sites, time slots and jobs.

Every number is tagged as either CITED (from a public source listed in SOURCES)
or ILLUSTRATIVE (a realistic value we chose, anchored to a cited range).
The UI and README repeat these labels. Nothing here is a measurement of a real
data centre.
"""
from __future__ import annotations

from dataclasses import dataclass

# --------------------------------------------------------------------------
# Sources
# --------------------------------------------------------------------------
SOURCES = {
    "cea": (
        "Central Electricity Authority (Govt. of India), CO2 Baseline Database for the "
        "Indian Power Sector, User Guide v21.0, Nov 2025, Table S (FY 2024-25): weighted "
        "average 0.710 tCO2/MWh; operating margin (fossil stations) 0.961 tCO2/MWh. "
        "https://cea.nic.in/api/cdm-report-version/view-pdf/en/78"
    ),
    "macknick": (
        "Macknick, Newmark, Heath & Hallett (2012), Operational water consumption and "
        "withdrawal factors for electricity generating technologies, Environ. Res. Lett. 7 "
        "045802, Table 2: coal, cooling tower, median 687 gal/MWh (= 2.60 L/kWh). "
        "https://doi.org/10.1088/1748-9326/7/4/045802"
    ),
    "uptime": (
        "Uptime Institute Global Data Center Survey 2024: average annual PUE 1.56. "
        "https://intelligence.uptimeinstitute.com/resource/uptime-institute-global-data-center-survey-2024"
    ),
    "phoenix": (
        "University of Arizona, Water-energy tradeoffs in data centers: a case study in "
        "hot-arid climates (Phoenix colocation sites): air-cooled site had ~13% higher PUE but 66% "
        "lower source WUE than the evaporative site. "
        "https://experts.arizona.edu/en/publications/water-energy-tradeoffs-in-data-centers-a-case-study-in-hot-arid-c/"
    ),
    "equinix": (
        "Equinix, What is Water Usage Effectiveness (WUE): air-cooled-only sites near 0 L/kWh, "
        "fully evaporative sites up to about 2.5 L/kWh. "
        "https://blog.equinix.com/blog/2024/11/13/what-is-water-usage-effectiveness-wue-in-data-centers/"
    ),
    "greengrid": (
        "The Green Grid, WUE: a green grid data center sustainability metric (WP #35, 2011): "
        "WUE = annual site water (L) / IT equipment energy (kWh)."
    ),
}

GAL_PER_MWH_TO_L_PER_KWH = 3.785411784 / 1000.0

# CITED
GRID_AVG_T_PER_MWH = 0.710        # CEA FY 2024-25 all-India weighted average
GRID_FOSSIL_T_PER_MWH = 0.961     # CEA operating margin, used as "fossil-only" intensity
COAL_TOWER_L_PER_KWH = 687 * GAL_PER_MWH_TO_L_PER_KWH   # Macknick median, = 2.60 L/kWh


@dataclass(frozen=True)
class Slot:
    key: str
    label: str
    carbon_kg_per_kwh: float   # grid carbon intensity during this slot
    note: str

    @property
    def fossil_share(self) -> float:
        """Approximate fossil share of generation, inferred from carbon intensity."""
        return self.carbon_kg_per_kwh / GRID_FOSSIL_T_PER_MWH

    @property
    def grid_water_l_per_kwh(self) -> float:
        """Water consumed at power plants per kWh delivered (indirect water).

        Approximation: fossil generation consumes water like a coal plant with a
        cooling tower; solar/wind consume ~0 (Macknick Table 1).
        """
        return self.fossil_share * COAL_TOWER_L_PER_KWH


@dataclass(frozen=True)
class Site:
    key: str
    label: str
    cooling: str
    pue: float                       # facility energy / IT energy
    wue_l_per_kwh: dict[str, float]  # on-site cooling water per IT kWh, by slot key
    note: str


@dataclass(frozen=True)
class Job:
    key: str
    label: str
    it_energy_kwh: float
    home_site: str        # where the naive scheduler would run it
    submitted_slot: str   # when the naive scheduler would run it (immediately)


# ILLUSTRATIVE diurnal profile, anchored so the mean equals the CEA average (0.710).
# Midday solar lowers grid carbon in India; night relies more on coal.
SLOTS = [
    Slot("day", "Day (10:00-16:00)", 0.640, "ILLUSTRATIVE: solar-heavy midday, mean of both slots = CEA 0.710"),
    Slot("night", "Night (22:00-04:00)", 0.780, "ILLUSTRATIVE: coal-heavy night, mean of both slots = CEA 0.710"),
]

# ILLUSTRATIVE sites on the same Indian grid, differing only in cooling design.
# PUE: air-cooled = Uptime average (1.58 ~ 1.56); evaporative ~13% lower (Phoenix study).
# WUE: inside the Equinix range (0 to 2.5 L/kWh); evaporative uses more water in hot afternoons.
SITES = [
    Site(
        "evap", "Site A (evaporative cooling)", "evaporative", 1.40,
        {"day": 1.9, "night": 1.1},
        "ILLUSTRATIVE: low energy, high on-site water",
    ),
    Site(
        "air", "Site B (air-cooled chillers)", "air-cooled", 1.58,
        {"day": 0.05, "night": 0.05},
        "ILLUSTRATIVE: higher energy, almost no on-site water",
    ),
]

# ILLUSTRATIVE batch jobs (IT energy for one run). The naive scheduler runs each
# job at its home site the moment it is submitted. Scenario: an evening batch
# burst puts the two big jobs on Site A overnight.
JOBS = [
    Job("train", "ML model training", 1200.0, "evap", "night"),
    Job("genome", "Genomics batch", 900.0, "evap", "night"),
    Job("etl", "Analytics ETL", 600.0, "air", "day"),
    Job("render", "Video rendering", 400.0, "air", "night"),
]

# ILLUSTRATIVE: when two jobs share one site-slot they exceed its spare headroom;
# the overflow runs on less efficient backup capacity. Modelled as an extra
# fraction of the pair's energy, charged at the average footprint of all options.
CONGESTION_FRACTION = 0.15
