# GreenQ demo video script (about 3 minutes 40 seconds)

For: whoever records the YouTube demo. The viewers are the hackathon jury, so it must also work on a projector in the finals.

**Setup**
- Run `python -m server --rebuild` in the project folder, open http://127.0.0.1:8000 at **1920×1080**, zoom 100%, and press **F** for full screen. It runs offline from saved results.
- If `GROQ_API_KEY` is in `.env`, first run `python scripts/build_llm_cache.py` once, so the Ask screen shows AI answers even offline. Without a key the answers say TEMPLATE; that's fine and honest.
- Record screen + voice (OBS, or `Cmd+Shift+5` on macOS). Speak slowly.
- The video follows the sidebar order. **P** plays the 35-second story over screens 1–3; you can narrate over it, or move by hand with **→** / **1–6**. Any click or key pauses the story.
- Every number below is on screen. If a number on screen differs, read the screen.

---

### 0:00-0:25 · 1 Start (let the background slideshow run; keep the mouse off the picture)
**Screen:** the headline, the two numbers counting up, the mini scene switching from *Run now* to *Run smart*. Behind it the scenes change every 5.5 s, and the step strip at the bottom follows them.

**Say, one line per caption:**
- *Servers never sleep:* "Data centres run around the clock."
- *Cooling drinks water:* "Many cool their servers by evaporating water."
- *Grid carbon changes hourly:* "And the electricity is cleaner at some hours than others."
- *A quantum computer decides:* "GreenQ moves flexible jobs to a smarter place and time, and a real IBM quantum computer helped choose."
- *Smarter placement, less impact:* "Same four jobs: 530 kilograms less CO₂ and about 1,800 litres less water, checked against all 256 possible schedules."

### 0:25-1:05 · 2 Schedule (press **→**)
**Screen:** *Run now* first, then the jobs move to *Run smart*; lines show where each job went; "Why this schedule" fills in.

**Say:** "Site A cools with water: less electricity, more water. Site B is air-cooled: almost no water on site, but more electricity. Each has a day slot, when India's grid is cleaner thanks to solar, and a night slot. Run now starts every job at home the moment it arrives, and two big jobs pile onto Site A at night. Run smart spreads them out. On the right, GreenQ says why each job moved."

**Do:** drag the slider to *Cut carbon*, then to *Save water*, then back to *Balanced*.

**Say:** "Carbon and water pull against each other, and this curve is every compromise. The three stops marked IBM ran on a real IBM quantum computer."

### 1:05-1:50 · 3 Quantum (press **→**)
**Screen:** the circuit lights up gate by gate; then the histogram fills (random, simulator, IBM) and the best tenth pulses.

**Say:** "This is the actual circuit we ran: eight qubits, a 'where' and a 'when' for each job; the textbook method needs sixteen. The green cost layer adds each schedule's cost, and the blue mixer makes cheap schedules interfere into the lead. Random guessing puts 10 percent of its shots in the best tenth of schedules. IBM's Marrakesh processor put 18 to 23 percent there, and a perfect simulator 28 to 34. Error mitigation gave no consistent gain. Every job ID is saved."

### 1:50-2:40 · 4 Compare (press **→**; click the tabs)
**Methods. Say:** "We compared against greedy, simulated annealing and random guessing. At this size they all find the best schedule, and faster. We show that on purpose."

**Scaling. Say:** "On simulators we went up to 22 qubits. The circuit grows from 114 to about a thousand two-qubit gates, and the noise model was optimistic about the real chip. That's where today's hardware stops."

**Job rules. Say:** "Real jobs have rules: data that must stay home, deadlines. Savings shrink but don't vanish, and on IBM hardware 61 percent of shots respected every rule, against 25 percent for random guessing."

**Cities / Forecasts (optional). Say:** "A litre in Delhi is scarcer than in Kolkata, and that changes the plan. And if the carbon forecast is off by 5 percent, the plan stays within 5 percent of the best every time."

### 2:40-3:20 · 5 Ask (press **→**)
**Do:** click *How do I know the quantum part is real?*, then *Is this faster than a laptop?*. Then in *Describe your jobs*, click **Read my jobs**.

**Say:** "Ask GreenQ explains the results in plain words. The AI only sees facts from our saved results, and if it writes a number we can't match to the data, that sentence is deleted. It never picks the schedule. Here I describe my own jobs in plain English: it fills in the table, then brute force and the quantum simulator solve it live, and it's labelled as simulator, not hardware."

### 3:20-3:40 · 6 About (press **→**)
**Say:** "Three steps: encode, run, check. To be clear: a laptop solves this size instantly, and we use it as our referee. We claim no quantum advantage. What we show is a correct, compact quantum formulation of a real sustainability problem, tested on real IBM hardware, with every result saved. That's GreenQ, by Team Response200."

---

**Checklist:** the numbers spoken match the screen (530 kg, about 1,800 L, 8 vs 16 qubits, 10% vs 18–23% vs 28–34%, 22 qubits, 114 → about 1,000 gates, 61% vs 25%) · the answers on the Ask screen show their AI EXPLANATION or TEMPLATE badge · 3–4 minutes at 1080p · YouTube link added to README and PPT slide 12.
