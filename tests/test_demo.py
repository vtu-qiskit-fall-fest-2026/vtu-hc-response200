"""The automated demo's timeline (docs/demo/timeline.json, built by scripts/build_demo.py):
numbers come from the data, the narration fits its time, jargon is glossed, and
the questions it types have reviewed cached answers."""
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

from server import llm

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "results" / "ui_data.json").read_text())
TL = json.loads((ROOT / "docs" / "demo" / "timeline.json").read_text())
PRESETS = TL["presets"]


def test_timeline_is_up_to_date_with_the_builder(tmp_path):
    # the committed timeline must equal what the builder makes from the current data
    out = subprocess.run([sys.executable, str(ROOT / "scripts" / "build_demo.py")], capture_output=True, text=True, cwd=ROOT)
    assert out.returncode == 0, out.stderr
    assert json.loads((ROOT / "docs" / "demo" / "timeline.json").read_text()) == TL


def test_lengths():
    assert PRESETS["standard"]["total"] <= 190            # at or under 3:10
    assert 170 <= PRESETS["standard"]["total"]             # about 3:00
    assert abs(PRESETS["short"]["total"] - 130) <= 5      # about 2:10


@pytest.mark.parametrize("preset", ["standard", "short"])
def test_speech_fits_every_step(preset):
    for s in PRESETS[preset]["steps"]:
        words = len(s["narration"].split())
        need = words / TL["words_per_second"] + TL["pause_per_step"]
        assert need <= s["duration"] + 1e-9, (s["id"], words, s["duration"])


@pytest.mark.parametrize("preset", ["standard", "short"])
def test_every_number_spoken_is_in_the_data(preset):
    facts = llm.facts(DATA, "flexible", 0.5)
    allowed = llm.allowed_numbers(facts) + [float(DATA["circuit"]["onehot_qubits"]), float(DATA["circuit"]["n_qubits"])]
    sizes = DATA["scaling"]["sizes"]
    allowed += [float(sizes[-1]["two_qubit_gates"]), float(sizes[0]["two_qubit_gates"])]
    for s in PRESETS[preset]["steps"]:
        text = s["narration"].replace("CO2", "CO₂")
        for n in llm.numbers(text):
            assert llm._ok(n, allowed), (s["id"], n)
        for q in s["quotes"].values():
            assert q["value"].replace(",", "") in text.replace(",", ""), (s["id"], q)


def test_quoted_values_match_the_data():
    mid = next(x for x in DATA["sweep"] if x["w"] == 0.5)
    q = {k: v["value"] for s in PRESETS["standard"]["steps"] for k, v in s["quotes"].items()}
    assert q["saved_kg"] == f"{mid['saved_kg_co2']:,.0f}"
    assert q["saved_l"] == f"{mid['saved_litres']:,.0f}"
    assert q["runs"] == str(DATA["totals"]["hardware_jobs"])


GLOSS = {  # a technical word must come with a plain-word explanation the first time it is spoken
    "qubit": ["where", "when"],
    "simulator": ["perfect", "noise-free"],
    "annealing": ["simple method"],
    "greedy": ["simple method"],
    "qaoa": ["quantum algorithm"],
}


@pytest.mark.parametrize("preset", ["standard", "short"])
def test_jargon_is_glossed_first_time(preset):
    seen = set()
    for s in PRESETS[preset]["steps"]:
        low = s["narration"].lower()
        for term, gloss in GLOSS.items():
            if term in low and term not in seen:
                seen.add(term)
                assert any(g in low for g in gloss), (s["id"], term)


def test_no_quantum_advantage_claim_and_honest_close():
    for preset in PRESETS.values():
        text = " ".join(s["narration"].lower() for s in preset["steps"])
        assert "no quantum advantage" in text
        for m in re.finditer(r"advantage", text):
            assert "no quantum advantage" in text[max(0, m.start() - 12): m.end()]


def test_captions_are_short():
    for preset in PRESETS.values():
        for s in preset["steps"]:
            assert all(len(line.split()) <= 12 for line in s["captions"]), s["id"]


def test_chat_questions_have_reviewed_cached_answers():
    cache = json.loads((ROOT / "results" / "llm_cache.json").read_text())
    typed = [a["text"] for p in PRESETS.values() for s in p["steps"] for a in s["actions"] if a["do"] == "type"]
    assert typed and set(typed) <= set(llm.DEMO_QUESTIONS)
    for q in llm.DEMO_QUESTIONS:
        key = f"flexible:0.5|{llm._norm(q)}"
        assert key in cache["ask"], key
        text = cache["ask"][key]["text"]
        assert llm.ground(text, llm.allowed_numbers(llm.facts(DATA, "flexible", 0.5))) == text
        assert len(re.split(r"(?<=[.!?])\s+", text)) <= 3


def test_demo_answers_never_call_the_model(monkeypatch):
    from fastapi.testclient import TestClient
    from server.main import app
    monkeypatch.setattr(llm, "config", lambda: {"key": "x", "base": "http://x", "model": "m"})
    called = []
    monkeypatch.setattr(llm, "_chat", lambda *a, **k: called.append(1) or None)
    c = TestClient(app)
    for q in llm.DEMO_QUESTIONS + ["Something not in the cache?"]:
        r = c.post("/api/ask", json={"question": q, "preset": "flexible", "w": 0.5, "demo": True})
        assert r.status_code == 200
    r = c.post("/api/parse-jobs", json={"text": "A 500 kWh job at Site A.", "demo": True})
    assert r.status_code == 200 and r.json()["source"] == "template"
    assert called == []


def test_selectors_used_by_the_demo_exist_in_the_app():
    src = "\n".join(p.read_text() for p in (ROOT / "web" / "src").rglob("*.tsx"))
    for attr in ["data-value", "data-demo=\"read-jobs\"", "id=\"tech\"", "data-lane", "aria-label=\"Your question\"", "label=\"Which schedule\"", "label=\"Comparison\""]:
        assert attr in src, attr


def test_every_chapter_has_a_fixed_start():
    for preset in PRESETS.values():
        starts = [c["start"] for c in preset["chapters"]]
        assert starts == sorted(starts) and starts[0] == 0
        first = {c["id"]: c["start"] for c in preset["chapters"]}
        for s in preset["steps"]:
            assert s["start"] >= first[s["chapter"]]
