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
Two jobs per run, identical except for error suppression (XY4 dynamical decoupling + gate and measurement twirling), give a direct mitigation comparison for ~6 s of QPU time. Results are saved at submission and on completion. We later repeated the pair at w = 0 and w = 1 so the demo slider has real hardware results at three positions (6 jobs, 18 s of QPU time in total). Mitigation was not consistently helpful: +0.012, +0.008 and −0.006 approximation ratio at w = 0, 0.5 and 1.

### D10. All Qiskit calls in the demo on one persistent worker thread (Oct 22)
Streamlit runs each rerun on a new thread. Qiskit 2.6's Rust extension (mimalloc allocator) segfaulted inside `SparsePauliOp.simplify` when a new thread called in after an earlier thread exited. A native crash report pointed at `_mi_malloc_generic`, and a five-line Streamlit script reproduced it. The fix: the app sends every Qiskit call to a single `ThreadPoolExecutor(max_workers=1)` kept alive with `st.cache_resource`. A headless app test (`tests/test_app.py`) moves the slider to guard against regressions.

### D11. Headline metric for non-experts: share of shots in the best 10% (Oct 22)
"Approximation ratio" is hard to explain in a minute. "The quantum computer put 19-21% of its shots in the best 10% of schedules; random guessing puts 10%" is easy, and is computed from the same counts.

### D12. New demo UI: React + Vite, served by FastAPI, reading one saved file (Oct 22)
The user asked for a presentation-ready UI for a 1080p video and a projector. Architecture:
- `scripts/export_ui_data.py` turns the saved results into one file, `results/ui_data.json`.
- FastAPI serves that file at `/api/data` and the built React app at `/`.
- `python -m server` builds the UI on first run (needs Node 20+) and starts everything with one command.

The quantum core (`greenq/`) is unchanged. The UI never computes or fetches anything quantum, so it works offline. An optional `/api/simulate` button retrains and samples on the local simulator; its Qiskit calls run on one persistent thread (see D10). The built `web/dist` and `node_modules` are gitignored; the Streamlit app stays as a fallback.

### D13. Visual direction "Staff Gauge" (Oct 22)
Chosen by the user from a design round: savings are read off painted river staff gauges (as at Indian dams and in CWC reservoir bulletins).
- **Gauges:** a level "draws down" from the amber business-as-usual mark to the GreenQ mark. The gauge window doesn't start at zero, and the caption says so.
- **Board:** sites × slots are concrete bays, with job blocks sized by energy.
- **Slider:** drawn as a gauge staff. Solid stops = real IBM hardware, hatched = no hardware run. The same solid/hatched/outline grammar marks hardware, simulator and random in the proof panel, so the distinction never relies on colour alone.
- **Colour roles:** teal is reserved for carbon, blue for water, amber for business as usual and overload.
- **Fonts:** self-hosted (Big Shoulders stencil for numerals, Atkinson Hyperlegible Next for reading on projectors), so it works offline.

Rejected: a generic dark KPI dashboard (the brief asked to avoid it), a railway departure board (familiar, and its amber identity fights the fixed teal/blue), and a nixie counter and jacquard loom (less clear in one minute).

### D14. Redesign: light, simple, Waymark-inspired, with a draggable dashboard (Oct 22)
The user found the dark staff-gauge UI heavy and hard to understand, and asked for a simpler, premium look modelled on the Waymark template, with the 21st.dev draggable-widget-grid as the dashboard.
- **Rebuilt as:** a light page (white, soft greys, emerald = carbon, blue = water), Tailwind v4 with shadcn-style tokens, Inter. A floating nav, a centred two-line headline, the dashboard in an app window, three "how it works" cards and an FAQ instead of long text.
- **Dashboard:** uses the 21st.dev component unchanged; the 10 widgets are ours and read the same saved data. Controls inside widgets stop pointer events so they don't start a drag. Phones get one column.
- **Not copied:** Waymark's look was recreated in our own code, not copied (hackathon rules forbid copied solutions); it is credited as inspiration.
- **Unchanged:** the quantum core, API and data. Honesty lines were kept: hardware stops marked, mitigation "no consistent gain", illustrative data labelled, no advantage claim. Hero copy says "emits less CO₂ and uses less water", not "less energy", because the air-cooled site can use more electricity.
- **Supersedes:** D13 (staff gauge).

### D15. Fair baselines: greedy, simulated annealing, random sampling (Oct 22)
Brute force as the only comparison isn't enough for a jury, so `greenq/classical.py` adds three competitors on the exact same objective:
- **Greedy:** largest job first, each taking the cheapest option given the jobs already placed.
- **Simulated annealing:** single-job moves, 3 seeded restarts.
- **Random sampling:** the best of 4,000 random schedules, the same shot budget QAOA gets. This was added deliberately, to show that "found the optimum" isn't evidence at this size.

Result on the 4-job instance, all three weights: every method reaches the true best. Greedy takes 0.03 ms, annealing about 17 ms, random sampling about 23 ms, QAOA on the simulator about 0.4 s (train + sample), and IBM hardware 3 s of QPU per job (queue not counted). The UI's "Is it better than simple methods?" section states this plainly. Larger instances are compared in the scaling study.

### D16. Job rules as penalties, not a new encoding (Oct 22)
Real jobs are not all flexible, so each job can carry rules: deadline (day slot only), data residency (home site only), priority (submitted slot only).
- **Encoding:** each disallowed option gets a penalty in that job's own 2-qubit cost table. The penalty is sized at 2 × (spread of allowed costs + all overlap costs), so any rule-breaking schedule costs more than any allowed one; a test checks this for every preset and weight. These are local Z/ZZ terms only, so the circuit's two-qubit structure and the 114-gate count are unchanged.
- **Alternatives:** removing fixed qubits would shrink the circuit, but it needs a per-instance encoding; penalties keep one code path, and every measured bitstring still decodes (rule-breaking shots are flagged and discarded).
- **Presets (illustrative):** all flexible (256 schedules), mixed (64), mostly rigid (8). The flexibility curve averages over every subset of flexible jobs, so it doesn't depend on which job we picked.
- **Hardware:** one job only, on the most informative instance (mixed, balanced, raw, 4,000 shots), job `dbd13dk24mrc73cki6eg`, about 3 s. Remaining Open Plan time was 582 s before the job and 579 s after. 61% of hardware shots obeyed every rule (random 25%, ideal simulator 99%, noisy model 92%). The real device is noisier than its model, which matches the earlier runs.
- **Code:** hardware selection everywhere (export, summary, baselines, Streamlit) now filters by preset, so the rules run never mixes into the original six.

### D17. Scaling study: measured only, best-10% share as the headline metric (Oct 22)
- **Setup:** 4–11 jobs (8–22 qubits). QAOA p=1 trained on the exact simulator; the grid search is coarser above 14 qubits to keep each size under about 3 minutes. The circuit is compiled for the ibm_marrakesh layout (FakeMarrakesh, level 3).
- **Noisy simulation:** run up to 16 qubits only, because noisy trajectories at 18+ qubits were too slow on the laptop. We don't extrapolate.
- **Metric:** the chart uses "share of shots in the best 10%" rather than the approximation ratio. Random guessing's ratio drifts upward with size, while its best-10% share stays at exactly 10%, so the comparison stays readable.
- **Calibration:** the real hardware point (8 qubits) is plotted next to the noise model, so the model's optimism is visible.
- **Findings:** greedy misses from 5 jobs and annealing from 8. Exhaustive search is still fast at 22 qubits. No advantage claimed.

### D18. Water stress from WRI Aqueduct 4.0 state scores; no regional carbon (Oct 22)
- **Source:** Aqueduct 4.0 (2023), provincial baseline water stress with total-demand weighting, downloaded from WRI (CC BY 4.0). Cities map to their state's score: Delhi → NCT of Delhi 4.75, Mumbai → Maharashtra 4.20, Chennai → Tamil Nadu 4.15, Hyderabad → Telangana 3.92, Bengaluru → Karnataka 3.74, Kolkata → West Bengal 2.53. India's score is 4.11. City-level values weren't available in a citable form, so we use state level and label the city mapping as illustrative.
- **Weighting:** weight = score ÷ 5, applied to on-site cooling water; power-plant water uses India's national score. The objective normalises water by business as usual, so any common scale factor cancels; only the ratio between sites matters.
- **Grid carbon:** it stays the CEA national average, because India runs one synchronous national grid and CEA publishes one baseline. We didn't invent state carbon intensities.
- **Result:** the plan changes at 6 of 21 settings for Delhi + Kolkata, 2 for Mumbai + Hyderabad, and 0 for Chennai + Bengaluru. No hardware was used.

### D19. Live custom jobs and the annual-impact calculator (Oct 22)
- **`POST /api/custom`:** accepts 1–5 jobs (validated: name 1–40 characters, 50–5,000 kWh, known site and slot, and a day deadline can't arrive at night). It solves them by brute force and with QAOA p=1, using a coarse grid (12) + COBYLA. The 4,000 shots are drawn from the exact output distribution of the circuit; the fast simulator is tested equal to Qiskit's Statevector. Qiskit's StatevectorSampler took about 8 s at 10 qubits, and this takes about 0.1 s. The response and the UI say "live simulator, not hardware". The offline demo doesn't depend on it.
- **Annual impact:** a what-if calculator, not a result. Its inputs (fleet GWh, flexible share) are visibly labelled assumptions; it multiplies them by the measured saving and the business-as-usual footprint per kWh of the example, and shows the formula.
- **Fix:** `index.html` still declared `color-scheme: dark` from the old UI, which made unticked checkboxes render dark; it's now light.

### D20. Robustness: fixed plan, perturbed reality, regret vs brute force (Oct 22)
Forecast error is modelled as a uniform independent error on each slot's grid carbon intensity (±5%, plus ±10% for context). Power-plant water follows, because it is derived from the fossil share. 200 seeded draws per setting. Regret is measured on each draw's own objective. Result: within 5% of the new best in 100% of draws. At ±5% and balanced priority the plan is still exactly best in 76.5% of draws, with a worst case of 0.7%. The error model is simple and illustrative; real forecast errors are correlated over time.

### D21. UI v3: six no-scroll slides, scaled by root font size (Oct 22)
- **Why:** the long scroll page was too wordy for a jury and a projector. Six screens in a sidebar (Start, Schedule, Quantum, Compare, Ask, About), one headline of 8 words or fewer each, labels instead of paragraphs, and `i` popovers of at most two lines. Exact names (QAOA, qubits, ibm_marrakesh) stay on the Quantum, Compare and About screens; elsewhere the words are "run now / run smart", "where" and "when".
- **Fit:** every screen is laid out on a 1600×900 canvas. The root font size scales it to the window, and a small Vite plugin converts the built CSS from px to rem. We tried CSS `zoom` and `transform: scale` first: in a measured test both started the moving job blocks 20% off their real position at 1.2× (Motion measures in screen pixels, then applies its transform in scaled pixels). Root font size has no such problem. Checked at 1920×1080 and 1366×768: no screen scrolls, no element overflows.
- **Reuse:** the v2 widgets (scene, slider, trade-off, circuit, histogram, methods, scaling, cities, robustness, live jobs, fleet calculator) are reused with their text trimmed. The draggable widget grid is kept in the repo but unused, because a drag grid can't fit a no-scroll slide.
- **Story mode:** about 35 s over Start → Schedule → Quantum, with captions in the footer so the "Not quantum advantage" pill is never covered. Any click, wheel or navigation key pauses it.

### D22. A language model explains; it never decides (Oct 22)
- **Role:** words only: why-this-schedule lines, short answers on the Ask screen, story captions, and reading a typed job description into the job table. Schedules always come from brute force and QAOA.
- **Grounding:** the server sends only named facts built from `results/ui_data.json` for the current setting. It then splits the reply into sentences and drops any sentence with a number that doesn't match a fact (ordinary rounding allowed), any schedule suggestion ("should…"), and any advantage claim that isn't a negation. Cached text is checked again when served. For typed jobs, every kWh figure must appear in the user's text, and each job passes the same pydantic validation as the form.
- **Fallback:** live model → `results/llm_cache.json` → templates built from the same data. Every reply carries its source, and the UI badge says AI EXPLANATION or TEMPLATE. Offline, free-typed questions get a polite pointer to the five example questions; there's never an error on screen.
- **Key:** `GROQ_API_KEY` lives in `.env`, is read on the server only, and is never logged (failures log only the HTTP status), returned, or sent to the browser. Tests check API responses and the built frontend for the key and its name.

### D23. Groq with `openai/gpt-oss-20b` and strict JSON schema (Oct 22)
- **Why Groq:** it's free to start, fast, and OpenAI-compatible, so it's a plain `httpx` POST to `/chat/completions` with no new SDK. `LLM_BASE_URL` and `LLM_MODEL` can point at any compatible provider.
- **Why this model:** on Groq, strict `json_schema` structured outputs are supported by `openai/gpt-oss-20b` and `openai/gpt-oss-120b` (checked in Groq's docs on Oct 22). The 20b model is the faster one, and the explanations are short. We send `reasoning_effort: low` and temperature 0.2. Other models fall back to JSON-object mode.
- **Time limits:** 8–12 s timeouts. Live answers are memoised in memory, and the cache script paces its requests for the free tier.

### D24. Start screen: our own SVG scenes instead of photos (Oct 22; superseded by D25)
- **Why:** the Start slide must explain the project in five seconds, so it got a background slideshow (servers → cooling water → grid carbon → quantum computer → greener data hall) whose captions drive a three-step strip.
- **SVG, not photos:** we drew the scenes ourselves rather than downloading licensed photos. There are no licences or authors to track, they are sharp at any size, they add only a few KB to the JavaScript bundle (no image files, nothing to preload), they work offline, and they carry no brand marks. In particular there is no IBM marketing photo of their hardware: the quantum scene is a generic gold dilution-refrigerator "chandelier".
- **Readability:** text sits on 85% white glass cards over a white gradient. We measured the contrast of every text colour against the actual card pixels in all five scenes; the lowest was 4.4:1 for the grey second headline line, so it was darkened to 60% ink (5.2:1).
- **Honest chips:** "Real IBM quantum runs: 7" is counted from the data (6 at the three priority settings + 1 with job rules), not typed in.

### D25. A wordless hero loop replaces the Start text (Oct 23)
- **Why:** a juror should get the story in one glance without reading: jobs pile up at home, a quantum chip works, jobs move, and footprint drops. The Start screen is now a 16-second SVG loop with one button; the headline, sub-line, number row, chips and slideshow are gone.
- **Real, not decorative:** the chip's qubit links are the two-qubit (ZZ) pairs of the actual exported circuit, the blocks move between the real run-now and run-smart schedules, and the savings count up from `ui_data.json` (a test checks no saving is typed into the source). The ILLUSTRATIVE and REAL IBM RUN badges stay on screen.
- **SVG + Motion, not video:** it stays sharp on a projector, works offline, weighs a few KB, and can be held, paused or frozen (reduced motion). A recording for YouTube can be made with Playwright; the live hero stays code.

### D26. Our own mascot ("Dewy") instead of the Bible Strong Avatar Lab package (Oct 23)
- **Source of ideas:** the handout *Make Your Own Mascot* (Saksham Gupta) walks through Bible Strong Avatar Lab by Stéphane Montlouis-Calixte (AGPL-3.0). We took only ideas: eyes-only faces, automatic blinking and breathing, a named set of moods, a mood controller (play / setMood / onEnd), and the table of moments that trigger a mood.
- **Why our own:** no licence question (AGPL would bind the app), no manual step in a browser studio, fully offline, moods tied directly to our app state, and all of it our own work inside the hackathon window, as the rules require. Dewy is an original SVG drawn for GreenQ and animated with Motion, which we already use.
- **Guardrails:** Dewy never states a number on its own; tour lines are under 10 words and number-free (tested); AI answers it speaks are the grounded ones, with their badge. The Bible Strong swap stays optional and is not done; if it ever is, the README and About must credit the author and repo and state AGPL-3.0.
- **Rate limits:** Groq's free tier returned HTTP 429 when the slider swept quickly. The server now cools down for the `retry-after` time and serves the cache or a template meanwhile; the explanation request waits 0.7 s for the slider to settle, and the cache builder retries.

### D27. Reviewing the AI answers: sharper facts, a larger model for saved answers, hand-written captions (Oct 23)
- **What we found:** the first generated cache (gpt-oss-20b) passed the number check but had wrong *words*. It said the air-cooled site uses less cooling power (it's the reverse), that 18–23% "matches" the simulator's 34%, that "IBM hardware takes 21 s" (that's all 7 runs together), and "all facts cited". A number check can't catch these.
- **Fixes:**
  - The facts now spell out the relations the model kept getting wrong: what each site trades, about 3 s per run, why hardware scores below the simulator, which inputs are cited and which are illustrative, and what moves when only water or only carbon matters.
  - The prompt forbids relating two numbers unless a fact states the relation.
  - The template reason "less cooling power" became "less cooling electricity".
  - Saved answers are generated with `openai/gpt-oss-120b`; live answers keep the faster 20b model.
- **Review rule:** we read every cached entry before committing it, and drop any entry that is wrong (it then falls back to the hand-written template, labelled TEMPLATE). We never hand-edit model text and still label it AI.
- **Story captions** stay hand-written (`web/src/lib/story.ts`); the generated ones were less accurate.
- **Second review (gpt-oss-120b cache):** 48 entries were generated and 3 were dropped: a video move invented at carbon-only, a carbon reason at the water-only setting, and the mixed-preset 61% quoted for the rigid preset. The dropped keys are listed inside `results/llm_cache.json`.
- **Two more guards:**
  - The five example questions never call the live model; they use the reviewed cache or the hand-written template. When we tested a dropped key, the live model had invented a move again.
  - A move check drops any sentence claiming a job moved, stayed or went somewhere that disagrees with the computed schedule. It applies to live why-lines and live answers, and a test re-checks every cached entry.

