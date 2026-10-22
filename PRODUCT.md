# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite frontend, built to static files and served by a FastAPI backend (one command starts everything). Chosen by the user. The quantum core (`greenq/`) is independent Python; the UI only reads saved result files and may optionally call the simulator through FastAPI. The Streamlit app (`app/streamlit_app.py`) remains as a no-Node fallback.

## Users

- **Primary:** the expert hackathon jury (VTU Qiskit Fall Fest 2026, Track 6), watching a 3-4 minute screen recording at 1080p or a live demo on a projector in the finals. They judge innovation, Qiskit quality, problem-solving, Track 6 relevance and the working demo, and they reward honesty over hype.
- **Also:** non-experts in the same room, who must understand the point in under a minute.
- The UI is mainly watched, not operated. A presenter drives it, and the main interaction is one carbon-vs-water slider.

## Product Purpose

GreenQ decides where (which data-centre site) and when (which time slot) to run flexible compute jobs so the combined carbon and water footprint is lowest. It uses QAOA built in Qiskit, run on a simulator and on real IBM Quantum hardware. Success means a viewer leaves knowing: the same jobs placed smarter save kg CO₂ and litres of water; carbon and water trade off; the quantum part is real and measured honestly.

## Positioning

A binary "where + when" qubit encoding (2 qubits per job, so every measured bitstring is a valid schedule; half the qubits and gates of a one-hot QUBO), validated end to end on real IBM hardware against a brute-force optimum, with honest metrics. No claim of quantum advantage.

## Operating Context

- Screen-recorded at 1920×1080 for YouTube, and shown on a projector in the finals.
- Must work fully offline from saved results (`results/hardware/*.json`, `results/sim/*.json`); never depends on the IBM queue.
- Presenter narrates following `docs/VIDEO_SCRIPT.md`: headline → schedule board → slider → quantum proof → how it works → honesty footer.

## Capabilities and Constraints

- Instance: 4 jobs (ML model training 1200 kWh, Genomics batch 900, Analytics ETL 600, Video rendering 400) × 2 sites (Site A evaporative cooling, Site B air-cooled chillers) × 2 slots (Day 10:00-16:00, Night 22:00-04:00) = 256 schedules, 8 qubits.
- Baseline "business as usual": each job at its home site, run immediately.
- Carbon weight w from 0 (water only) to 1 (carbon only). Real IBM hardware runs exist at w = 0, 0.5, 1 (ibm_marrakesh, 6 jobs, raw and DD + twirling); other weights are computed by brute force and the simulator.
- Error mitigation gave no consistent benefit; this must be stated, not hidden.
- Terminology: "business as usual" (naive), "GreenQ schedule", "real IBM hardware", "random guessing", "shots".

## Brand Commitments

- Name: GreenQ, by Team Response200 (ID VTU-QFF-HC-0137). Text wordmark only; no logo exists.
- No IBM, Qiskit or VTU logos (avoid implying endorsement); naming IBM hardware in text is factual.
- User-specified (Oct 22, replaces the earlier dark brief): light, simple, premium UI modelled on the Waymark template (https://waymark-template.vercel.app/) and a draggable widget dashboard built on the 21st.dev draggable-widget-grid; very little text. Green/emerald for carbon, blue for water. Recreate the style; never copy its code or assets.
- Small team credit in the footer.

## Evidence on Hand

- Hardware results with backend, job IDs, counts: `results/hardware/` (6 jobs on ibm_marrakesh).
- Simulator results: `results/sim/qaoa_w{0.0,0.5,1.0}_p1.json`.
- Cited data: CEA grid carbon 0.710 kg/kWh (FY 2024-25), NREL coal-plant water 2.60 L/kWh. Everything else (site PUE/WUE, day/night split, job sizes, overload penalty) is ILLUSTRATIVE and must be labelled as such.
- No testimonials, users, deployments or benchmarks exist; none may be implied.

## Product Principles

1. Honesty beats hype: every claim traceable to a saved result or a cited source; illustrative data labelled; no advantage claim.
2. One story, top to bottom: each section answers one question a juror would ask, in order.
3. Readable at a glance from the back of a room: big numbers, few words.
4. The quantum part is shown as evidence, not decoration.

## Accessibility & Inclusion

Projector and video legibility: light theme with dark text (body contrast ≥ 4.5:1), large numbers, few words; checked at 1920×1080, 1366×768 and phone width. Carbon and water must be distinguishable by label and icon shape (leaf vs droplet), not only by green vs blue. Respect reduced-motion preferences.
