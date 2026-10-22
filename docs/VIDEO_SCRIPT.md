# GreenQ demo video script (about 3 minutes 50 seconds)

For: whoever records the YouTube demo. The viewers are the hackathon jury, so it must also work on a projector in the finals.

**Setup**
- Run `python -m server` in the project folder and open http://127.0.0.1:8000 full screen at **1920×1080**, zoom 100%. It runs offline from saved results.
- Record screen + voice (OBS, or `Cmd+Shift+5` on macOS). Speak slowly.
- The easiest take: press **Play story** (top right) for the first 70 seconds and narrate over it, then scroll by hand, following the nav order. Scrolling or clicking pauses the story.
- Every number below is on screen. If a number on screen differs, read the screen.

---

### 0:00-0:20 · Headline
**Screen:** top of the page; the small animation shows the jobs moving.

**Say:** "Data centres burn electricity and evaporate cooling water. Many of their jobs are flexible: they could run at another site, or at another time. GreenQ uses a quantum algorithm to decide where and when. In our example the same four jobs emit 530 kilograms less CO₂ and use about 1,800 litres less water."

### 0:20-1:00 · Two data centres (press **Play story**)
**Screen:** the story scrolls to the planner. First *Business as usual*, then the blocks slide to *GreenQ*.

**Say:** "Site A cools with water: less electricity, more water. Site B is air-cooled: almost no water on site, but more electricity. Each has a day slot, when India's grid is cleaner thanks to solar, and a night slot. Business as usual runs every job at home the moment it arrives, and two big jobs pile onto Site A at night. GreenQ spreads them out. Underneath, it explains why each job moved."

### 1:00-1:25 · The trade-off (story sweeps the slider)
**Screen:** the slider sweeps to *Carbon only*, then *Water only*; the dot moves along the curve.

**Say:** "Carbon and water pull against each other, and this curve is every compromise. The three stops marked IBM were run on a real IBM quantum computer."

### 1:25-1:45 · Real-world rules (pause the story; click **Mixed** under "How flexible are the jobs?")
**Say:** "Real jobs have rules. A lock means the data must stay at its home site; a clock means a deadline. Savings shrink but don't vanish, and on the real IBM machine 61 percent of shots respected every rule, against 25 percent for random guessing."

### 1:45-2:05 · Location and forecasts (scroll to **Cities**, then **Is the plan fragile?**)
**Say:** "A litre in Delhi is scarcer than a litre in Kolkata. With WRI's water-stress scores, the plan shifts water-heavy work to Kolkata, but only where the difference is large. And if the carbon forecast is off by 5 percent, the plan stays within 5 percent of the best every time."

### 2:05-2:45 · The quantum part (scroll to **Quantum proof**)
**Screen:** the circuit, then the histogram and the four facts.

**Say:** "This is the actual circuit we ran: eight qubits, a 'where' and a 'when' for each job; the textbook method needs sixteen. The green cost layer adds each schedule's cost; the blue mixer makes cheap schedules interfere into the lead. Random guessing puts 10 percent of its shots in the best tenth of schedules. IBM's Marrakesh processor put 18 to 23 percent there, and a perfect simulator about 30. Error mitigation gave no consistent gain."

### 2:45-3:05 · Fair comparison (scroll to **Vs. classical**)
**Say:** "We compared against greedy, simulated annealing and plain random guessing. At this size they all find the best schedule, and faster. We show that on purpose."

### 3:05-3:25 · How it scales (scroll to **Scaling**)
**Say:** "We measured bigger problems on simulators, up to 22 qubits. The circuit grows from 114 to about a thousand two-qubit gates, and noise eats into the gain. That's where today's hardware stops."

### 3:25-3:35 · Try it (scroll to **Try it**; optional)
**Say:** "You can enter your own jobs and get a plan in a fraction of a second on the simulator. The calculator scales our saving to a fleet, and every input is marked as an assumption."

### 3:35-3:50 · Honest close (scroll to **Questions** and the footer)
**Say:** "To be clear: a laptop solves this size instantly, and we use it as our referee. We claim no quantum advantage. What we show is a correct, compact quantum formulation of a real sustainability problem, tested on real IBM hardware, with every result saved. That's GreenQ, by Team Response200."

---

**Checklist:** the numbers spoken match the screen (530 kg, ~1,800 L, 61% vs 25%, 8 vs 16 qubits, 10% vs 18–23% vs ~30%, 22 qubits, 114 → ~1,000 gates) · 3–4 minutes at 1080p · YouTube link added to README and PPT slide 12.
