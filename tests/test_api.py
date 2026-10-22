"""API tests for the demo server (no browser, no IBM)."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from server.main import app

ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_data_matches_saved_file():
    r = client.get("/api/data")
    assert r.status_code == 200
    body = r.json()
    assert body == json.loads((ROOT / "results" / "ui_data.json").read_text())


def test_data_content_is_consistent():
    d = client.get("/api/data").json()
    # slider: 21 stops from 0 to 1, hardware exactly at 0, 0.5, 1
    assert [s["w"] for s in d["sweep"]] == [i / 20 for i in range(21)]
    assert [s["w"] for s in d["sweep"] if s["hardware"]] == [0.0, 0.5, 1.0]
    # every hardware stop has saved IBM runs (raw + mitigated) with job ids
    for p in d["proof"]:
        assert {h["mitigation"] for h in p["hardware"]} == {"none", "dd_twirl"}
        for h in p["hardware"]:
            assert h["backend"].startswith("ibm_") and h["job_id"]
            assert abs(sum(h["deciles"]) - 1) < 1e-3
            assert h["approx_ratio"] > p["random"]["approx_ratio"]
    # balanced headline numbers
    mid = next(s for s in d["sweep"] if s["w"] == 0.5)
    assert round(mid["saved_kg_co2"]) == 530 and round(mid["saved_litres"]) == 1798
    assert d["totals"]["hardware_jobs"] == 6


def test_export_is_reproducible(tmp_path, monkeypatch):
    """Re-exporting from the saved results gives the same content (apart from the timestamp)."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("export_ui_data", ROOT / "scripts" / "export_ui_data.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    out = tmp_path / "ui.json"
    monkeypatch.setattr(mod, "OUT", out)
    monkeypatch.setattr(mod, "ROOT", ROOT)
    mod.main()
    fresh, saved = json.loads(out.read_text()), json.loads((ROOT / "results" / "ui_data.json").read_text())
    fresh.pop("generated_utc"), saved.pop("generated_utc")
    assert fresh == saved


def test_simulate_runs_on_local_simulator():
    r = client.post("/api/simulate", json={"w": 0.5, "shots": 2000})
    assert r.status_code == 200
    body = r.json()
    assert body["target"].startswith("local Qiskit simulator")
    assert body["approx_ratio"] > body["approx_ratio_random"]
    assert len(body["schedule"]) == 4


@pytest.mark.parametrize("payload", [{"w": 1.5}, {"w": -0.1}, {"w": 0.5, "shots": 5}])
def test_simulate_rejects_bad_input(payload):
    assert client.post("/api/simulate", json=payload).status_code == 422
