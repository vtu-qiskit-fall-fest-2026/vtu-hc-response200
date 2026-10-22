# CLAUDE.md: Project brief for Team Response200

Read this whole file before doing anything. It tells you what we are building, the rules we cannot break, and what "done" means. It deliberately does **not** tell you how to build it. You design the solution.

## 1. Situation

- **Event:** VTU Qiskit Fall Fest 2026 Hackathon (VTU Belagavi with IBM Quantum). 48-hour virtual build.
- **Team:** Response200, ID `VTU-QFF-HC-0137`, tier Online. Repo: `vtu-qiskit-fall-fest-2026/vtu-hc-response200`.
- **Track:** Track 6, Quantum Applications for Climate Change & Sustainability.
- **Hard deadlines (IST):**
  - **Code freeze: Thu Oct 23, 3:00 PM.** No commits after this. Our own target is to stop pushing code by **2:00 PM**.
  - **Solution PPT due: Oct 23, 6:00 PM** on quc.vtu.ac.in (the user submits it).
  - Shortlist of the Top 50 is picked from the **PPT and the repo**. The video and live demo matter for the final round.
- The user is a 2nd-year BTech CSE student with no quantum background who relies on Claude Code to write and debug the implementation. Do not assume they can fix code themselves. Explain what you did and why in plain language, give exact commands to run, and keep every step simple and recoverable.

## 2. The problem (outcome, not design)

Data centres consume large amounts of electricity (carbon) and cooling water. The same flexible compute job costs very different amounts of carbon and water depending on **which site** and **which time slot** it runs in, and the two goals can conflict (evaporative cooling saves energy but loses water; air cooling does the opposite).

**Goal:** build **GreenQ**, a tool that decides where and when to run a set of flexible data-centre jobs so the combined water and carbon footprint is as low as possible, using a **quantum optimization approach built with Qiskit**, run on a simulator **and on real IBM Quantum hardware**, and shown through a demo interface a non-expert can understand in under a minute.

**Starting hypothesis (challenge it if you find better):** model the assignment as a QUBO and solve it with QAOA. You own the final formulation, algorithm, circuit design, encodings, penalties, and sizes. If a different Qiskit-based approach fits the problem and the hardware limits better, propose it with reasons.

## 3. Rules from the organizers (non-negotiable)

- The solution **must use Qiskit** and implement a real quantum algorithm or circuits. A quantum-sounding wrapper around classical code is disqualifying in spirit.
- All work is done inside the 48-hour window. Only our own work; **credit every library, dataset and reference** in the README.
- **Commit regularly** with meaningful messages. Commit history is used to verify the work was done in the window.
- Push only to this repository. Code pushed after 3:00 PM Oct 23 is not considered.
- Required in the repo: source code, a README (problem statement, approach, setup and run instructions, team details), and a requirements file.
- Required outside the repo: demo video on YouTube, working prototype, PPT on the portal.
- Plagiarism, copied or pre-built solutions, or platform misuse lead to disqualification.

## 4. How we are judged

Innovation and originality · technical implementation and quality of Qiskit usage · problem-solving approach · relevance to Track 6 · working demo. Evaluation is by an expert jury, so **honesty beats hype**.

## 5. Outcomes we need, in priority order

**Tier 1, must ship (a plain version that works end to end beats an ambitious one that doesn't):**
1. A quantum-based scheduler that produces valid schedules on a small instance, on a simulator.
2. A classical baseline that finds the true best answer so we can report how close the quantum result is.
3. At least one run on **real IBM Quantum hardware**, with backend name, job ID and results saved in the repo.
4. A demo interface showing the naive schedule next to the optimized one, with litres of water and kg CO2 saved.
5. README, requirements, tests that pass from a clean clone.

**Tier 2, should ship:**
- A control that trades carbon against water and shows how the best schedule changes.
- Views that prove the quantum part is real (circuit diagram, result distribution).
- A simulator vs. hardware comparison, including the effect of noise and error mitigation.

**Tier 3, only if Tier 1 and 2 are solid:** water-stress weighting by region, scenario presets, plain-language "why this schedule" explanations, scaling analysis.

Do not start a higher tier until the lower tier runs end to end and is committed.

## 6. Constraints and facts to respect

- **IBM Open Plan:** about 10 minutes of quantum runtime per 28 days per account, and Session execution mode is not available on it. Do your tuning on simulators; send only what must go to hardware. Save every hardware result the moment it returns so the demo never depends on the queue. Verify current limits in IBM's docs.
- **Versions:** the template `requirements.txt` pins `qiskit<2.0`, which may conflict with current IBM Runtime docs (they use Qiskit 2.x). Check the current official docs, test in a clean virtual environment, and update `requirements.txt` with versions you have actually verified. Remove packages we don't use (for example `qiskit-nature`).
- **Instance size:** hardware is noisy and simulators grow exponentially. Choose sizes that run on real hardware and report them honestly.
- **Do not claim quantum advantage.** At this size a classical solver wins. Our honest claim is a correct formulation, validated end to end on real hardware, with measured accuracy and a path to scale.
- **Data honesty:** use real public figures where possible and cite them. Anything illustrative must be labelled as illustrative in the README and the UI. Never present invented numbers as measurements.
- **Secrets:** the IBM API token lives only in `.env` (already gitignored). Never print it, log it, commit it, or hard-code it. Check `git status` before every commit.

## 7. How to work

- **Think for yourself.** Explore alternatives, pick the most efficient and robust approach, and record each significant decision and the reason in `docs/DECISIONS.md` (a few lines each).
- **Plan first.** At the start, inspect the environment, then propose a plan (architecture, formulation, layout, milestones against the deadline) and wait for the user's approval before large builds.
- You may restructure the template layout (`src/`, `tests/`, `notebooks/`, `data/`, `docs/`) if there is a better one, and you should keep `main` runnable at all times.
- **Git:** small, frequent commits using the README's prefixes (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). The README asks for feature branches and pull requests; ask the user once at the start whether to follow that or push directly to `main` for speed, and then stick to the answer.
- **Verify, don't assume.** Run the code and tests, check outputs against the classical baseline, and confirm the project runs from a fresh clone and fresh venv before calling anything done.
- **Teach as you build.** The user and teammates must explain the work to a jury. Maintain `docs/EXPLAINER.md` in plain language: what each module does, why each quantum step exists, and likely jury questions with honest answers. Add to it as you build, not at the end.
- **Time-box.** If something blocks for more than about 30 minutes, tell the user, fall back to the simpler option, and move on.
- Keep reports to the user short: what was done, what is next, anything needed from them (for example an IBM token or a decision).

## 8. Definition of done

- [ ] Tier 1 complete and demoable; the demo works without a live hardware queue
- [ ] Real hardware run saved with backend, job ID and results
- [ ] Classical comparison and honest metrics documented
- [ ] `README.md` filled in: team table, Track 6, problem, solution, architecture diagram, setup and run steps, results, demo screenshot and links, credits, limitations
- [ ] README submission checklist updated to include the YouTube demo video and the PPT on quc.vtu.ac.in
- [ ] `requirements.txt` verified in a clean environment; tests pass
- [ ] No secrets in the repo or in git history
- [ ] `docs/EXPLAINER.md` and `docs/PPT_CONTENT.md` (slide-by-slide content: problem, approach, algorithm and circuit details, results, links, team) ready for the user
- [ ] Final commit pushed before 2:00 PM Oct 23 (hard stop 3:00 PM)

## 9. Out of scope

Anything that doesn't serve the Track 6 problem and the Tier 1 to 3 outcomes: authentication, databases, deployment infrastructure, mobile apps, extra tracks.
