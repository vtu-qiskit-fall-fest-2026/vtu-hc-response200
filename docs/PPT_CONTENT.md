# GreenQ: slide-by-slide content for the solution PPT

For: the Response200 team building the deck (due **Oct 23, 6:00 PM IST** on quc.vtu.ac.in). The audience is the expert jury, who shortlist the Top 50 from the **PPT and the repo**.

Each slide has three parts:
- **On slide:** the text to put on the slide, kept short.
- **Visual:** what to show.
- **Say:** speaker notes, also useful for the video.

Every number here comes from `python scripts/summarize_results.py` or the brute-force model. Don't round them differently on the slides.

Suggested length: 12 slides. Keep one idea per slide.

---

## Slide 1: Title
**On slide**
- **GreenQ**: quantum scheduling of data-centre jobs for less carbon *and* less water
- Team **Response200** · ID **VTU-QFF-HC-0137** · Online tier
- **Track 6**: Quantum Applications for Climate Change & Sustainability
- VTU Qiskit Fall Fest 2026 Hackathon

**Visual:** GreenQ logo text, a small 2×2 grid icon (sites × time slots).

**Say:** "We built GreenQ, a tool that decides where and when to run flexible data-centre jobs so they cost less carbon and less water. The optimiser is a quantum algorithm written in Qiskit, and we ran it on a real IBM quantum computer."

---

## Slide 2: The problem
**On slide**
- Data centres use **electricity** (carbon) and **cooling water**
- Many jobs are **flexible**: ML training, analytics, rendering can run at a different site or time
- **Where** and **when** a job runs changes its footprint, and the two goals **conflict**:
  - evaporative cooling → less electricity, **more water**
  - air cooling → almost no on-site water, **more electricity** (and coal power also consumes water)
- India's grid: **0.710 kg CO₂/kWh** (CEA, FY 2024-25); coal plants with cooling towers: **~2.6 L water/kWh** (NREL)

**Visual:** two-column "evaporative vs air-cooled" comparison with a carbon icon (green/teal) and a water-drop icon (blue).

**Say:** "Saving carbon can cost water and vice versa, and putting every job on the 'best' site overloads it. That makes this a combinatorial choice, not a simple rule."

---

## Slide 3: The task we solve
**On slide**
- 4 flexible jobs × 2 sites × 2 time slots → **256 possible schedules**
  - Site A: evaporative cooling · Site B: air-cooled chillers
  - Day (10:00-16:00, solar-heavy) · Night (22:00-04:00, coal-heavy)
- Cost = carbon + water, blended by a **priority slider** w (0 = water only, 1 = carbon only)
- Jobs **interact**: two jobs on the same site and slot overload its spare capacity (extra energy)
- **Baseline ("business as usual"):** each job runs at its home site the moment it is submitted

**Visual:** 2×2 grid showing the business-as-usual schedule: ML training + genomics stacked on Site A at night (highlighted "overloaded"), analytics on Site B by day, rendering on Site B at night.

**Say:** "Our baseline is what a scheduler does when it ignores carbon and water: run the job immediately, where it lives. It isn't a straw man: two jobs already sit on the more efficient site, and one already runs in the clean daytime slot."

---

## Slide 4: Our approach at a glance
**On slide**
1. **Model** kg CO₂ and litres of water for any schedule
2. **Encode** each job in 2 qubits: a *where* qubit and a *when* qubit
3. **Build** a cost Hamiltonian whose energy = the schedule's cost
4. **Solve** with QAOA (Qiskit), trained on a simulator, run on **IBM hardware**
5. **Check** every result against the true best (brute force over all 256)

**Visual:** the pipeline diagram from the README (Data → Model → Encoding → Hamiltonian → QAOA → Sampler: simulator / IBM hardware → score vs brute force → demo).

**Say:** "Brute force is our referee. Every quantum result is graded against the true best answer."

---

## Slide 5: Key idea: a smarter encoding
**On slide**
- Textbook (one-hot QUBO): 1 qubit per (job, option) → **16 qubits**, only **0.39%** of outputs are valid schedules, needs penalty tuning
- **GreenQ (binary "where + when"): 2 qubits per job → 8 qubits, 100% of outputs are valid schedules**, no penalties
- On IBM Marrakesh at p = 1: **~114 two-qubit gates vs ~227** for one-hot

| | One-hot QUBO | GreenQ binary |
|---|---|---|
| Qubits | 16 | **8** |
| Valid outputs | 0.39% | **100%** |
| Two-qubit gates (transpiled) | ~227 | **~114** |
| Penalty tuning | needed | **none** |

**Visual:** the table, plus a 2-qubit "job" icon: `q_where | q_when`.

**Say:** "This was our main design decision. We challenged the suggested QUBO approach because on today's noisy hardware, half the gates means a much better chance of a meaningful signal."

---

## Slide 6: The cost Hamiltonian
**On slide**
- Each job's cost over its 4 options → Z, Z, ZZ terms on its 2 qubits (Walsh-Hadamard expansion)
- "Two jobs share a slot" = (1 + Z·Z)/2 × (1 + Z·Z)/2 → ZZ and **ZZZZ** terms
- Result: **31 Pauli terms** on 8 qubits (`SparsePauliOp`)
- **Verified:** the Hamiltonian's energy equals the classical cost on **all 256 schedules** (automated test)

**Visual:** the formula `H = Σ c_S ∏ Z_q`, with a small example: job 1's two qubits → its cost table.

**Say:** "The quantum and classical sides provably solve the same problem. A test checks it on every schedule for several priority settings."

---

## Slide 7: QAOA circuit
**On slide**
- Start: Hadamards → equal superposition of all 256 schedules
- **Cost layer** exp(−iγH): phase ∝ schedule cost
- **Mixer** exp(−iβΣX): interference favours cheap schedules
- Measure 4,000 shots → each shot is a full schedule
- p = 1 layer on hardware (deeper circuits add noise)
- Training: γ, β chosen by **CVaR** (average of the best 25% of outcomes, Barkoutsos et al. 2020) with COBYLA, on a simulator
- Built with Qiskit `QAOAAnsatz`, transpiled at optimisation level 3, run with `SamplerV2`

**Visual:** the circuit diagram from the demo ("Is the quantum part real?" tab) or a simplified block version: `H⊗8 → [e^{-iγH}] → [RX(2β)⊗8] → measure`.

**Say:** "We train the two angles on a simulator because IBM's free plan gives 10 minutes of quantum time a month and no session mode. Only the trained circuit goes to hardware, about 3 seconds per job."

---

## Slide 8: Results: carbon and water saved
**On slide** (illustrative instance; numbers from the model)

| Priority | Best schedule's CO₂ | Best schedule's water |
|---|---|---|
| Water only (w = 0) | −390 kg (−10%) | **−2,134 L (−17%)** |
| **Balanced (w = 0.5)** | **−530 kg (−14%)** | **−1,798 L (−14%)** |
| Carbon only (w = 1) | **−593 kg (−16%)** | −1,203 L (−9%) |

- vs business as usual: 3,726 kg CO₂ · 12,687 L water
- The slider changes the answer: 5 different best schedules across the range
- *Data is illustrative (see slide 11)*

**Visual:** demo screenshot `docs/images/demo_schedule.png` (business as usual vs GreenQ grids).

**Say:** "In the balanced setting, moving the ML training job to the air-cooled site by day, and spreading the others out, saves 14% of both carbon and water. Push the slider and the best schedule changes, which is the carbon-water trade-off made visible."

---

## Slide 9: Results: is the quantum part doing real work?
**On slide**
- **6 jobs on IBM `ibm_marrakesh`** (156-qubit IBM Heron r2): 3 priority settings × (raw, error-mitigated), 4,000 shots each, **18 s of QPU time in total**
- Balanced setting (w = 0.5):

| Run | Approx. ratio | Shots in best 10% of schedules |
|---|---|---|
| Random guessing | 0.743 | 10.0% |
| **IBM hardware, raw** | **0.798** | **18.9%** |
| **IBM hardware, DD + twirling** | **0.805** | **21.1%** |
| Ideal simulator | 0.843 | 33.5% |

- All 6 hardware runs beat random by **14-19 standard errors**
- Hardware keeps **48-67%** of the ideal simulator's gain (noise costs the rest)
- Error mitigation: **no consistent benefit** (+0.012, +0.007, −0.006)

**Visual:** the decile bar chart (`docs/images/demo_quantum_proof.png`): random flat at 10%, hardware and simulator piled into the cheapest deciles.

**Say:** "Random guessing puts 10% of its shots in the best 10% of schedules. The real quantum computer puts about 19-21% there, roughly twice as many, and the ideal simulator 33%. We report the error-mitigation result as it was: no consistent gain on this circuit."

---

## Slide 10: Honest reading of the results
**On slide**
- In every run (simulator and all 6 hardware runs) the **cheapest shot was the true best schedule**
  - Hardware, balanced: optimum in **33/4,000** (raw) and **28/4,000** (mitigated) shots; not the most frequent outcome
- But random guessing would also hit it **~16 times** in 4,000 shots, so **finding the optimum at this size is not evidence of quantum benefit**
- The evidence is the **shift of the whole distribution** toward cheap schedules (slide 9)
- **No quantum advantage is claimed.** Brute force solves 256 schedules instantly; it's our referee.

**Visual:** plain text slide, or a small "what we claim / what we don't claim" two-column box.

**Say:** "We want to be precise about this. Our claim is a correct, compact quantum formulation of a real sustainability problem, validated end to end on real IBM hardware with measured accuracy. It isn't a speed-up."

---

## Slide 11: Data honesty and limitations
**On slide**
- **Cited:** grid carbon 0.710 kg/kWh (CEA v21.0, FY 2024-25); fossil-only 0.961 (CEA); coal plant water 2.60 L/kWh (Macknick et al. 2012, NREL)
- **Illustrative (labelled everywhere):** site PUE (1.40 / 1.58, anchored to Uptime's 1.56 average), WUE (inside Equinix's 0-2.5 L/kWh range), day/night carbon split (mean = CEA), job sizes, overload penalty
- **Limitations:** small instance (8 qubits); one grid region, two time slots; circuit depth grows with job pairs; training is classical
- **Path to scale:** qubits grow linearly (2 per job; 3 for 8 options); next steps are decomposition into sub-problems, live regional carbon data and better hardware

**Visual:** two lists, "cited" vs "illustrative".

**Say:** "Every illustrative number is labelled in the code, the demo and the README."

---

## Slide 12: Links and team
**On slide**
- **Repository:** github.com/vtu-qiskit-fall-fest-2026/vtu-hc-response200
- **Demo video (YouTube):** *add link*
- **Run it:** `pip install -r requirements.txt` → `pytest -q` → start the demo (README "How to Run")
- **Hardware evidence:** `results/hardware/` (backend, job IDs, counts)
- **Team Response200**

| Name | GitHub | Role |
|---|---|---|
| Jagpreet Singh | jagpreetsingh02 | Team Lead |
| Ramandeep Singh | Raman-2915 | Developer |

- Built with Qiskit 2.6, Qiskit IBM Runtime, Qiskit Aer. Development assisted by Claude Code.

**Visual:** QR code to the repo (optional), demo screenshot thumbnail.

**Say:** "Everything is in the repo: code, tests, saved hardware results with job IDs, and a plain-language explainer."

---

## Backup slides (optional, for questions)
- **B1: Why QAOA and not VQE / Grover / annealing?** QAOA is built for minimising a diagonal cost Hamiltonian, is shallow at p = 1, and runs natively on IBM gate-based hardware via Qiskit.
- **B2: Deeper circuits (simulator only):** P(optimal) 1.5% (p = 1) → 2.8% (p = 2) → 4.1% (p = 3), but two-qubit gates roughly double per layer (114 → 256 on Marrakesh), so we kept p = 1 on hardware.
- **B3: Noisy simulator vs hardware:** FakeMarrakesh predicted an approximation ratio of 0.831; real hardware gave 0.798-0.805. The real device is noisier than its snapshot noise model.
