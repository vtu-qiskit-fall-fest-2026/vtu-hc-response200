# GreenQ demo video script (3 to 4 minutes)

For: whoever records the YouTube demo. The viewers are the hackathon jury, so it must also make sense on a projector in the finals.

**Setup before recording**
- Start the demo (README → "How to Run"). It runs fully offline from saved results, so there is no waiting on IBM.
- Browser full screen at **1920×1080**, zoom 100%, dark theme. Close other tabs and notifications.
- Record the screen plus a voice-over (OBS or the macOS screen recorder, `Cmd+Shift+5`). Speak slowly. Each block below is about 25-40 seconds.
- Total narration is about 500 words, roughly 3.5 minutes at a calm pace.
- Upload to YouTube (Unlisted is fine unless the organisers say otherwise), then paste the link into the README and slide 12.

---

### 0:00-0:20 · Hook (Headline section)
**Screen:** the opening headline, "Same jobs, smarter placement", with the two big numbers (kg CO₂ and litres saved).

**Say:**
"Data centres burn electricity and evaporate cooling water. Many of their jobs are flexible: they could run at a different site or at a different time. GreenQ uses a quantum algorithm to decide where and when, and in our example it saves 530 kilograms of CO₂ and about 1,800 litres of water, with the same jobs."

### 0:20-0:55 · The problem (Schedule board, left side)
**Screen:** the business-as-usual board. Point the cursor at Site A at night, where two jobs are stacked and the cell is marked overloaded.

**Say:**
"Here's business as usual. Each job runs at its home site the moment it arrives. We have two sites: Site A uses evaporative cooling, which saves electricity but uses water. Site B is air-cooled: almost no water on site, but more electricity, and in India most electricity comes from coal plants that also consume water. An evening batch burst puts two big jobs on Site A overnight, on a coal-heavy grid, and overloads it."

### 0:55-1:25 · GreenQ's schedule (Schedule board, both sides)
**Screen:** let the animation move the jobs from the naive board to the GreenQ board. Pause on the result.

**Say:**
"GreenQ moves the ML training job to the air-cooled site during the day, when solar makes the grid cleaner, and spreads the other jobs out so nothing is overloaded. Total: 14 percent less carbon and 14 percent less water. We checked this against every one of the 256 possible schedules, and it is the true best one."

### 1:25-2:05 · The trade-off (slider)
**Screen:** drag the slider slowly from "water" to "carbon". Stop on the three positions with the **"real IBM hardware"** badge.

**Say:**
"Carbon and water pull in different directions, so we added a priority slider. Favour water and the jobs move one way; favour carbon and they move another. Five different schedules are best somewhere along this slider. The three marked positions, water only, balanced and carbon only, were run on a real IBM quantum computer, and their results are saved in our repository with the job IDs."

### 2:05-2:50 · Is the quantum part real? (Quantum proof panel)
**Screen:** the quantum-vs-random chart, then the backend and job IDs.

**Say:**
"How do we know the quantum part is doing real work? Each shot of the circuit outputs one complete schedule. Random guessing puts 10 percent of its shots in the best tenth of schedules. IBM's Marrakesh processor put about 19 to 21 percent there, roughly twice as many, and a perfect simulator about 33 percent. So the real hardware works, and noise costs part of the gain. We also tried error mitigation, and honestly it gave no consistent improvement. We ran six hardware jobs and used 18 seconds of quantum time."

### 2:50-3:25 · How it works (four steps)
**Screen:** the "How it works" section.

**Say:**
"How it works, in four steps. One: every job gets two qubits, a 'where' qubit and a 'when' qubit, so every measurement is a valid schedule. That uses half the qubits of the textbook approach. Two: we turn the carbon-plus-water cost into a Hamiltonian, and our tests prove it matches the classical cost on every schedule. Three: a QAOA circuit, built in Qiskit, uses interference to make cheap schedules more likely; we train its two angles on a simulator. Four: the trained circuit runs on IBM hardware, and we grade the answer against brute force."

### 3:25-3:50 · Honesty and close (footer)
**Screen:** the honesty footer, then back to the headline.

**Say:**
"To be clear: at this size a normal computer solves the problem instantly, and we use it as our referee. We don't claim a quantum advantage. The grid carbon and power-plant water figures are cited; the site and job figures are illustrative and labelled. What we've shown is a correct, compact quantum formulation of a real sustainability problem, validated end to end on real IBM hardware. That's GreenQ, by Team Response200. Thanks for watching."

---

**Checklist after recording**
- [ ] Every number spoken matches the screen (530 kg, ~1,800 L, 14%, 19-21%, 10%, 33%, 6 jobs, 18 s)
- [ ] The "real IBM hardware" badge is visible on screen while it's mentioned
- [ ] Video is 3-4 minutes, 1080p, audio is clear
- [ ] YouTube link added to README (Submission Checklist + Links) and PPT slide 12
