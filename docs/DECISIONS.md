# Decisions log

Short records of significant choices and why we made them. Newest at the bottom.

### D1. Qiskit 2.x, not the template's `qiskit<2.0` (Oct 22)
IBM's current Runtime docs and `qiskit-ibm-runtime` 0.50 target Qiskit 2.x. We tested qiskit 2.6.0 + runtime 0.50.0 + aer 0.18.0 together in a clean Python 3.12 venv and pinned exactly those versions. We dropped qiskit-nature, qiskit-algorithms, qiskit-optimization and scikit-learn because we don't use them.

### D2. Binary encoding instead of one-hot QUBO (Oct 22)
The starting hypothesis was a one-hot QUBO: one qubit per (job, option), plus a penalty forcing exactly one option per job. For 4 jobs x 4 options that needs 16 qubits, and only 256 of the 65,536 bitstrings (0.39%) are valid schedules. Penalties also have to be tuned.
We use **2 qubits per job** instead: one "where" qubit (site A/B) and one "when" qubit (day/night). The 4 jobs need 8 qubits, **every bitstring is a valid schedule**, and no penalty is needed.
Cost: the Hamiltonian is no longer purely quadratic, because it gets ZZZZ terms from the "two jobs share an option" check. QAOA handles higher-order terms directly (`QAOAAnsatz` with a `SparsePauliOp`).
Measured on the FakeMarrakesh layout at p=1: binary ~121 two-qubit gates, one-hot ~227. The smaller circuit is what makes a hardware run meaningful.

### D3. Build the Hamiltonian ourselves (Oct 22)
We don't use qiskit-optimization's QuadraticProgram converters (they target QUBOs, and we have higher-order terms). We build each job's cost table with a Walsh-Hadamard expansion and use the identity same(i,j) = prod_b (1 + Z_ib Z_jb)/2 for pairs. A test checks the Hamiltonian's diagonal equals the classical objective on all 256 schedules for several weights, so the quantum and classical sides provably solve the same problem.

### D4. Data: one cited Indian grid, illustrative sites (Oct 22)
- **Cited:** CEA CO2 Baseline Database v21.0 (FY 2024-25) all-India average 0.710 tCO2/MWh, with the operating margin 0.961 used as the fossil-only intensity. Macknick et al. 2012 (NREL) coal cooling-tower water use, median 687 gal/MWh = 2.60 L/kWh.
- **Illustrative, labelled as such:** the day/night carbon split (0.640 / 0.780, mean = CEA 0.710); site PUE (1.40 evaporative, 1.58 air-cooled, anchored to Uptime's 1.56 average and the Phoenix study's ~13% gap); WUE (inside Equinix's 0 to 2.5 L/kWh range); job energies; the congestion fraction (0.15).
- Indirect water = fossil share x 2.60 L/kWh, where fossil share = slot carbon / 0.961. This is an approximation, not a measurement.

### D5. Naive baseline = run at home site, immediately (Oct 22)
Our first draft had every job submitted in the daytime solar slot. That is already near carbon-optimal, so most "savings" came from congestion. That isn't a fair or honest comparison. The scenario now is an evening batch burst: two big jobs land on Site A overnight. Savings then come from moving work to cleaner or drier slots and sites as well as from avoiding overload. At w=0.5 the optimum saves about 14% CO2 and 14% water against naive.

### D6. Congestion coupling (Oct 22)
Without a coupling term, each job could pick its best option independently, which is trivial. The congestion term (sharing a site-slot costs an extra 15% of the pair's energy at the average footprint) makes it a genuine combinatorial problem: choices interact, and the search space grows as (options)^(jobs). We make no formal hardness claim for this exact cost structure. At our size a classical computer solves it instantly; we do not claim advantage.

### D7. CVaR-QAOA, trained on an exact simulator; only fixed circuits go to hardware (Oct 22)
The Open Plan gives 10 QPU minutes per 28 days and no Session mode, so a variational loop on hardware (hundreds of jobs, each queued) is impractical. We train γ, β on an exact simulator and send one fixed circuit per run. Training uses a small numpy simulator of the same circuit, which is exact here because the cost layer is diagonal and the mixer is single-qubit RX gates. A test checks it equals Qiskit's `Statevector` of the `QAOAAnsatz`. It is ~100x faster, so the demo can retrain live when the slider moves. The objective is CVaR with α = 0.25 (Barkoutsos et al. 2020); α between 0.05 and 1 changed results very little on this instance.

### D8. p = 1 on hardware (Oct 22)
On the simulator, p = 2 and p = 3 raise P(optimal) from 1.5% to 2.8% and 4.1%. But each layer roughly doubles the two-qubit gates (114 → 256 for p = 2 on Marrakesh, measured), and noise would erase the gain. We use p = 1 on hardware and report deeper p on the simulator only.

### D9. Hardware runs: raw vs DD + twirling, 4,000 shots, ibm_marrakesh (Oct 22)
Two jobs per run, identical except for error suppression (XY4 dynamical decoupling + gate and measurement twirling), give a direct mitigation comparison for ~6 s of QPU time. Results are saved at submission and on completion. We later repeated the pair at w = 0 and w = 1 so the demo slider has real hardware results at three positions (6 jobs, 18 s of QPU time in total). Mitigation was not consistently helpful: +0.012, +0.007 and −0.006 approximation ratio at w = 0, 0.5 and 1.

### D10. All Qiskit calls in the demo on one persistent worker thread (Oct 22)
Streamlit runs each rerun on a new thread. Qiskit 2.6's Rust extension (mimalloc allocator) segfaulted inside `SparsePauliOp.simplify` when a new thread called in after an earlier thread exited. A native crash report pointed at `_mi_malloc_generic`, and a five-line Streamlit script reproduced it. The fix: the app sends every Qiskit call to a single `ThreadPoolExecutor(max_workers=1)` kept alive with `st.cache_resource`. A headless app test (`tests/test_app.py`) moves the slider to guard against regressions.

### D11. Headline metric for non-experts: share of shots in the best 10% (Oct 22)
"Approximation ratio" is hard to explain in a minute. "The quantum computer put 19-21% of its shots in the best 10% of schedules; random guessing puts 10%" is easy, and is computed from the same counts.
