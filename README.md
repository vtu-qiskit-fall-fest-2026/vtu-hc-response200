# Response200

| | |
| --- | --- |
| **Team** | Response200 |
| **Team ID** | VTU-QFF-HC-0137 |
| **Tier** | Online |
| **Repository** | vtu-hc-response200 |
| **Event** | VTU-QFF Hackathon (VTU-Qiskit Fall Fest 2026) |

## Team members (GitHub IDs)

<!-- Members are added as collaborators. Fill in the GitHub usernames below. -->

| Name | GitHub ID | Role |
| --- | --- | --- |
| Jagpreet Singh | [jagpreetsingh02](https://github.com/jagpreetsingh02) | Team Lead |
| Ramandeep Singh | [Raman-2915](https://github.com/Raman-2915) | Developer |

## Project

**GreenQ: quantum scheduling of data-centre jobs for less carbon and less water.**

**Problem.** Data centres use a lot of electricity (carbon) and cooling water. The same flexible job (a model training run, a nightly report) costs very different amounts of carbon and water depending on which site and which time slot it runs in. The two goals pull against each other: evaporative cooling saves electricity but evaporates water, while air cooling saves water but uses more electricity. With 2 sites and 2 time slots, every job has 4 choices, so *n* jobs have 4ⁿ possible plans.

**Approach.** We turn the choice into a QUBO, a cost function of 0/1 variables that weighs carbon against water, and solve it with **QAOA built in Qiskit**.
- **Encoding:** each job is encoded with **2 qubits, one for *where* (Site A or B) and one for *when* (day or night)**. Every measured bitstring is therefore a valid schedule, and 4 jobs need 8 qubits instead of the 16 a one-hot encoding needs.
- **Training:** we train the circuit on simulators (Qiskit Aer).
- **Hardware:** we then ran it on the real IBM Quantum computer **ibm_marrakesh**: 7 runs, with every backend name, job ID and count saved in [results/hardware/](results/hardware/).
- **Baseline:** a classical brute-force solver finds the true best plan for every setting, so every quantum answer is checked.

**Key results** (4 jobs, 2 sites, 2 slots; illustrative sites, cited grid figures):
- **Savings:** the best schedule saves **530 kg CO₂ (14%)** and **1,798 L of water (14%)** against "run every job now, at home".
- **Hardware:** on ibm_marrakesh, **18–23%** of measured answers landed in the best tenth of all 256 plans, against 10% for random guessing. A noise-free simulator reaches 28–34%. Error mitigation did not help consistently.
- **No quantum advantage:** we do not claim one. At this size a laptop solves the problem exactly and faster, so we use it as the referee. Our claim is a correct formulation, validated end to end on real hardware, with measured accuracy and a path to scale.

![GreenQ demo: schedule screen](docs/images/ui_schedule.png)

- **Live app:** https://greenq-xi.vercel.app
- **Demo video:** https://youtu.be/WW4myHQ4JOg (also in [DEMO_VIDEO.md](DEMO_VIDEO.md))
- **Presentation (PPT):** [presentation/GreenQ_Response200_VTU-QFF-HC-0137.pptx](presentation/GreenQ_Response200_VTU-QFF-HC-0137.pptx)
- **Technical details:** [docs/TECHNICAL.md](docs/TECHNICAL.md). It covers the architecture, full results tables, Dewy the guide, the language model's role, tech stack, project structure, limitations, and credits and references.
- **Plain-language explainer:** [docs/EXPLAINER.md](docs/EXPLAINER.md). **Design decisions:** [docs/DECISIONS.md](docs/DECISIONS.md).

Credits: see [docs/TECHNICAL.md](docs/TECHNICAL.md#-credits--references).

## Tracks / Problem Statement

<!-- e.g. Track 1, Track 2, or the problem statement you picked. -->

**Track 6: Quantum Applications for Climate Change & Sustainability.**

GreenQ decides where and when to run a set of flexible data-centre jobs so that their combined carbon and water footprint is as low as possible. It uses a quantum optimisation algorithm (QAOA in Qiskit), run on simulators and on real IBM Quantum hardware, and shows the result in a demo a non-expert can follow in under a minute.

## How to run

<!-- Setup and run instructions. -->

Needs Python 3.12+. Node.js 18+ is only needed to rebuild the web app.

```bash
# clone
git clone https://github.com/vtu-qiskit-fall-fest-2026/vtu-hc-response200.git
cd vtu-hc-response200

python3 -m venv .venv               # virtual environment
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest -q                          # run the tests
python -m server --rebuild         # build the web app and start the demo
open http://127.0.0.1:8000         # or open this address in your browser
```

Optional, for live AI explanations: put a Groq key in a `.env` file in the repo root as `GROQ_API_KEY=...`. The `.env` file is gitignored and never committed. Without a key the app uses reviewed, saved answers and templates. Re-running the quantum pipeline and the IBM hardware runs is described in [docs/TECHNICAL.md](docs/TECHNICAL.md#-how-to-run).

## Submission checklist

- [ ] Repository created and private
- [x] README updated with project details
- [x] Team members added as collaborators
- [x] Code pushed to `main`
- [x] Demo/video link added
