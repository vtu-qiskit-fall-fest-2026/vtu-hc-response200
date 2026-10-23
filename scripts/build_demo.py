"""Build the automated demo: one timeline, two presets, narration files.

    python scripts/build_demo.py

Writes
  docs/demo/timeline.json                    the app plays this (GET /api/demo)
  docs/demo/narration_{standard,short}.txt   script by chapter, with timestamps
  docs/demo/narration_{standard,short}.srt   subtitles
  docs/demo/narration_{standard,short}.vtt
  docs/demo/youtube_chapters_{preset}.txt    paste into the YouTube description
  docs/VIDEO_SCRIPT.md                       recording + voice-over guide and both scripts

Every number in the narration is filled in from results/ui_data.json (and the
cached, reviewed answers in results/llm_cache.json) by key; none is typed here.
Each step lists the keys it quotes. tests/test_demo.py checks the numbers, the
speech fit (words / 2.4 + 0.5 s must fit the step) and the jargon glosses.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "demo"
WPS = 2.4          # calm voice: about 144 words per minute
PAUSE = 0.5        # breathing room per step

CHAPTERS = [
    ("problem", "Problem and idea"),
    ("schedule", "The schedule"),
    ("tradeoff", "Carbon vs water"),
    ("quantum", "Quantum proof"),
    ("ask", "Ask GreenQ"),
    ("methods", "Methods compared"),
    ("scaling", "Scaling and job rules"),
    ("jobs", "Your own jobs"),
    ("about", "How it is built"),
    ("closing", "Closing"),
]

# Selectors the director acts on (all exist in the real app).
RUN_SMART = '[aria-label="Which schedule"] [data-value="greenq"]'
SLIDER = "#prio-slider input"
CHAT_INPUT = 'input[aria-label="Your question"]'
TAB = '[aria-label="Comparison"] [data-value="{}"]'


def values() -> tuple[dict, dict]:
    d = json.loads((ROOT / "results" / "ui_data.json").read_text())
    cache = json.loads((ROOT / "results" / "llm_cache.json").read_text()) if (ROOT / "results" / "llm_cache.json").exists() else {}
    stop = {s["w"]: s for s in d["sweep"]}
    hw = [h["share_best10"] for p in d["proof"] for h in p["hardware"]]
    ideal = [p["ideal"]["share_best10"] for p in d["proof"]]
    raw = next(h for h in d["proof"][1]["hardware"] if h["mitigation"] == "none")
    sizes = d["scaling"]["sizes"]
    why = (cache.get("explain", {}).get("flexible:0.5", {}).get("lines") or [None])[0]
    v = {
        "saved_kg": f"{stop[0.5]['saved_kg_co2']:,.0f}",
        "saved_l": f"{stop[0.5]['saved_litres']:,.0f}",
        "carbon_only_kg": f"{stop[1.0]['saved_kg_co2']:,.0f}",
        "water_only_l": f"{stop[0.0]['saved_litres']:,.0f}",
        "hw_lo": f"{100 * min(hw):.0f}", "hw_hi": f"{100 * max(hw):.0f}",
        "ideal_lo": f"{100 * min(ideal):.0f}", "ideal_hi": f"{100 * max(ideal):.0f}",
        "gates": f"{raw['two_qubit_gates']:,}", "gates_max": f"{sizes[-1]['two_qubit_gates']:,}",
        "runs": f"{d['totals']['hardware_jobs']}",
        "qubits": f"{d['circuit']['n_qubits']}", "onehot": f"{d['circuit']['onehot_qubits']}",
        "random": "10",  # random guessing lands 10% in the best tenth by definition (tenths)
    }
    src = {
        "saved_kg": "sweep[w=0.5].saved_kg_co2", "saved_l": "sweep[w=0.5].saved_litres",
        "carbon_only_kg": "sweep[w=1].saved_kg_co2", "water_only_l": "sweep[w=0].saved_litres",
        "hw_lo": "min(proof[*].hardware[*].share_best10)", "hw_hi": "max(proof[*].hardware[*].share_best10)",
        "ideal_lo": "min(proof[*].ideal.share_best10)", "ideal_hi": "max(proof[*].ideal.share_best10)",
        "gates": "proof[w=0.5].hardware[raw].two_qubit_gates", "gates_max": "scaling.sizes[-1].two_qubit_gates",
        "runs": "totals.hardware_jobs", "qubits": "circuit.n_qubits", "onehot": "circuit.onehot_qubits",
        "random": "best tenth of schedules = 10% under random guessing",
    }
    return {**v, "why_line": why}, src


def steps(v: dict) -> list[dict]:
    """Every step: chapter, duration per preset (None = skipped), narration per preset,
    Dewy, spotlight and actions (at = seconds into the step; dicts of {standard, short} resolve per preset)."""
    S = lambda std, short: {"standard": std, "short": short}  # noqa: E731
    return [
        # 1 Problem and idea ----------------------------------------------------------
        dict(chapter="problem", dur=S(6.5, 5.0),
             say=S("Data centres burn electricity and evaporate water to keep servers cool.",
                   "Data centres burn electricity and evaporate water to cool servers."),
             mood="waking", align="[data-tour=jobs]",
             actions=[{"at": 0, "do": "reset"}, {"at": 0.1, "do": "hero", "restart": True}]),
        dict(chapter="problem", dur=S(6.5, 5.0),
             say=S("Many jobs are flexible: they could run at another site, or later.",
                   "Many jobs could run at another site, or later."),
             mood="curious", look="[data-tour=jobs]", actions=[]),
        dict(chapter="problem", dur=S(7.0, 5.0),
             say=S("GreenQ picks a smarter place and time for each job, with a quantum algorithm.",
                   "GreenQ picks a smarter place and time with quantum computing."),
             mood="excited", actions=[{"at": S(3.6, 1.8), "do": "hero", "hold": 3},
                                      {"at": S(4.4, 2.6), "do": "dewy", "mood": "celebrate"}]),
        # 2 The schedule ---------------------------------------------------------------
        dict(chapter="schedule", dur=S(7.0, 5.0),
             say=S("Our example: four jobs, two data centres, a day slot and a night slot.",
                   "Four jobs, two data centres, day and night slots."),
             mood="excited", spot="[data-widget=schedule]", align="[data-widget=schedule]",
             actions=[{"at": 0, "do": "screen", "screen": 1}, {"at": 0, "do": "state", "view": "before", "idx": 10, "preset": "flexible"},
                      {"at": 0, "do": "hero", "hold": None}]),
        dict(chapter="schedule", dur=S(8.0, 6.0),
             say=S("Run now: every job starts at home, the moment it arrives. Site A gets crowded at night.",
                   "Run now: every job starts at home; Site A is crowded at night."),
             mood="curious", spot="[data-widget=schedule]", look='[data-lane="1"]',
             actions=[{"at": 1.0, "do": "hover", "target": '[data-lane="1"]'}]),
        dict(chapter="schedule", dur=S(7.0, 6.0),
             say=S("Now we press run smart. The jobs move to cleaner time slots and drier cooling.",
                   "Run smart: jobs move to cleaner slots and drier cooling."),
             mood="excited", spot="[data-widget=schedule]",
             actions=[{"at": 0.3, "do": "click", "target": RUN_SMART}]),
        dict(chapter="schedule", dur=S(6.0, 5.0),
             say=S(f"Same jobs: {v['saved_kg']} kilograms less CO2 and {v['saved_l']} litres less water.",
                   f"{v['saved_kg']} kilograms less CO2 and {v['saved_l']} litres less water."),
             quotes=["saved_kg", "saved_l"], mood="celebrate", spot="[data-widget=schedule]",
             actions=[{"at": 0.4, "do": "hover", "target": "[data-widget=schedule] .grid-cols-2:last-child"}]),
        dict(chapter="schedule", dur=S(5.0, 3.0),
             say=S("Dewy explains each move, for example the training job.", "Dewy explains each move."),
             mood="proud", spot="[data-widget=why]", align="[data-widget=why]",
             actions=[{"at": 0.4, "do": "dewy", "say": v["why_line"], "badge": "ai", "ms": S(4800, 2900)}] if v["why_line"] else []),
        # 3 Carbon vs water ------------------------------------------------------------------
        dict(chapter="tradeoff", dur=S(8.0, 6.0),
             say=S("Carbon and water pull against each other. We drag from cutting carbon to saving water.",
                   "Carbon and water pull against each other. Watch the slider."),
             mood="curious", spot="[data-widget=priority]", align="[data-widget=priority]",
             actions=[{"at": 0, "do": "state", "view": "greenq", "idx": 10, "screen": 1},
                      {"at": 0.6, "do": "slide", "to": 20, "dur": S(2.6, 1.8)},
                      {"at": S(4.0, 3.0), "do": "slide", "to": 0, "dur": S(3.6, 2.6)}]),
        dict(chapter="tradeoff", dur=S(8.0, 6.5),
             say=S(f"With carbon only we save {v['carbon_only_kg']} kilograms of CO2; with water only, {v['water_only_l']} litres of water.",
                   f"Carbon only saves {v['carbon_only_kg']} kilograms; water only saves {v['water_only_l']} litres."),
             quotes=["carbon_only_kg", "water_only_l"], mood="curious", spot="[data-widget=tradeoff]", look="[data-widget=tradeoff]",
             actions=[{"at": 0.2, "do": "slide", "to": 20, "dur": S(2.4, 1.8)}, {"at": S(4.6, 3.6), "do": "slide", "to": 0, "dur": S(2.4, 1.8)}]),
        dict(chapter="tradeoff", dur=S(7.0, 5.5),
             say=S("This curve shows every compromise. The three IBM marks ran on a real quantum computer.",
                   "The three IBM marks ran on a real quantum computer."),
             mood="proud", spot="[data-widget=priority]", look="#prio-slider",
             actions=[{"at": 0.3, "do": "slide", "to": 10, "dur": S(2.0, 1.4)}]),
        # 4 Quantum proof ----------------------------------------------------------------
        dict(chapter="quantum", dur=S(8.0, 6.5),
             say=S(f"Here is the real circuit: {v['qubits']} qubits, one where and one when for each job.",
                   f"The real circuit: {v['qubits']} qubits, a where and a when per job."),
             quotes=["qubits"], mood="thinking", spot="[data-widget=circuit]", align="[data-widget=circuit]",
             actions=[{"at": 0, "do": "screen", "screen": 2}, {"at": 0, "do": "state", "idx": 10}]),
        dict(chapter="quantum", dur=S(8.0, 5.5),
             say=S(f"Every measured answer is a valid schedule. The usual method needs {v['onehot']} qubits.",
                   f"Every answer is a valid schedule; the usual method needs {v['onehot']}."),
             quotes=["onehot"], mood="working", spot="[data-widget=circuit]", actions=[]),
        dict(chapter="quantum", dur=S(7.5, 6.0),
             say=S(f"It ran on IBM's Marrakesh computer: {v['gates']} qubit links, {v['runs']} runs, every job ID saved.",
                   f"It ran on IBM Marrakesh: {v['gates']} qubit links, {v['runs']} runs."),
             quotes=["gates", "runs"], mood="proud", spot="[data-widget=facts]", align="[data-widget=facts]", actions=[]),
        dict(chapter="quantum", dur=S(8.0, 7.0),
             say=S(f"Random guessing puts {v['random']} percent of answers in the best tenth. IBM's computer put {v['hw_lo']} to {v['hw_hi']} percent.",
                   f"Random guessing puts {v['random']} percent in the best tenth; IBM put {v['hw_lo']} to {v['hw_hi']}."),
             quotes=["random", "hw_lo", "hw_hi"], mood="proud", spot="[data-widget=histogram]", look="[data-widget=histogram]", actions=[]),
        dict(chapter="quantum", dur=S(6.5, 5.0),
             say=S(f"A perfect simulator reaches {v['ideal_lo']} to {v['ideal_hi']} percent. Noise-reduction tricks did not help consistently.",
                   "Noise-reduction tricks did not help consistently."),
             quotes=["ideal_lo", "ideal_hi"], mood="idle", spot="[data-widget=facts]", look="[data-widget=facts]", actions=[]),
        # 5 Ask GreenQ ----------------------------------------------------------------------------
        dict(chapter="ask", dur=S(3.5, 2.5),
             say=S("Now we ask GreenQ a question.", "We ask GreenQ."),
             mood="excited", spot="[data-widget=chat]", align=CHAT_INPUT,
             actions=[{"at": 0, "do": "screen", "screen": 4},
                      {"at": 0.6, "do": "type", "target": CHAT_INPUT, "text": "What is GreenQ and what are its advantages?", "cps": S(30, 42)}]),
        dict(chapter="ask", dur=S(8.0, 5.5),
             say=S("The answer comes only from our saved results, and every number is checked against the data.",
                   "Answers come only from saved, fact-checked results."),
             mood="thinking", spot="[data-widget=chat]", actions=[{"at": 0, "do": "enter", "target": CHAT_INPUT}]),
        dict(chapter="ask", dur=S(3.5, 2.5),
             say=S("Then the honest question.", "Then the honest question."),
             mood="curious", spot="[data-widget=chat]",
             actions=[{"at": 0.1, "do": "type", "target": CHAT_INPUT, "text": "Is it better than a normal computer?", "cps": S(30, 42)}]),
        dict(chapter="ask", dur=S(10.0, 7.5),
             say=S("The answer is no, not at this size. A laptop is faster, so we use it as our referee.",
                   "No, not at this size. A laptop is faster; it is our referee."),
             mood="thinking", spot="[data-widget=chat]", actions=[{"at": 0, "do": "enter", "target": CHAT_INPUT}]),
        # 6 Methods compared ---------------------------------------------------------------
        dict(chapter="methods", dur=S(9.0, 8.0),
             say=S("Against simple methods like greedy and annealing, all find the best plan here, and faster.",
                   "Simple methods also find the best plan here, and faster."),
             mood="thinking", spot="[data-widget=methods]", align="[data-widget=methods]",
             actions=[{"at": 0, "do": "screen", "screen": 3}, {"at": 0.4, "do": "click", "target": TAB.format("methods")}]),
        # 7 Scaling and job rules ------------------------------------------------------------
        dict(chapter="scaling", dur=S(4.5, 6.0),
             say=S(f"Bigger problems: {v['gates']} to {v['gates_max']} qubit links.", "Bigger problems need many more qubit links."),
             quotes=["gates", "gates_max"], mood="curious", spot="[data-widget=scaling]",
             actions=[{"at": 0, "do": "screen", "screen": 3}, {"at": 0.2, "do": "click", "target": TAB.format("scaling")}]),
        dict(chapter="scaling", dur=S(4.5, None),
             say=S("With job rules, savings shrink but remain.", None),
             mood="curious", spot="[data-widget=rules]",
             actions=[{"at": 0.2, "do": "click", "target": TAB.format("rules")}]),
        # 8 Your own jobs ----------------------------------------------------------------------
        dict(chapter="jobs", dur=S(5.0, None),
             say=S("You can also describe your own jobs in plain English.", None),
             mood="excited", spot="[data-widget=try]", align="[data-widget=try]",
             actions=[{"at": 0, "do": "screen", "screen": 4}, {"at": 0.9, "do": "click", "target": "[data-demo=read-jobs]"}]),
        # 9 How it is built ---------------------------------------------------------------------
        dict(chapter="about", dur=S(8.0, None),
             say=S("Built with Qiskit on IBM Quantum, Python, FastAPI and React. Groq writes explanations only.", None),
             mood="proud", spot="[data-widget=tech]", align="[data-widget=tech]",
             actions=[{"at": 0, "do": "screen", "screen": 5}]),
        # 10 Closing ---------------------------------------------------------------------------
        dict(chapter="closing", dur=S(5.5, 4.5),
             say=S(f"Same jobs: {v['saved_kg']} kilograms less CO2, {v['saved_l']} litres less water.",
                   f"{v['saved_kg']} kilograms less CO2, {v['saved_l']} litres less water."),
             quotes=["saved_kg", "saved_l"], mood="celebrate",
             actions=[{"at": 0, "do": "screen", "screen": 0}, {"at": 0, "do": "hero", "hold": 3}]),
        dict(chapter="closing", dur=S(6.5, 5.5),
             say=S("Sites are illustrative and we claim no quantum advantage. Next: bigger problems, real data.",
                   "No quantum advantage claimed. Next: bigger problems and real data."),
             mood="proud", actions=[{"at": S(5.0, 4.2), "do": "spot", "target": None}]),
    ]


def resolve(x, preset):
    if isinstance(x, dict) and set(x) == {"standard", "short"}:
        return x[preset]
    if isinstance(x, dict):
        return {k: resolve(val, preset) for k, val in x.items()}
    if isinstance(x, list):
        return [resolve(i, preset) for i in x]
    return x


def captions(text: str, max_words: int = 12) -> list[str]:
    words = text.split()
    lines, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_words or (w.endswith((".", ";", ":")) and len(cur) >= 6):
            lines.append(" ".join(cur))
            cur = []
    if cur:
        lines.append(" ".join(cur))
    return lines


def build(preset: str, v: dict, src: dict) -> dict:
    out, t, chapters = [], 0.0, []
    counters: dict[str, int] = {}
    for st in steps(v):
        dur = resolve(st["dur"], preset)
        if dur is None:
            continue
        ch = st["chapter"]
        if not chapters or chapters[-1]["id"] != ch:
            chapters.append({"id": ch, "title": dict(CHAPTERS)[ch], "start": round(t, 2)})
        counters[ch] = counters.get(ch, 0) + 1
        text = resolve(st["say"], preset)
        out.append({
            "id": f"{ch}-{counters[ch]}",
            "chapter": ch,
            "start": round(t, 2),
            "duration": dur,
            "narration": text,
            "captions": captions(text),
            "mood": st.get("mood", "idle"),
            "spotlight": st.get("spot"),
            "align": st.get("align"),
            "look": st.get("look"),
            "actions": resolve(st.get("actions", []), preset),
            # only the numbers this preset's narration actually says
            "quotes": {k: {"value": v[k], "from": src[k]} for k in st.get("quotes", []) if v[k].replace(",", "") in text.replace(",", "")},
        })
        t += dur
    for c in chapters:
        c["duration"] = round(sum(s["duration"] for s in out if s["chapter"] == c["id"]), 2)
    return {"total": round(t, 2), "chapters": chapters, "steps": out}


def ts(sec: float, sep: str = ",") -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"


def mmss(sec: float) -> str:
    return f"{int(sec // 60):02}:{int(sec % 60):02}"


def write_files(preset: str, tl: dict) -> None:
    lines = [f"GreenQ demo narration ({preset}, {mmss(tl['total'])})", ""]
    for c in tl["chapters"]:
        lines.append(f"[{mmss(c['start'])}] {c['title']}")
        for s in tl["steps"]:
            if s["chapter"] == c["id"]:
                lines.append(f"  {mmss(s['start'])}  {s['narration']}")
        lines.append("")
    (OUT / f"narration_{preset}.txt").write_text("\n".join(lines))
    srt, vtt = [], ["WEBVTT", ""]
    for i, s in enumerate(tl["steps"], 1):
        a, b = s["start"], s["start"] + s["duration"] - 0.15
        body = "\n".join(s["captions"])
        srt += [str(i), f"{ts(a)} --> {ts(b)}", body, ""]
        vtt += [f"{ts(a, '.')} --> {ts(b, '.')}", body, ""]
    (OUT / f"narration_{preset}.srt").write_text("\n".join(srt))
    (OUT / f"narration_{preset}.vtt").write_text("\n".join(vtt))
    (OUT / f"youtube_chapters_{preset}.txt").write_text("\n".join(f"{mmss(c['start'])} {c['title']}" for c in tl["chapters"]) + "\n")


def video_script(tls: dict) -> str:
    std, short = tls["standard"], tls["short"]
    out = [
        "# GreenQ demo video script",
        "",
        "For: whoever records the YouTube video. Generated by `scripts/build_demo.py` from `docs/demo/timeline.json`; edit the builder, not this file.",
        "",
        f"The app plays the demo by itself (**D** key, or the *Full demo* button). Two presets: **Standard** {mmss(std['total'])} ({std['total']:.0f} s) and **Short** {mmss(short['total'])} ({short['total']:.0f} s).",
        "",
        "## Record it and add the voice-over, step by step",
        "",
        "1. Start the app: `python -m server --rebuild`.",
        "2. Record automatically: `python scripts/record_demo.py --preset standard` (or `--preset short`). It writes `results/demo/greenq_demo_standard.webm` (and `.mp4` when ffmpeg is installed) at 1920×1080, with no sound.",
        "   - To record by hand instead, open `http://127.0.0.1:8000/?record=1` in a 1920×1080 full-screen window, start your screen recorder, and press **D**.",
        "   - `?record=1&captions=0` records without subtitles (for a clean voice-over version).",
        "3. Make the voice: paste `docs/demo/narration_standard.txt` (or `_short`) into your AI voice tool. Each line starts at the time shown; the pace is about 144 words per minute.",
        "4. Put the video and the voice in your editor. Line up each paragraph with its timestamp. Add `docs/demo/narration_standard.srt` as subtitles if you want them burned in.",
        "5. Speeding up to 1.2–1.4× is safe: every number stays on screen for at least 2 seconds at normal speed.",
        "6. YouTube description: paste `docs/demo/youtube_chapters_standard.txt` (adjust the times if you add an intro).",
        "",
        "While watching the demo live: **Space** pause/resume, **← →** previous/next chapter, **R** restart, **C** captions on/off, **Esc** stop. Move the mouse to show the player bar (preset, speed, chapter list).",
        "",
    ]
    for name, tl in (("Standard", std), ("Short", short)):
        out += [f"## {name} preset ({mmss(tl['total'])})", "", "| Time | Chapter | Narration |", "|---|---|---|"]
        for s in tl["steps"]:
            title = dict(CHAPTERS)[s["chapter"]]
            out.append(f"| {mmss(s['start'])} | {title} | {s['narration']} |")
        out.append("")
    out += ["**Every number above is filled in from `results/ui_data.json` by `scripts/build_demo.py`.** If the data changes, re-run it."]
    return "\n".join(out) + "\n"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    v, src = values()
    tls = {p: build(p, v, src) for p in ("standard", "short")}
    timeline = {"version": 1, "words_per_second": WPS, "pause_per_step": PAUSE,
                "chapter_titles": dict(CHAPTERS), "presets": tls}
    (OUT / "timeline.json").write_text(json.dumps(timeline, indent=2, ensure_ascii=False) + "\n")
    for p, tl in tls.items():
        write_files(p, tl)
    (ROOT / "docs" / "VIDEO_SCRIPT.md").write_text(video_script(tls))
    for p, tl in tls.items():
        print(f"{p}: {tl['total']:.1f} s ({mmss(tl['total'])}), {len(tl['steps'])} steps, chapters: "
              + ", ".join(f"{c['title']} {c['duration']:.1f}s" for c in tl["chapters"]))


if __name__ == "__main__":
    main()
