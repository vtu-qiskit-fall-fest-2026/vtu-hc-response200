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

# ILLUSTRATIVE (Feature 2): how flexible the jobs are. Rules per job key:
#   deadline  - must finish in the day slot; residency - data stays at home site;
#   priority  - critical, runs in the slot it was submitted to.
FLEX_PRESETS = {
    "flexible": {"label": "All flexible", "rules": {}},
    "mixed": {
        "label": "Mixed",
        "rules": {
            "genome": {"residency"},           # patient data stays at Site A
            "etl": {"deadline"},               # report due before night
        },
    },
    "rigid": {
        "label": "Mostly rigid",
        "rules": {
            "genome": {"residency", "priority"},
            "etl": {"deadline", "residency"},
            "train": {"priority"},
        },
    },
}


# Feature 4: regional water stress. CITED: WRI Aqueduct 4.0 (2023) baseline water
# stress, provincial (state) and country rankings, total-demand weighting, score 0-5
# (Kuzma et al. 2023, doi:10.46830/writn.23.00061, CC BY 4.0; file
# Aqueduct40_rankings_download_Y2023M07D05.xlsx). Scores are for the STATE the city
# is in. ILLUSTRATIVE choices: which cities host Site A / Site B, and the mapping
# multiplier = score / 5 (a litre in a state scoring 5 counts as one full litre).
SOURCES["aqueduct"] = (
    "Kuzma, S., M.F.P. Bierkens, S. Lakshman, T. Luo, L. Saccoccia, E.H. Sutanudjaja and R. Van Beek (2023), "
    "Aqueduct 4.0: Updated decision-relevant global water risk indicators, Technical Note, World Resources "
    "Institute, doi:10.46830/writn.23.00061. Provincial baseline water stress (total demand), CC BY 4.0."
)
AQUEDUCT_BWS = {   # state -> (score 0-5, WRI label)
    "NCT of Delhi": (4.746, "Extremely High (>80%)"),
    "Maharashtra": (4.201, "Extremely High (>80%)"),
    "Tamil Nadu": (4.149, "Extremely High (>80%)"),
    "Telangana": (3.919, "High (40-80%)"),
    "Karnataka": (3.735, "High (40-80%)"),
    "West Bengal": (2.528, "Medium - High (20-40%)"),
}
AQUEDUCT_INDIA = (4.108, "Extremely High (>80%)")   # country score, used for power-plant water

CITY_PRESETS = {   # Site A (evaporative) city, Site B (air-cooled) city
    "delhi_kolkata": {"label": "Delhi NCR + Kolkata", "evap": ("Delhi NCR", "NCT of Delhi"), "air": ("Kolkata", "West Bengal")},
    "mumbai_hyderabad": {"label": "Mumbai + Hyderabad", "evap": ("Mumbai", "Maharashtra"), "air": ("Hyderabad", "Telangana")},
    "chennai_bengaluru": {"label": "Chennai + Bengaluru", "evap": ("Chennai", "Tamil Nadu"), "air": ("Bengaluru", "Karnataka")},
}


def stress_multipliers(preset_key: str) -> tuple[dict[str, float], float]:
    """(site multipliers, grid multiplier) for a city preset: score / 5."""
    p = CITY_PRESETS[preset_key]
    sites = {site: AQUEDUCT_BWS[p[site][1]][0] / 5 for site in ("evap", "air")}
    return sites, AQUEDUCT_INDIA[0] / 5
