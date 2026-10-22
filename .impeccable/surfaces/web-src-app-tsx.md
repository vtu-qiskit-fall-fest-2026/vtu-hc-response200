---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: []
---

# Surface: GreenQ demo (web/)

Scope: the single-page demo UI in `web/` (React + Vite), served by FastAPI. Visitor mode: **Persuade**: the jury must understand and believe, in the presenter's order, within seconds per section.
Audience: expert jury + non-experts, watching a 1080p recording or a projector. Main control: the carbon-vs-water priority slider. Proof: saved IBM hardware runs (6 jobs, ibm_marrakesh), brute-force optimum, cited sources. Constraints: offline from `results/ui_data.json`; no IBM/Qiskit/VTU logos; illustrative data labelled; no advantage claim.
Memorable moment: the gauge level drawing down from the business-as-usual mark to the GreenQ mark, and jobs sliding between sluice bays when the slider moves.

## Direction contract

THESIS: GreenQ's savings are read off painted gauges like a reservoir level, measured rather than claimed. Refuses the category default of a dark KPI-tile dashboard with charts in cards.

OWN-WORLD: night at a dam. Wet-concrete near-black ground, poured-concrete panels with formwork seams, enamel staff gauges with alternating E-blocks and stencilled numerals; teal enamel for carbon, blue enamel for water; amber only for business-as-usual and overload marks. Condensed stencil display numerals, a hyperlegible sans for reading, mono only for job IDs and measurements.

STORY: same jobs placed smarter save X kg CO2 and Y litres (1). Here is where each job runs, before and after (2). Moving the priority changes the answer, and three stops are real IBM hardware (3). The quantum circuit beats random guessing on real hardware, stated honestly (4). How it works in four steps (5). What's illustrative, sources, no advantage claim (6).

FIRST VIEWPORT: 1920x1080. Left ~55%: small GreenQ wordmark and team line top-left; headline "Same jobs, smarter placement." at display scale; one-sentence subline; two stencil readouts −530 kg CO2 (teal) and −1,798 L water (blue) with −14% each; a primary "See the schedule" action. Right ~45%: two full-height staff gauges (carbon, water) whose level falls from an amber BUSINESS AS USUAL mark to the GreenQ mark; the saved span is hatched.

FORM: Staff Gauge (CWC reservoir bulletins + painted river staff gauges), assigned candidate 6 of 7 grounded; raises: packed billing margin (job IDs), fast one-line read per panel, solid = real hardware / hatched = simulator, one hot accent at a time. seed:8d938eb252ae40fc
Signature interaction: the drawdown (gauge level animates from naive to GreenQ), and jobs sliding between sluice bays (FLIP) as the slider moves; slider is a horizontal gauge with solid hardware stops badged "Real IBM hardware". Motion: exponential ease-out, settled state visible by default, reduced-motion respected.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
