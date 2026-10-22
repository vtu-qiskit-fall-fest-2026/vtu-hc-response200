# GreenQ demo video script (about 3 minutes 40 seconds)

For: whoever records the YouTube demo. The viewers are the hackathon jury, so it must also work on a projector in the finals.

**Setup**
- Run `python -m server --rebuild` in the project folder, open http://127.0.0.1:8000 at **1920×1080**, zoom 100%, and press **F** for full screen. It runs offline from saved results.
- If `GROQ_API_KEY` is in `.env`, run `python scripts/build_llm_cache.py` once beforehand, so Dewy's AI answers also work offline. Without a key the answers say TEMPLATE; that's fine and honest.
- Record screen + voice (OBS, or `Cmd+Shift+5` on macOS). Speak slowly. **Keep the mouse off the Start picture:** hovering it holds the animation.
- Keys: **P** plays the story (about 50 s, all six screens, Dewy spotlights one thing per screen), **T** starts Dewy's tour by hand (← → to step, Esc to stop), **1–6** jump, **H** hides Dewy.
- Every number below is on screen. If a number on screen differs, read the screen.

---

### 0:00-0:16 · 1 Start: let the hero loop play once
**Screen:** the wordless loop. Dewy, the water-drop guide, waits in the corner.

**Say, one line per phase:**
- *Jobs sit at home, under a grey haze:* "Data centres run jobs where and when they arrive, and that burns carbon and evaporates cooling water."
- *The chip lights up:* "GreenQ hands the choice to a quantum algorithm. This ran on a real IBM quantum computer."
- *The jobs move:* "Same jobs, smarter place and time."
- *The numbers count up:* "In our example: 530 kilograms less CO₂ and about 1,800 litres less water."

### 0:16-1:06 · press **P**: the story with Dewy (about 50 s)
Dewy spotlights one widget per screen and says its line; narrate over the captions in the footer.
- **Start** (Dewy: "These are four jobs at two data centres."): "Four flexible jobs, two sites, day or night."
- **Schedule, run now → run smart:** "Run now piles two big jobs onto Site A at night. Run smart spreads them out."
- **Slider sweep** (Dewy: "Slide to trade carbon for water."): "Carbon and water pull against each other; this curve is every compromise. The stops marked IBM ran on real hardware."
- **Quantum** (Dewy: "This is the real quantum run."): "Eight qubits, a where and a when for each job; the textbook method needs sixteen. IBM's machine lands 18 to 23 percent of its shots in the best tenth of schedules; random guessing lands 10."
- **Compare** (Dewy: "Classical methods check every answer."): "At this size simple methods find the same answer, faster. We show that on purpose."
- **Ask** (Dewy: "Ask me anything about the plan."): "An AI explains our saved results. It never picks the schedule."
- **About** (Dewy: "Everything here is cited or labelled."): "Cited where we could, labelled where we couldn't."

### 1:06-1:45 · 3 Quantum, by hand (press **3**)
**Say:** "Watch Dewy think while the circuit lights up gate by gate, then the shots fill in: random, simulator, then IBM. The green cost layer adds each schedule's cost; the blue mixer lets cheap schedules win. A perfect simulator lands 28 to 34 percent in the best tenth. Error mitigation gave no consistent gain. Every job ID is saved."

### 1:45-2:30 · 4 Compare (press **4**; click the tabs)
- **Scaling:** "On simulators we went up to 22 qubits. The circuit grows from 114 to about a thousand two-qubit gates, and the noise model was optimistic. That's where today's hardware stops."
- **Job rules:** "With real rules, savings shrink but don't vanish; on IBM hardware 61 percent of shots respected every rule, against 25 percent for random guessing."
- **Cities / Forecasts (optional):** "Water stress changes the plan in Delhi and Kolkata, and a 5 percent forecast error keeps the plan within 5 percent of the best every time."

### 2:30-3:15 · 5 Ask (press **5**)
**Do:** click *How do I know the quantum part is real?*, then *Is this faster than a laptop?*. Then *Describe your jobs* → **Read my jobs**.

**Say:** "Dewy thinks, then answers in one line; the full answer stays in the chat with its badge. The AI only sees facts from our saved results, and a sentence with any number it can't match is deleted. Here I describe my own jobs in plain English: the table fills in, then brute force and the quantum simulator solve it live, labelled as simulator, not hardware."

### 3:15-3:40 · 6 About (press **6**)
**Say:** "Three steps: encode, run, check. A laptop solves this size instantly, and we use it as our referee. We claim no quantum advantage. What we show is a correct, compact quantum formulation of a real sustainability problem, tested on real IBM hardware, with every result saved. That's GreenQ, by Team Response200."

---

**Checklist:** the numbers spoken match the screen (530 kg, about 1,800 L, 8 vs 16 qubits, 10% vs 18–23% vs 28–34%, 22 qubits, 114 → about 1,000 gates, 61% vs 25%) · answers show their AI EXPLANATION or TEMPLATE badge · mouse off the hero while it plays · 3–4 minutes at 1080p · YouTube link added to README and PPT slide 12.
