# GreenQ demo video script (3 to 4 minutes)

For: whoever records the YouTube demo. The viewers are the hackathon jury, so it must also work on a projector in the finals.

**Setup**
- `python -m server` in the project folder, then open http://127.0.0.1:8000 in a full-screen browser at **1920×1080**, zoom 100%. It runs offline from saved results.
- Record screen + voice (OBS, or `Cmd+Shift+5` on macOS). Speak slowly.
- The easiest take: press **Play story** in the top-right and narrate over it, then scroll through the rest by hand. Scrolling or clicking pauses the story.
- Narration is about 480 words, roughly 3.5 minutes.

---

### 0:00-0:20 · Headline (hero)
**Screen:** the top of the page; the small animation shows the jobs moving.

**Say:** "Data centres burn electricity and evaporate cooling water. Many of their jobs are flexible: they could run at another site, or at another time. GreenQ uses a quantum algorithm to decide where and when. In our example the same four jobs emit 530 kilograms less CO₂ and use about 1,800 litres less water."

### 0:20-1:05 · The two data centres (press Play story)
**Screen:** the story scrolls to the planner. First *Business as usual*, then the job blocks slide to *GreenQ*.

**Say:** "Here are two data centres. Site A uses evaporative cooling: less electricity, more water. Site B is air-cooled: almost no water on site, but more electricity. Each has a day slot, when India's grid is cleaner thanks to solar, and a night slot. Business as usual runs every job at home the moment it arrives, and two big jobs pile onto Site A at night. GreenQ moves them. The ML job goes to Site B in the day, and the others spread out. The counters show the result, and underneath, the reason each job moved."

### 1:05-1:45 · The trade-off (story sweeps the slider)
**Screen:** the slider sweeps to *Carbon only*, then *Water only*; the dot moves along the trade-off curve and the blocks re-place.

**Say:** "Carbon and water pull against each other. Favour carbon and the plan changes; favour water and it changes again. This curve is every compromise. The three stops marked IBM, water only, balanced and carbon only, were run on a real IBM quantum computer."

### 1:40-1:55 · Not every job is flexible (click "Mixed" on the planner)
**Say:** "Real jobs have rules. A lock means the data must stay at its home site; a clock means a deadline. With these rules, savings shrink but don't vanish. On the real IBM machine, 61 percent of shots respected every rule, against 25 percent for random guessing."

### 1:45-2:40 · The quantum part (story scrolls to the circuit, then the histogram)
**Screen:** the circuit, then the histogram and the four facts.

**Say:** "This is the actual circuit we ran: eight qubits, two per job, a 'where' and a 'when'. The textbook method needs sixteen. Hadamards start with all 256 schedules at once; the green cost layer adds each schedule's carbon-and-water cost; the blue mixer makes cheap schedules interfere into the lead. Each shot reads out one schedule. Random guessing puts 10 percent of its shots in the best tenth. IBM's Marrakesh processor put 18 to 23 percent there, and a perfect simulator about 30. So the hardware works, noise costs part of the gain, and error mitigation gave no consistent improvement."

### 2:40-3:10 · Proof it is real (scroll up to the panels)
**Screen:** the Real IBM runs panel; point at the job IDs.

**Say:** "We ran six jobs on IBM hardware, eighteen seconds of quantum time, and every result is saved in our repository with its job ID."

### 3:00-3:10 · Compared with simple methods (scroll to "Is it better than simple methods?")
**Say:** "We also compared against greedy, simulated annealing and random guessing. At this size they all find the best schedule, faster. We say that openly."

### 3:10-3:40 · Honest close (scroll to How it works, Honest answers, footer)
**Say:** "To be clear: at this size a laptop checks all 256 schedules instantly, and we use it as our referee. We claim no quantum advantage. The grid carbon and power-plant water figures are cited; the sites and jobs are illustrative. What we show is a correct, compact quantum formulation of a real sustainability problem, tested on real IBM hardware. That's GreenQ, by Team Response200."

---

**Checklist:** every number spoken matches the screen (530 kg, ~1,800 L, 8 vs 16 qubits, 10%, 18–23%, 6 jobs, 18 s) · 3–4 minutes at 1080p · YouTube link added to README and PPT slide 12.

_Note: this script follows what ships; sections are added as features land._
