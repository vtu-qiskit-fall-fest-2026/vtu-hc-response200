"""Static checks on the web UI source (no browser needed).

Browser checks (console errors, counters equal the data, reduced motion, no
overflow at 1920x1080 and 1366x768) live in scripts/ui_smoke.py (needs Playwright).
"""
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "web" / "src"
DATA = json.loads((ROOT / "results" / "ui_data.json").read_text())


def read(rel: str) -> str:
    return (SRC / rel).read_text()


def test_hero_reads_savings_from_data_not_typed():
    hero = read("components/slides/Hero.tsx")
    assert "saved_kg_co2" in hero and "saved_litres" in hero
    mid = next(s for s in DATA["sweep"] if s["w"] == 0.5)
    for n in {round(mid["saved_kg_co2"]), round(mid["saved_litres"])}:
        for form in (str(n), f"{n:,}"):
            assert not re.search(rf"(?<![\d.]){re.escape(form)}(?![\d])", hero), f"hard-coded {form} in Hero.tsx"


@pytest.mark.parametrize("rel", ["components/slides/Start.tsx", "components/mascot/MascotProvider.tsx", "lib/tour.ts", "lib/story.ts"])
def test_no_savings_numbers_typed_in_ui_text(rel):
    src = read(rel)
    for form in ("530", "1,798", "1798"):
        assert form not in src, f"{form} typed in {rel}"


def test_mascot_and_hero_respect_reduced_motion():
    for rel in ["components/mascot/Dewy.tsx", "components/mascot/MascotProvider.tsx", "components/mascot/Tour.tsx", "components/slides/Hero.tsx"]:
        assert "prefersReducedMotion" in read(rel), rel


def test_tour_lines_are_short_and_have_no_numbers():
    src = read("lib/tour.ts")
    lines = re.findall(r'line: "([^"]+)"', src)
    assert len(lines) == 6
    for line in lines:
        assert len(line.split()) <= 10, line
        assert not re.search(r"\d", line), line


def test_twelve_moods_include_the_required_ones():
    src = read("components/mascot/Dewy.tsx")
    for m in ["idle", "waking", "thinking", "working", "excited", "celebrate", "confused", "drowsy", "sleeping", "laughing"]:
        assert f'"{m}"' in src, m


def test_built_app_exists_and_has_no_key():
    dist = ROOT / "web" / "dist"
    if not (dist / "index.html").exists():
        pytest.skip("frontend not built")
    for f in dist.rglob("*.js"):
        t = f.read_text(errors="ignore")
        assert "GROQ_API_KEY" not in t and "gsk_" not in t
