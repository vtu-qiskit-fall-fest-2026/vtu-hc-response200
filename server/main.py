"""GreenQ demo server.

* GET  /api/health     -> {"ok": true, "frontend_built": bool}
* GET  /api/data       -> results/ui_data.json (everything the UI shows; saved results only)
* POST /api/simulate   -> optional: retrain + sample QAOA on the local simulator for one weight
* POST /api/custom     -> the presenter's own jobs, solved live (brute force + QAOA simulator)
* POST /api/explain    -> "why this schedule" lines        (server/llm.py: live model, cache or template)
* POST /api/ask        -> short grounded answer to a question
* POST /api/parse-jobs -> plain-English jobs -> validated job table
* GET  /api/narration  -> pre-generated story captions
* /                    -> the built React app (web/dist)

Nothing here talks to IBM. The UI works from /api/data alone; every other
endpoint is an extra with a quiet fallback. The LLM key stays on the server.
"""
from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from typing import Literal

from pydantic import BaseModel, Field

from server import llm

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "results" / "ui_data.json"
DIST = ROOT / "web" / "dist"

# Qiskit 2.6's Rust core can crash when called from short-lived threads
# (see docs/DECISIONS.md D10), so every Qiskit call runs on this one thread.
_QISKIT = ThreadPoolExecutor(max_workers=1, thread_name_prefix="qiskit")

app = FastAPI(title="GreenQ demo", docs_url="/api/docs", openapi_url="/api/openapi.json")


@lru_cache(maxsize=2)
def _read(mtime_ns: int) -> dict:
    return json.loads(DATA_FILE.read_text())


def load_data() -> dict:
    """Saved UI data, re-read automatically when the file changes on disk."""
    if not DATA_FILE.exists():
        raise FileNotFoundError(DATA_FILE)
    return _read(DATA_FILE.stat().st_mtime_ns)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "frontend_built": (DIST / "index.html").exists(), "data_file": DATA_FILE.exists()}


@app.get("/api/data")
def data() -> dict:
    try:
        return load_data()
    except FileNotFoundError:
        raise HTTPException(503, "results/ui_data.json is missing: run  python scripts/export_ui_data.py")


class SimRequest(BaseModel):
    w: float = Field(0.5, ge=0.0, le=1.0, description="carbon weight: 0 = water only, 1 = carbon only")
    shots: int = Field(4000, ge=100, le=20000)


def _simulate(w: float, shots: int) -> dict:
    from greenq.classical import brute_force
    from greenq.encoding import Encoding
    from greenq.metrics import analyze
    from greenq.model import Instance
    from greenq.qaoa import GreenQAOA
    from greenq import runner

    inst = Instance()
    enc = Encoding(inst, w)
    q = GreenQAOA(enc, reps=1)
    res = q.optimize()
    counts = runner.run_ideal(q.bind(res.gammas, res.betas), shots)
    m = analyze(counts, enc)
    best, _ = brute_force(inst, w)
    co2, water = inst.footprint(tuple(m["best_sampled_schedule"]))
    return {
        "w": w, "shots": shots, "target": "local Qiskit simulator (ideal)",
        "gammas": res.gammas, "betas": res.betas,
        "approx_ratio": m["approx_ratio"], "approx_ratio_random": m["approx_ratio_random"],
        "share_best10": m["share_best10pct"],
        "optimum_hits": round(m["p_optimal"] * shots),
        "found_optimum": m["found_optimum"],
        "schedule": m["best_sampled_schedule"],
        "optimal_schedule": list(best.schedule),
        "kg_co2": float(co2), "litres": float(water),
    }


@app.post("/api/simulate")
def simulate(req: SimRequest) -> dict:
    return _QISKIT.submit(_simulate, req.w, req.shots).result(timeout=120)


class CustomJob(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)
    kwh: float = Field(..., ge=50, le=5000, description="IT energy for one run, kWh")
    home_site: Literal["evap", "air"]
    submitted_slot: Literal["day", "night"] = "day"
    deadline: bool = False      # must finish in the day slot
    residency: bool = False     # must stay at its home site


class CustomRequest(BaseModel):
    jobs: list[CustomJob] = Field(..., min_length=1, max_length=5)
    w: float = Field(0.5, ge=0.0, le=1.0)


def _custom(req: CustomRequest) -> dict:
    """Feature 5: the presenter's own jobs, solved live (brute force + QAOA simulator)."""
    import time

    from greenq import data as D
    from greenq.classical import brute_force, naive
    from greenq.encoding import Encoding
    from greenq.metrics import analyze, analyze_rules, probs_to_counts
    from greenq.model import Instance
    from greenq.qaoa import GreenQAOA

    jobs, rules = [], {}
    for i, j in enumerate(req.jobs):
        if j.deadline and j.submitted_slot == "night":
            raise HTTPException(422, f"'{j.name}': a job with a day deadline can't be submitted at night")
        key = f"job{i}"
        jobs.append(D.Job(key, j.name, float(j.kwh), j.home_site, j.submitted_slot))
        r = ({"deadline"} if j.deadline else set()) | ({"residency"} if j.residency else set())
        if r:
            rules[key] = r
    inst = Instance(jobs=jobs, constraints=rules)
    t0 = time.perf_counter()
    best, _ = brute_force(inst, req.w)
    t_bf = (time.perf_counter() - t0) * 1000
    nv = naive(inst, req.w)
    enc = Encoding(inst, req.w)
    t0 = time.perf_counter()
    q = GreenQAOA(enc)
    res = q.optimize(grid=12)  # coarse grid + COBYLA keeps a 5-job request to a few seconds
    # 4,000 shots drawn from the exact output distribution of the QAOA circuit
    # (the fast simulator is tested equal to Qiskit's Statevector); much faster
    # than StatevectorSampler at 10 qubits, so the live demo stays responsive.
    counts = probs_to_counts(res.probs, enc.n_qubits, 4000, seed=7)
    t_q = (time.perf_counter() - t0) * 1000
    m = analyze(counts, enc)
    mr = analyze_rules(counts, enc) if rules else None
    qbest = tuple(mr["best_sampled_schedule"]) if mr else tuple(m["best_sampled_schedule"])
    label = lambda k: {"site": inst.options[k][0].key, "slot": inst.options[k][1].key}  # noqa: E731
    return {
        "mode": "live simulator, not hardware",
        "sampling": "4,000 shots from the exact QAOA (p=1) output distribution",
        "w": req.w, "qubits": enc.n_qubits, "schedules": inst.n_options ** inst.n_jobs,
        "jobs": [j.model_dump() for j in req.jobs],
        "naive": {"schedule": [label(k) for k in nv.schedule], "kg_co2": nv.kg_co2, "litres": nv.litres},
        "best": {"schedule": [label(k) for k in best.schedule], "kg_co2": best.kg_co2, "litres": best.litres, "ms": t_bf},
        "qaoa": {
            "schedule": [label(k) for k in qbest],
            "found_optimum": bool(np.isclose(inst.objective(qbest, req.w), best.objective)),
            "share_best10": (mr or {}).get("share_best10_allowed", m["share_best10pct"]),
            "share_best10_random": (mr or {}).get("share_best10_allowed_random", m["share_best10pct_random"]),
            "share_obeying_rules": mr["share_obeying_rules"] if mr else 1.0,
            "ms": t_q,
        },
    }


@app.post("/api/custom")
def custom(req: CustomRequest) -> dict:
    return _QISKIT.submit(_custom, req).result(timeout=60)


# ----------------------------------------------------------------- language model (explains, never decides)

class ExplainRequest(BaseModel):
    preset: Literal["flexible", "mixed", "rigid"] = "flexible"
    w: float = Field(0.5, ge=0.0, le=1.0)


class AskRequest(ExplainRequest):
    question: str = Field(..., min_length=1, max_length=300)


class ParseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=800)


@app.post("/api/explain")
def explain(req: ExplainRequest) -> dict:
    return llm.explain(load_data(), req.preset, req.w)


@app.post("/api/ask")
def ask(req: AskRequest) -> dict:
    return llm.ask(load_data(), req.preset, req.w, req.question)


@app.post("/api/parse-jobs")
def parse_jobs(req: ParseRequest) -> dict:
    return llm.parse_jobs(req.text, lambda j: CustomJob(**j).model_dump())


@app.get("/api/narration")
def narration() -> dict:
    return llm.narration()


@app.get("/api/llm-status")
def llm_status() -> dict:
    return llm.public_status()


if (DIST / "index.html").exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
else:
    @app.get("/", response_class=HTMLResponse)
    def not_built() -> str:
        return ("<h1>GreenQ frontend not built</h1><p>Run <code>python -m server</code> "
                "(it builds automatically when Node.js is installed) or "
                "<code>cd web && npm ci && npm run build</code>.</p>")
