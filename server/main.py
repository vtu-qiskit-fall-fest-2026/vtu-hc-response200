"""GreenQ demo server.

* GET  /api/health     -> {"ok": true, "frontend_built": bool}
* GET  /api/data       -> results/ui_data.json (everything the UI shows; saved results only)
* POST /api/simulate   -> optional: retrain + sample QAOA on the local simulator for one weight
* /                    -> the built React app (web/dist)

Nothing here talks to IBM. The UI works from /api/data alone; /api/simulate is
an optional extra and the UI must not depend on it.
"""
from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "results" / "ui_data.json"
DIST = ROOT / "web" / "dist"

# Qiskit 2.6's Rust core can crash when called from short-lived threads
# (see docs/DECISIONS.md D10), so every Qiskit call runs on this one thread.
_QISKIT = ThreadPoolExecutor(max_workers=1, thread_name_prefix="qiskit")

app = FastAPI(title="GreenQ demo", docs_url="/api/docs", openapi_url="/api/openapi.json")


@lru_cache(maxsize=1)
def load_data() -> dict:
    if not DATA_FILE.exists():
        raise FileNotFoundError(DATA_FILE)
    return json.loads(DATA_FILE.read_text())


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


if (DIST / "index.html").exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
else:
    @app.get("/", response_class=HTMLResponse)
    def not_built() -> str:
        return ("<h1>GreenQ frontend not built</h1><p>Run <code>python -m server</code> "
                "(it builds automatically when Node.js is installed) or "
                "<code>cd web && npm ci && npm run build</code>.</p>")
