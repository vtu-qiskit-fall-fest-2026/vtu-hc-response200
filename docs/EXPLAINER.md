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
| `server/main.py` | FastAPI: serves the app, saved results, live jobs and the explanation endpoints |
| `server/llm.py` | Language model layer: facts, number check, cache, templates (explains, never decides) |
| `scripts/build_llm_cache.py` | Pre-generates the AI explanations into `results/llm_cache.json` (needs `GROQ_API_KEY`) |
| `web/src/components/slides/` | The six screens and the sidebar; `web/src/lib/stage.ts` scales the 1600×900 canvas |

## 8. Likely jury questions (honest answers)
**Is this faster or better than a classical computer?**
No. With 256 schedules a laptop checks them all in a millisecond, which is how we grade the quantum result. Our claim is narrower: a correct quantum formulation of a real sustainability problem, validated end to end on real IBM hardware with measured accuracy, plus an encoding that uses half the qubits of the standard approach.

**With 4,000 shots, wouldn't random guessing also find the best of 256 schedules?**
Usually, yes, and we say so. That's why we don't use "it found the optimum" as evidence. We use how the distribution shifts toward good schedules (approximation ratio, P(optimal)) compared with random. That is the signal that grows in importance when the search space is too big to sample at random.

**Is QAOA better than a simple greedy rule?**
Not on this instance. We tested it: greedy, simulated annealing and even 4,000 random guesses all find the true best, and much faster (greedy takes 0.03 ms). That's shown on the page ("Is it better than simple methods?"). The point of the project is a correct, compact quantum formulation that runs end to end on real hardware, so it can be tried on larger problems as hardware improves. It's not a speed-up today.

**Real jobs have deadlines and data rules. Does it still work?**
Yes, within limits. We added three rules a job can have: a deadline, data that must stay at its home site, and a critical slot. The "How flexible are the jobs?" switch shows the effect. Savings shrink as fewer jobs are flexible: from 14% (all flexible) to about 8% CO₂ when only one in four is. The rules go into the quantum cost as penalties. On the simulator 99% of shots obey every rule; on the real IBM machine 61% did (random guessing: 25%), and we simply discard the rest. That run is saved in the repo (job `dbd13dk24mrc73cki6eg`).

**Does it scale?**
We measured it up to 11 jobs (22 qubits) on simulators. The quantum circuit keeps finding good schedules in the ideal case, but it gets big fast: 114 two-qubit gates at 8 qubits, about 1,000 at 22. On a noisy model of the IBM chip the advantage over random shrinks as it grows, and the real chip was noisier than the model. So today's hardware handles our small case, and larger ones need better hardware or smarter circuits. A classical computer still solves all these sizes in under a second, and we say so.

**Isn't a litre a litre?**
Not really. Water is scarcer in some places. We weight each site's water by the official water-stress score of its state (WRI Aqueduct 4.0). For Delhi (extremely high stress) paired with Kolkata (medium-high), GreenQ moves more water-heavy work to Kolkata. For city pairs with similar stress, the plan doesn't change. The cities and the weighting rule are illustrative; the scores are cited.

**Can I try my own jobs? What's it worth?**
Yes. "Try it yourself" lets you type up to five jobs (or upload a CSV) and solves them live on a simulator, clearly marked as not hardware. The calculator next to it scales our measured 14% saving to a fleet size you choose. Those inputs are assumptions, the formula is shown, and we don't claim any real deployment.

**What if the carbon forecast is wrong?**
We tested that. We fix the plan from the forecast, then let the real grid carbon differ by up to 5% (and 10%), 200 times. The plan was always within 5% of the best possible plan for what actually happened, and usually exactly the best. So small forecast errors don't break it.

**Why QAOA?**
It's designed for exactly this: minimising a cost written as Z-terms. It's shallow enough for today's hardware, and it's a standard, well-studied Qiskit workflow.

**Are the numbers real?**
The grid carbon average (CEA FY 2024-25, 0.710 t/MWh) and power-plant water use (NREL, 2.60 L/kWh for coal with cooling towers) are cited. Site cooling figures, the day/night split and job sizes are illustrative and labelled as such everywhere.

**What would it take to scale?**
The search space grows as 4^jobs. Qubits grow linearly (2 per job), but circuit depth grows with the number of job pairs, and hardware noise limits us today. Bigger instances would need better hardware, error mitigation, or splitting the problem into pieces.

**Where is the quantum part, exactly?**
The circuit in `greenq/qaoa.py`, built with Qiskit's `QAOAAnsatz` from our own Hamiltonian, transpiled for the real device and run with `SamplerV2` on IBM hardware. Job IDs are in `results/hardware/`.

## 9. The demo UI (what each screen shows, and what to say)
Start it with `python -m server` (after pulling new code: `python -m server --rebuild`) and open http://127.0.0.1:8000. It reads only saved results (`results/ui_data.json`), so it needs no internet and no IBM account. It's six slides in a left sidebar; nothing scrolls. Keys: **← →** move, **1–6** jump, **P** plays or pauses the 35-second story (Start → Schedule → Quantum, with captions in the footer), **F** full screen, **Esc** leaves full screen.

| Screen | What it shows | One line to say |
|---|---|---|
| 1 Start | A wordless 16-second loop: jobs pile up at home under a grey haze, a quantum chip lights up (its links are the real circuit's qubit pairs), the jobs move, and the two savings count up from the data | "Same jobs, smarter place and time: 530 kg CO₂ and 1,798 L water less in this example." |
| 2 Schedule | *Run now / Run smart* toggle; job rules (all flexible, mixed, mostly rigid); the two sites with day and night lanes; moved jobs glow and a line shows where each went; the priority slider (the 3 **IBM** stops ran on real hardware); the trade-off curve; "Why this schedule" | "Run now piles two big jobs onto Site A at night. Run smart spreads them to cleaner, drier slots, and here is why each one moved." |
| 3 Quantum | The real 8-qubit circuit (it lights up gate by gate), then where 4,000 shots landed (random, simulator, IBM), the key numbers, and all 7 job IDs | "IBM's machine lands in the best tenth of schedules about twice as often as random. Error mitigation didn't help consistently. No advantage claimed." |
| 4 Compare | Tabs: Methods (every method reaches the best; classical is faster), Scaling (gates grow from 114 to 1,010), Job rules, Cities (water stress), Forecasts (robustness) | "We show the fair comparison on purpose: at this size a laptop wins." |
| 5 Ask | Ask GreenQ: 5 example questions or your own; Describe your jobs in plain English, check the table, run it on the live simulator; fleet calculator | "The AI only explains our saved results. It never picks the schedule, and any number it can't match to our data is deleted." |
| 6 About | Three steps (encode, run, check), six honest answers, sources | "A laptop is our referee." |

### Dewy, the guide (`web/src/components/mascot/`)
- **What it is:** our own little mascot, a water drop with a leaf (water and carbon), drawn in SVG and animated with Motion. Eyes only, no mouth.
- **What it does:** reacts to the demo (wakes up, gets excited when you hover Play, celebrates when the savings appear, thinks while the quantum circuit runs, falls asleep after 30 seconds of nothing) and gives a guided tour: press **T** (or "Show me around") and it walks through one widget per screen with a short line. **P** plays the same tour as a timed story. **H** hides it.
- **Honesty rules:** its own lines are short and contain no numbers; when it reads out an AI answer, that answer passed the number check and carries its badge.
- **Where the idea came from:** the handout *Make Your Own Mascot* (Saksham Gupta), which uses Bible Strong Avatar Lab. We only borrowed ideas (eyes-only face, blinking, a list of moods and when to play them); the drawing and code are ours, so there's no licence issue.

**Jury question: "Is the mascot just decoration?"** It's a guide: it points the audience at one thing per screen, and on the Ask screen it is the speaker for the grounded AI answers. It never makes a claim of its own.

### The AI part, in plain words (`server/llm.py`)
- **What it is:** a language model (Groq's `openai/gpt-oss-20b`) that writes short sentences. It's not part of the optimisation.
- **What it gets:** a list of facts taken from our saved results, for the current setting (for example "saved: 530 kg CO2 (14%)…"). Nothing else.
- **The number check:** we split its reply into sentences, read every number, and keep a sentence only if each number matches one of the facts (rounding like 1,798 → 1,800 is fine). We also drop "you should move…" suggestions and any claim of quantum advantage.
- **Typed jobs:** the model fills in a table (name, kWh, site, arrival, deadline, stays local). Every kWh must appear in what you typed, and the table goes through the same checks as the form. Brute force and the QAOA simulator then solve it, labelled *live simulator, not hardware*.
- **No key or no internet:** it uses `results/llm_cache.json` (answers generated in advance and checked the same way), and if that's missing, fixed templates. The badge on each answer says AI EXPLANATION or TEMPLATE, so the audience always knows which.
- **The key:** it's only in `.env` on the laptop running the server. The browser never sees it.

**Jury question: "Isn't the AI just making things up?"** It can only use facts we hand it, and a sentence with any number it can't match is deleted before you see it. It explains; brute force and QAOA decide. If the model is down, templates built from the same data take over.

**Where each number comes from:** savings and schedules come from brute force over all 256 schedules (`scripts/export_ui_data.py`); the circuit is exported from the real cost operator, and a test rebuilds it and checks it matches; the histograms come from the saved counts in `results/sim/` and `results/hardware/`.
