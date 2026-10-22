"""GreenQ demo: run with  streamlit run app/streamlit_app.py

Reads saved IBM hardware results from results/hardware/, so it never waits on a
quantum queue. Weights without a saved hardware run use the simulator live.
"""
from __future__ import annotations

import io
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from greenq import data as D                       # noqa: E402
from greenq.classical import brute_force, naive    # noqa: E402
from greenq.encoding import Encoding, onehot_qubits  # noqa: E402
from greenq.metrics import analyze                 # noqa: E402
from greenq.model import Instance                  # noqa: E402
from greenq.qaoa import GreenQAOA                  # noqa: E402
from greenq import runner                          # noqa: E402

st.set_page_config(page_title="GreenQ", page_icon="🌱", layout="wide")

INST = Instance()
JOB_COLORS = ["#2563eb", "#9333ea", "#ea580c", "#0d9488"]


# ---------------------------------------------------------------- data loading
@st.cache_data
def hardware_runs() -> list[dict]:
    runs = []
    for f in sorted((ROOT / "results" / "hardware").glob("*.json")):
        r = json.loads(f.read_text())
        if r.get("status") == "DONE" and r.get("counts"):
            r["file"] = str(f.relative_to(ROOT))
            runs.append(r)
    return runs


@st.cache_resource
def qiskit_worker() -> ThreadPoolExecutor:
    """One long-lived thread for all Qiskit calls.

    Streamlit runs each rerun on a new thread. Qiskit 2.6's Rust core (mimalloc
    allocator) segfaults when a new thread calls in after an earlier one exited,
    so we keep every Qiskit call on this single persistent thread.
    """
    return ThreadPoolExecutor(max_workers=1, thread_name_prefix="qiskit")


def _simulate(w: float, reps: int, shots: int) -> dict:
    enc = Encoding(INST, w)
    q = GreenQAOA(enc, reps=reps)
    res = q.optimize()
    counts = runner.run_ideal(q.bind(res.gammas, res.betas), shots)
    return {"counts": counts, "gammas": res.gammas, "betas": res.betas}


def _circuit_png(w: float, gammas: tuple, betas: tuple) -> bytes:
    import matplotlib
    matplotlib.use("Agg")
    q = GreenQAOA(Encoding(INST, w), reps=len(gammas))
    qc = q.bind(list(gammas), list(betas)).decompose()
    fig = qc.draw("mpl", fold=-1, scale=0.7)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=130)
    return buf.getvalue()


@st.cache_data
def simulate(w: float, reps: int = 1, shots: int = 4000) -> dict:
    return qiskit_worker().submit(_simulate, w, reps, shots).result()


@st.cache_data
def circuit_png(w: float, gammas: tuple, betas: tuple) -> bytes:
    return qiskit_worker().submit(_circuit_png, w, gammas, betas).result()


# ---------------------------------------------------------------- helpers
def schedule_grid(schedule, title: str, subtitle: str) -> str:
    cells = {}
    for j, k in enumerate(schedule):
        cells.setdefault(k, []).append(j)
    head = "".join(f"<th>{t.label}</th>" for t in INST.slots)
    rows = ""
    for si, s in enumerate(INST.sites):
        tds = ""
        for ti, t in enumerate(INST.slots):
            k = si * len(INST.slots) + ti
            jobs = cells.get(k, [])
            chips = "".join(
                f"<span class='chip' style='background:{JOB_COLORS[j % 4]}'>{INST.jobs[j].label}</span>" for j in jobs
            ) or "<span class='empty'>idle</span>"
            warn = "<div class='warn'>overloaded: shares spare capacity</div>" if len(jobs) > 1 else ""
            co2, water = INST.unit[k]
            tds += (f"<td class='{'over' if len(jobs) > 1 else ''}'>{chips}{warn}"
                    f"<div class='unit'>{co2:.2f} kg CO₂ · {water:.1f} L per kWh</div></td>")
        rows += f"<tr><th class='site'>{s.label}</th>{tds}</tr>"
    return (f"<div class='card'><div class='ct'>{title}</div><div class='cs'>{subtitle}</div>"
            f"<table class='grid'><tr><th></th>{head}</tr>{rows}</table></div>")


def why(base, best) -> list[str]:
    lines = []
    for j, (a, b) in enumerate(zip(base, best)):
        if a == b:
            continue
        (sa, ta), (sb, tb) = INST.options[a], INST.options[b]
        d = INST.local[j, b] - INST.local[j, a]
        moves = []
        if sa.key != sb.key:
            moves.append(f"to {sb.label.split(' (')[0]} ({sb.cooling})")
        if ta.key != tb.key:
            moves.append(f"to the {tb.key} slot")
        lines.append(f"**{INST.jobs[j].label}** moves {' and '.join(moves)}: "
                     f"{d[0]:+,.0f} kg CO₂, {d[1]:+,.0f} L on its own.")
    return lines


def decile_shares(counts: dict, cost: np.ndarray) -> np.ndarray:
    rank = np.argsort(np.argsort(cost, kind="stable"), kind="stable")
    dec = (rank * 10) // len(cost)
    out = np.zeros(10)
    tot = sum(counts.values())
    for b, c in counts.items():
        out[dec[int(b, 2)]] += c / tot
    return out


st.markdown("""
<style>
.card{border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:14px 16px;margin-bottom:8px}
.ct{font-weight:700;font-size:1.1rem}.cs{opacity:.75;font-size:.9rem;margin-bottom:8px}
table.grid{width:100%;border-collapse:separate;border-spacing:6px;table-layout:fixed}
table.grid td{width:37%}
table.grid th{font-size:.85rem;opacity:.8;text-align:center;font-weight:600}
table.grid th.site{text-align:left;width:26%}
table.grid td{border:1px dashed rgba(128,128,128,.45);border-radius:10px;padding:8px;vertical-align:top;height:92px}
table.grid td.over{border:2px solid #f59e0b;background:rgba(245,158,11,.08)}
.chip{display:inline-block;color:#fff;border-radius:999px;padding:3px 10px;margin:2px;font-size:.82rem;font-weight:600}
.empty{opacity:.45;font-size:.85rem}.warn{color:#b45309;font-size:.75rem;font-weight:600;margin-top:4px}
.unit{opacity:.6;font-size:.72rem;margin-top:6px}
</style>""", unsafe_allow_html=True)

# ---------------------------------------------------------------- sidebar
with st.sidebar:
    st.header("Your priority")
    pct = st.slider("Carbon vs water", 0, 100, 50, 5,
                    help="0 = save water only, 100 = cut carbon only, 50 = both equally")
    st.caption(f"💧 water {100 - pct}%  ·  🏭 carbon {pct}%")
    w = pct / 100
    hw_for_w = [r for r in hardware_runs() if abs(r["w_carbon"] - w) < 1e-9]
    sources = (["IBM quantum computer (saved run)"] if hw_for_w else []) + ["Quantum simulator (live)"]
    source = st.radio("Quantum result from", sources)
    if not hw_for_w:
        st.caption("No saved hardware run at this weight; using the simulator.")
    st.divider()
    st.caption("Grid carbon and power-plant water figures are cited. Site cooling figures, "
               "day/night split and job sizes are **illustrative**. See the *Data & sources* tab.")

enc = Encoding(INST, w)
cost = enc.cost_vector()
best, worst = brute_force(INST, w)
base = naive(INST, w)

if source.startswith("IBM"):
    mitig = {r["mitigation"]: r for r in hw_for_w}
    run = mitig.get("dd_twirl") or next(iter(mitig.values()))
    counts = run["counts"]
    src_label = f"IBM {run['backend']} · job {run['job_id']}"
else:
    sim = simulate(w)
    counts = sim["counts"]
    src_label = "Qiskit simulator (ideal)"
m = analyze(counts, enc)
green = tuple(m["best_sampled_schedule"])
gq_co2, gq_water = INST.footprint(green)

# ---------------------------------------------------------------- header + KPIs
st.title("🌱 GreenQ")
st.markdown("**Where and when should data-centre jobs run to waste the least carbon and water?** "
            "A quantum algorithm (QAOA, built in Qiskit) picks a site and a time slot for each job.")

k1, k2, k3, k4 = st.columns(4)
k1.metric("CO₂ saved vs business as usual", f"{base.kg_co2 - gq_co2:,.0f} kg",
          f"-{100 * (base.kg_co2 - gq_co2) / base.kg_co2:.0f}%", delta_color="inverse")
k2.metric("Water saved", f"{base.litres - gq_water:,.0f} L",
          f"-{100 * (base.litres - gq_water) / base.litres:.0f}%", delta_color="inverse")
k3.metric("Cheapest shot = true best schedule?", "Yes" if m["found_optimum"] else "No (close)",
          f"seen in {round(m['p_optimal'] * m['shots'])} of {m['shots']:,} shots · random ≈ {m['shots'] / len(cost):.0f}",
          delta_color="off")
k4.metric("Quantum circuit", f"{enc.n_qubits} qubits",
          f"{m['shots']:,} shots · {src_label.split(' · ')[0]}", delta_color="off")

c1, c2 = st.columns(2)
c1.markdown(schedule_grid(base.schedule, "Business as usual",
                          f"Each job runs at its home site as soon as it arrives · "
                          f"{base.kg_co2:,.0f} kg CO₂ · {base.litres:,.0f} L water"), unsafe_allow_html=True)
c2.markdown(schedule_grid(green, "GreenQ schedule",
                          f"Picked by the quantum circuit ({src_label}) · "
                          f"{gq_co2:,.0f} kg CO₂ · {gq_water:,.0f} L water"), unsafe_allow_html=True)

with st.expander("Why this schedule?", expanded=True):
    for line in why(base.schedule, green):
        st.markdown("- " + line)
    st.markdown("- Some moves look worse for one job on its own: they free up a cleaner slot for a bigger job. "
                "Spreading jobs out also avoids overloading a site's spare capacity, "
                "which would otherwise run on less efficient backup cooling.")

# ---------------------------------------------------------------- tabs
t1, t2, t3, t4 = st.tabs(["⚛️ Is the quantum part real?", "⚖️ Carbon vs water", "📚 Data & sources", "🧭 How it works"])

with t1:
    st.markdown("Each *shot* of the quantum circuit outputs one complete schedule. A useful circuit "
                "should land on **good** schedules more often than random guessing does.")
    series = {"Random guessing": {format(i, f"0{enc.n_qubits}b"): 1 for i in range(len(cost))}}
    for r in hw_for_w:
        series[f"IBM {r['backend']} ({'raw' if r['mitigation'] == 'none' else 'error-mitigated'})"] = r["counts"]
    series["Simulator (ideal)"] = simulate(w)["counts"]
    labels = ["best 10%"] + [f"{10 * i}-{10 * i + 10}%" for i in range(1, 9)] + ["worst 10%"]
    colors = {"Random guessing": "#9ca3af", "Simulator (ideal)": "#16a34a"}
    colors.update({k: ("#93c5fd" if "raw" in k else "#1d4ed8") for k in series if k.startswith("IBM")})
    fig = go.Figure()
    for name, cts in series.items():
        fig.add_bar(name=name, x=labels, y=100 * decile_shares(cts, cost), marker_color=colors.get(name))
    fig.update_layout(barmode="group", height=360, yaxis_title="% of shots",
                      xaxis_title="Schedules ranked from cheapest to most expensive (deciles)",
                      legend=dict(orientation="h", y=1.15), margin=dict(t=40, b=40))
    st.plotly_chart(fig, width="stretch")

    rows = []
    for name, cts in series.items():
        mm = analyze(cts, enc)
        rows.append({"source": name, "approx. ratio (1 = always best)": round(mm["approx_ratio"], 3),
                     "shots in best 10%": f"{100 * mm['share_best10pct']:.1f}%",
                     "shots on the optimum": f"{100 * mm['p_optimal']:.2f}%"})
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")

    if hw_for_w:
        st.subheader("Hardware run details")
        st.dataframe(pd.DataFrame([{
            "backend": r["backend"], "job id": r["job_id"], "error mitigation": r["mitigation"],
            "shots": r["shots"], "two-qubit gates": r["circuit"]["two_qubit_gates"],
            "circuit depth": r["circuit"]["depth"], "physical qubits": str(r["circuit"]["physical_qubits"]),
            "QPU seconds": r.get("quantum_seconds"), "completed (UTC)": r.get("completed_utc"),
            "saved file": r["file"]} for r in hw_for_w]), hide_index=True, width="stretch")
    st.subheader("The circuit")
    sim = simulate(w)
    st.image(circuit_png(w, tuple(sim["gammas"]), tuple(sim["betas"])),
             caption="Hadamards (superposition) → cost layer exp(-iγH) → mixer RX(2β) → measure. "
                     "8 qubits = 4 jobs × (where, when).")
    st.caption(f"Our encoding uses {enc.n_qubits} qubits; the textbook one-hot QUBO would need "
               f"{onehot_qubits(INST)} qubits, and only 0.39% of its outputs would be valid schedules.")

with t2:
    st.markdown("Every dot is one of the 256 possible schedules. Moving the slider changes which one is best.")
    allpts = []
    for s in range(len(cost)):
        sched = enc.decode(format(s, f"0{enc.n_qubits}b"))
        co2, water = INST.footprint(sched)
        allpts.append((co2, water))
    allpts = np.array(allpts)
    fronts = {}
    for ww in np.linspace(0, 1, 21):
        b, _ = brute_force(INST, ww)
        fronts.setdefault(b.schedule, []).append(round(ww * 100))
    fig2 = go.Figure()
    fig2.add_scatter(x=allpts[:, 0], y=allpts[:, 1], mode="markers", name="all schedules",
                     marker=dict(color="#d1d5db", size=6))
    fx = [INST.footprint(s) for s in fronts]
    fig2.add_scatter(x=[p[0] for p in fx], y=[p[1] for p in fx], mode="markers+lines", name="best for some priority",
                     marker=dict(color="#16a34a", size=11), line=dict(dash="dot"),
                     text=[f"best when carbon priority = {v[0]}-{v[-1]}%" for v in fronts.values()])
    fig2.add_scatter(x=[base.kg_co2], y=[base.litres], mode="markers", name="business as usual",
                     marker=dict(color="#dc2626", size=14, symbol="x"))
    fig2.add_scatter(x=[gq_co2], y=[gq_water], mode="markers", name="GreenQ (current)",
                     marker=dict(color="#2563eb", size=16, symbol="star"))
    fig2.update_layout(height=430, xaxis_title="kg CO₂", yaxis_title="litres of water",
                       legend=dict(orientation="h", y=1.12), margin=dict(t=40))
    st.plotly_chart(fig2, width="stretch")
    st.caption("Lower-left is better. The green points are the trade-off frontier: you can't cut carbon "
               "further without using more water.")

with t3:
    st.markdown("#### Figures used")
    st.dataframe(pd.DataFrame([
        {"figure": "Indian grid average carbon intensity", "value": "0.710 kg CO₂/kWh", "status": "CITED (CEA)"},
        {"figure": "Fossil-only grid intensity (operating margin)", "value": "0.961 kg CO₂/kWh", "status": "CITED (CEA)"},
        {"figure": "Water used by coal plants with cooling towers", "value": f"{D.COAL_TOWER_L_PER_KWH:.2f} L/kWh", "status": "CITED (NREL, Macknick 2012)"},
        *[{"figure": f"Grid carbon, {t.label}", "value": f"{t.carbon_kg_per_kwh:.3f} kg CO₂/kWh", "status": "ILLUSTRATIVE (mean = CEA 0.710)"} for t in INST.slots],
        *[{"figure": f"{s.label}: PUE", "value": f"{s.pue:.2f}", "status": "ILLUSTRATIVE (Uptime avg 1.56; Phoenix study gap)"} for s in INST.sites],
        *[{"figure": f"{s.label}: on-site WUE", "value": ", ".join(f"{k} {v} L/kWh" for k, v in s.wue_l_per_kwh.items()), "status": "ILLUSTRATIVE (Equinix range 0-2.5)"} for s in INST.sites],
        {"figure": "Job energies", "value": ", ".join(f"{j.label} {j.it_energy_kwh:.0f} kWh" for j in INST.jobs), "status": "ILLUSTRATIVE"},
        {"figure": "Overload penalty", "value": f"{100 * INST.congestion:.0f}% extra energy for jobs sharing a slot", "status": "ILLUSTRATIVE"},
    ]), hide_index=True, width="stretch")
    st.markdown("#### Sources")
    for v in D.SOURCES.values():
        st.markdown(f"- {v}")

with t4:
    st.markdown("""
1. **Encode.** Each job gets 2 qubits: a *where* qubit (Site A or B) and a *when* qubit (day or night). 4 jobs → 8 qubits, and every measured result is a valid schedule.
2. **Cost Hamiltonian.** We turn the CO₂ + water cost of every schedule into a sum of Z-terms (Z, ZZ, ZZZZ). Tests check it equals the classical cost on all 256 schedules.
3. **QAOA circuit.** Start in an equal superposition of all schedules, add a phase proportional to cost, then mix. Interference makes cheap schedules more likely.
4. **Train classically.** Two angles (γ, β) are tuned on a simulator to minimise the average cost of the best 25% of outcomes (CVaR).
5. **Run on IBM hardware.** The trained circuit runs on a real IBM quantum computer; the cheapest schedule in the shots is GreenQ's answer.
6. **Check honestly.** A brute-force search over all 256 schedules gives the true best, so we can measure how close the quantum result is. At this size a classical computer is faster; no quantum advantage is claimed.
""")
