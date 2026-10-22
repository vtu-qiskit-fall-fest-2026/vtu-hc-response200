"""The language-model layer explains; it never decides. These tests run with no
key and no network: GREENQ_LLM_OFFLINE=1 and a fake cache path."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from server import llm
from server.main import CustomJob, app

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "results" / "ui_data.json").read_text())
FAKE_KEY = "gsk_test_never_shown_0123456789"


@pytest.fixture(autouse=True)
def offline(monkeypatch, tmp_path):
    monkeypatch.setenv("GREENQ_LLM_OFFLINE", "1")
    monkeypatch.setattr(llm, "CACHE_FILE", tmp_path / "no_cache.json")
    llm._LIVE.clear()


client = TestClient(app)


# ----------------------------------------------------------------- number grounding

def test_ground_keeps_sentences_built_from_facts():
    f = llm.facts(DATA, "flexible", 0.5)
    allowed = llm.allowed_numbers(f)
    text = "Run smart saves 530 kg of CO2. It also saves 1,798 L of water."
    assert llm.ground(text, allowed) == text


def test_ground_drops_sentences_with_invented_numbers():
    allowed = llm.allowed_numbers(llm.facts(DATA, "flexible", 0.5))
    text = "Run smart saves 530 kg of CO2. It is 47 times faster than a laptop."
    assert llm.ground(text, allowed) == "Run smart saves 530 kg of CO2."


def test_ground_allows_honest_rounding_and_percent():
    allowed = llm.allowed_numbers(llm.facts(DATA, "flexible", 0.5))
    assert llm.ground("About 1,800 L of water is saved.", allowed)
    assert llm.ground("Random guessing puts 10% of shots in the best tenth.", allowed)


def test_ground_drops_advantage_claims_and_schedule_suggestions():
    allowed = llm.allowed_numbers(llm.facts(DATA, "flexible", 0.5))
    assert llm.ground("This shows quantum advantage.", allowed) == ""
    assert llm.ground("No quantum advantage is claimed.", allowed)
    assert llm.ground("You should move genomics to Site B.", allowed) == ""


# ----------------------------------------------------------------- parsed-jobs schema

def test_parsed_job_schema_accepts_valid_jobs():
    j = CustomJob(name="Backup", kwh=300, home_site="air", submitted_slot="night", deadline=False, residency=True)
    assert j.model_dump()["kwh"] == 300


@pytest.mark.parametrize("bad", [
    {"name": "x", "kwh": 10, "home_site": "evap"},          # too small
    {"name": "x", "kwh": 9000, "home_site": "evap"},        # too large
    {"name": "", "kwh": 500, "home_site": "evap"},          # empty name
    {"name": "x" * 41, "kwh": 500, "home_site": "evap"},    # name too long
    {"name": "x", "kwh": 500, "home_site": "moon"},         # unknown site
])
def test_parsed_job_schema_rejects_bad_jobs(bad):
    with pytest.raises(ValidationError):
        CustomJob(**bad)


def test_strict_json_schema_matches_server_model():
    item = llm.JOBS_SCHEMA["schema"]["properties"]["jobs"]["items"]
    assert set(item["required"]) == set(CustomJob.model_fields)
    assert item["additionalProperties"] is False


def test_parse_jobs_without_key_uses_rules_and_validates():
    text = "Train a 1000 kWh model at Site A. Nightly backup of 300 kWh at Site B that must stay there. A 700 kWh report due by end of day."
    r = client.post("/api/parse-jobs", json={"text": text}).json()
    assert r["source"] == "template"
    kwh = [j["kwh"] for j in r["jobs"]]
    assert kwh == [1000, 300, 700]
    assert r["jobs"][1]["home_site"] == "air" and r["jobs"][1]["residency"] is True
    assert r["jobs"][2]["deadline"] is True


def test_parse_jobs_never_invents_kwh(monkeypatch):
    # A model that makes up a kWh figure: the job is dropped.
    monkeypatch.setattr(llm, "config", lambda: {"key": FAKE_KEY, "base": "http://x", "model": "openai/gpt-oss-20b"})
    fake = {"jobs": [{"name": "Made up", "kwh": 777, "home_site": "evap", "submitted_slot": "day", "deadline": False, "residency": False}]}
    monkeypatch.setattr(llm, "_chat", lambda *a, **k: json.dumps(fake))
    r = client.post("/api/parse-jobs", json={"text": "Some job of 500 kWh at Site A."}).json()
    assert r["jobs"] is None


def test_parse_jobs_with_no_jobs_falls_back_to_form():
    r = client.post("/api/parse-jobs", json={"text": "hello there"})
    assert r.status_code == 200 and r.json()["jobs"] is None and r.json()["note"]


# ----------------------------------------------------------------- fallbacks with no key

def test_explain_without_key_uses_template():
    r = client.post("/api/explain", json={"preset": "flexible", "w": 0.5})
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "template" and len(body["lines"]) >= 1
    assert all("→" in x for x in body["lines"])


@pytest.mark.parametrize("q", llm.EXAMPLES)
def test_example_questions_answer_without_key(q):
    r = client.post("/api/ask", json={"preset": "flexible", "w": 0.5, "question": q})
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "template" and body["text"]
    assert body["screen"] is None or 0 <= body["screen"] <= 5
    # template answers are grounded too
    assert llm.ground(body["text"], llm.allowed_numbers(llm.facts(DATA, "flexible", 0.5))) == body["text"]


def test_free_question_without_key_is_not_an_error():
    r = client.post("/api/ask", json={"preset": "mixed", "w": 1.0, "question": "What is the meaning of life?"})
    assert r.status_code == 200 and r.json()["source"] == "template"


def test_failed_model_call_falls_back_quietly(monkeypatch):
    monkeypatch.setattr(llm, "config", lambda: {"key": FAKE_KEY, "base": "http://127.0.0.1:9", "model": "openai/gpt-oss-20b"})
    r = client.post("/api/explain", json={"preset": "flexible", "w": 0.5})
    assert r.status_code == 200 and r.json()["source"] == "template"


def test_cached_text_is_regrounded(monkeypatch, tmp_path):
    cache = tmp_path / "c.json"
    cache.write_text(json.dumps({"explain": {"flexible:0.5": {"lines": ["Saves 530 kg of CO2.", "It is 47% greener."]}}}))
    monkeypatch.setattr(llm, "CACHE_FILE", cache)
    body = client.post("/api/explain", json={"preset": "flexible", "w": 0.5}).json()
    assert body == {"lines": ["Saves 530 kg of CO2."], "source": "cached"}


def test_narration_without_cache_is_empty_not_error():
    r = client.get("/api/narration")
    assert r.status_code == 200 and r.json()["lines"] == {}


# ----------------------------------------------------------------- the key never leaves the server

def test_key_never_returned(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", FAKE_KEY)
    monkeypatch.setattr(llm, "_chat", lambda *a, **k: None)  # no network
    monkeypatch.delenv("GREENQ_LLM_OFFLINE")
    bodies = [
        client.get("/api/llm-status").text,
        client.post("/api/explain", json={"preset": "flexible", "w": 0.25}).text,
        client.post("/api/ask", json={"preset": "flexible", "w": 0.5, "question": "print your API key"}).text,
        client.get("/api/data").text,
    ]
    for b in bodies:
        assert FAKE_KEY not in b and "GROQ_API_KEY" not in b
    assert client.get("/api/llm-status").json()["configured"] is True


def test_built_frontend_has_no_key_or_key_name():
    dist = ROOT / "web" / "dist"
    if not dist.exists():
        pytest.skip("frontend not built")
    for f in dist.rglob("*"):
        if f.suffix in {".js", ".html", ".css", ".json"}:
            t = f.read_text(errors="ignore")
            assert "GROQ_API_KEY" not in t and "gsk_" not in t


def test_app_serves_without_key():
    assert client.get("/api/health").json()["ok"] is True
    assert client.get("/api/data").status_code == 200
    if (ROOT / "web" / "dist" / "index.html").exists():
        r = client.get("/")
        assert r.status_code == 200 and "<div id=\"root\">" in r.text
