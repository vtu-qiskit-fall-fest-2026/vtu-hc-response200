# GreenQ explained (for the team and the jury)

Plain-language notes on what we built and why. Read this before presenting.

## 1. The problem in one paragraph
Data centres run many *flexible* jobs (ML training, analytics, rendering) that don't have to run at one exact place and time. Where and when a job runs changes its footprint:
- **Carbon**: the Indian grid is cleaner at midday (solar) than at night (coal).
- **Water**: an evaporatively cooled site uses less electricity but evaporates water. An air-cooled site uses almost no water on site but more electricity, and electricity itself costs water at coal plants.

So carbon and water can pull in opposite directions. GreenQ picks a site and time slot for every job to keep the **combined** footprint low, using a quantum algorithm (QAOA) written in Qiskit.

## 2. The instance we solve
- 4 jobs, 2 sites (A = evaporative, B = air-cooled), 2 time slots (day, night). That makes 4 options per job and 4^4 = **256 possible schedules**.
- "Naive" baseline ("business as usual"): every job runs at its home site the moment it's submitted. In our scenario, an evening batch burst puts the two biggest jobs on Site A overnight.
  - *Why it's fair:* it's what a scheduler does when it ignores carbon and water. It isn't a straw man either: two jobs already sit on the more energy-efficient site and one already runs in the clean daytime slot. An earlier baseline put every job in the daytime slot, which made the savings look mostly like overload avoidance, so we replaced it (DECISIONS D5).
- Overlap cost: if two jobs share a site and slot, they overflow its spare capacity and cost extra energy. This is what makes the jobs' choices depend on each other.
- **Real vs illustrative numbers:** the grid carbon average (CEA, Govt. of India) and power-plant water use (NREL) are cited. The site PUE/WUE values, the day/night split, the job sizes and the overlap cost are illustrative, chosen within published ranges. See `greenq/data.py`.

## 3. How a schedule becomes qubits (encoding)
Each job gets **2 qubits**:
- a **"where" qubit**: 0 = Site A, 1 = Site B
- a **"when" qubit**: 0 = day, 1 = night

4 jobs need 8 qubits. Any 8-bit result you measure decodes to a complete, valid schedule.

*Why not the textbook approach (one-hot)?* It uses one qubit per (job, option), which is 16 qubits, and only 0.39% of results would be valid schedules. It also needs penalty terms. Our encoding halves the qubits and roughly halves the gates on IBM hardware (≈114 vs ≈227 two-qubit gates). That is what makes a hardware run meaningful.

## 4. The cost Hamiltonian (turning the cost into physics)
A Hamiltonian is a list of Z-terms, each with a weight. For any schedule, measuring its energy gives exactly that schedule's cost.
- **One job's cost** depends on its 2 qubits, giving Z, Z and ZZ terms. The weights come from a small table of that job's cost at each of its 4 options (a Walsh-Hadamard transform).
- **Overlap cost between two jobs** counts only if both their "where" and "when" bits match. That check is exactly (1+Z·Z)/2 × (1+Z·Z)/2, which gives ZZ and ZZZZ terms.
- Our test (`tests/test_model_encoding.py`) checks that the Hamiltonian gives exactly the classical cost for all 256 schedules. **The quantum and classical sides provably solve the same problem.**

## 5. QAOA, step by step (`greenq/qaoa.py`)
1. **Start in superposition.** A Hadamard on every qubit gives an equal mix of all 256 schedules.
2. **Cost layer, exp(-iγH).** Each schedule gets a phase proportional to its cost. Phase alone doesn't change what we'd measure yet.
3. **Mixer layer, exp(-iβΣX).** This rotates every qubit, so schedules that differ by one bit interfere. With good γ and β the interference boosts cheap schedules and suppresses expensive ones.
4. **Measure.** Each shot gives one schedule. Repeating 4,000 times gives a distribution.
5. **Train γ and β classically.** We pick the angles that minimise **CVaR**, the average cost of the best 25% of outcomes (Barkoutsos et al. 2020). It works better than the plain average for this kind of problem. We train on a simulator (free and exact) and send only the final circuit to IBM hardware (our quantum time is limited to 10 minutes a month).
6. **Read the answer.** GreenQ outputs the cheapest schedule seen in the shots.

p = number of (cost, mixer) layer pairs. We use **p = 1 on hardware** because deeper circuits collect more noise. We also report p = 2 and 3 on the simulator.

## 6. How we check it's working (`greenq/metrics.py`)
- **Approximation ratio**: 1.0 = always the best schedule, 0 = always the worst. Random guessing scores about 0.74 on our instance.
- **P(optimal)**: how often a shot lands exactly on the best schedule. Random guessing gives 1/256 = 0.39%.
- **Brute force** (`greenq/classical.py`) tries all 256 schedules to find the true best one, so every quantum result is graded against the true answer.

Results (p = 1, carbon/water weight 0.5, 4,000 shots each):

| Run | Approx. ratio | P(optimal) |
|---|---|---|
| Random guessing | 0.743 | 0.39% |
| **IBM ibm_marrakesh, raw** (job `dbcpub7i0auc73943vu0`) | **0.798 ± 0.002** | 0.83% |
| **IBM ibm_marrakesh, DD + twirling** (job `dbcpub8c77vs7386pv9g`) | **0.805 ± 0.002** | 0.70% |
| Noisy simulator (FakeMarrakesh) | 0.831 | 1.8% |
| Ideal simulator | 0.843 | 1.5% |

How to read this:
- Real hardware is clearly better than random: the gap is about 15 standard errors, far beyond shot noise.
- **Which run returned the true best schedule, and how often?** GreenQ's answer is the cheapest schedule among the 4,000 shots.
  - Ideal simulator: yes, in 60/4,000 shots (1.5%).
  - Hardware raw: yes, in 33/4,000 shots (0.83%). It was the 17th most frequent outcome, not the top one.
  - Hardware mitigated: yes, in 28/4,000 shots (0.70%), 27th most frequent.
  - Random guessing would hit it about 16 times in 4,000 shots. So "it found the optimum" proves nothing at this size; the distribution shift does.
- Noise costs us part of the ideal gain: hardware recovers ~55-60% of the ideal improvement over random.
- Error mitigation (dynamical decoupling + twirling) gave **no consistent benefit**: across our three paired runs the approximation ratio changed by +0.012 (water only), +0.008 (balanced) and −0.006 (carbon only). Dynamical decoupling protects idle qubits, and twirling turns coherent errors into random noise. Neither removes the gate errors that dominate a 114-gate circuit.
- **We ran 6 hardware jobs in total:** 3 priority settings (water only, balanced, carbon only) × (raw, mitigated). All 6 beat random by 14-19 standard errors, and all 6 had the true best schedule as their cheapest shot. Each job used about 3 s of quantum time, 18 s in total. Full tables: README → Results, or `python scripts/summarize_results.py`.

## 7. Code map
| File | What it does |
|---|---|
| `greenq/data.py` | Sites, slots, jobs; every number marked CITED or ILLUSTRATIVE with sources |
| `greenq/model.py` | Computes kg CO2 and litres of water for any schedule; blended objective |
| `greenq/encoding.py` | Schedule ↔ qubits; builds the cost Hamiltonian |
| `greenq/classical.py` | Brute-force optimum and naive baseline |
| `greenq/qaoa.py` | QAOA circuit, CVaR training |
| `greenq/runner.py` | Runs circuits on the ideal simulator, the noisy simulator or IBM hardware; saves JSON |
| `greenq/metrics.py` | Approximation ratio, P(optimal) |
| `greenq/ibm.py` | Connects to IBM Quantum using the token in `.env` |
| `scripts/run_sim.py` | Train + simulate, writes `results/sim/` |
| `scripts/run_hardware.py` | Run on IBM hardware, writes `results/hardware/` |

## 8. Likely jury questions (honest answers)
**Is this faster or better than a classical computer?**
No. With 256 schedules a laptop checks them all in a millisecond, which is how we grade the quantum result. Our claim is narrower: a correct quantum formulation of a real sustainability problem, validated end to end on real IBM hardware with measured accuracy, plus an encoding that uses half the qubits of the standard approach.

**With 4,000 shots, wouldn't random guessing also find the best of 256 schedules?**
Usually, yes, and we say so. That's why we don't use "it found the optimum" as evidence. We use how the distribution shifts toward good schedules (approximation ratio, P(optimal)) compared with random. That is the signal that grows in importance when the search space is too big to sample at random.

**Is QAOA better than a simple greedy rule?**
Not on this instance. We tested it: greedy, simulated annealing and even 4,000 random guesses all find the true best, and much faster (greedy takes 0.03 ms). That's shown on the page ("Is it better than simple methods?"). The point of the project is a correct, compact quantum formulation that runs end to end on real hardware, so it can be tried on larger problems as hardware improves. It's not a speed-up today.

**Why QAOA?**
It's designed for exactly this: minimising a cost written as Z-terms. It's shallow enough for today's hardware, and it's a standard, well-studied Qiskit workflow.

**Are the numbers real?**
The grid carbon average (CEA FY 2024-25, 0.710 t/MWh) and power-plant water use (NREL, 2.60 L/kWh for coal with cooling towers) are cited. Site cooling figures, the day/night split and job sizes are illustrative and labelled as such everywhere.

**What would it take to scale?**
The search space grows as 4^jobs. Qubits grow linearly (2 per job), but circuit depth grows with the number of job pairs, and hardware noise limits us today. Bigger instances would need better hardware, error mitigation, or splitting the problem into pieces.

**Where is the quantum part, exactly?**
The circuit in `greenq/qaoa.py`, built with Qiskit's `QAOAAnsatz` from our own Hamiltonian, transpiled for the real device and run with `SamplerV2` on IBM hardware. Job IDs are in `results/hardware/`.

## 9. The demo UI (what each part shows, and what to say)
Start it with `python -m server` and open http://127.0.0.1:8000. It reads only saved results (`results/ui_data.json`), so it needs no internet and no IBM account. Press **Play story** for a 20-second guided run; scrolling or clicking pauses it.

| Part | What it shows | One line to say |
|---|---|---|
| Hero | Headline, the two savings, and a small looping animation of the 4 jobs moving | "Same jobs, smarter placement: 530 kg CO₂ and 1,798 L water saved in this example." |
| What matters more? | Big slider (21 settings; the 3 marked **IBM** ran on real hardware), savings at that setting, and the trade-off curve (CO₂ saved vs water saved) | "Carbon and water pull against each other; the curve is every possible compromise." |
| Two data centres | Site A (cooling tower, evaporative) and Site B (chillers, air-cooled), each with a day and a night lane and that slot's grid carbon. Job blocks are sized by energy. Toggle *Business as usual* / *GreenQ* to watch them move; the reasons are listed underneath. | "Business as usual piles two big jobs onto Site A at night. GreenQ spreads them to cleaner, drier slots, and here is why each one moved." |
| Savings / Real IBM runs | Before vs after bars; all 6 hardware job IDs with copy buttons | "Every hardware shot is saved in the repo with its job ID." |
| The quantum part, shown | The real 8-qubit circuit (H, cost layer with γ, mixer with β, measure; each wire is a job's where/when bit), the histogram (random vs simulator vs IBM), and four honest facts | "The real hardware lands in the best tenth of schedules about twice as often as random. Error mitigation didn't help consistently. No advantage claimed." |
| How it works / Honest answers / Footer | 3 steps, 5 FAQ answers, cited vs illustrative, sources | "A laptop is our referee." |

**Where each number comes from:** savings and schedules come from brute force over all 256 schedules (`scripts/export_ui_data.py`); the circuit is exported from the real cost operator, and a test rebuilds it and checks it matches; the histograms come from the saved counts in `results/sim/` and `results/hardware/`.
