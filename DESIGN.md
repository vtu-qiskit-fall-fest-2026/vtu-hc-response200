---
name: GreenQ
description: Quantum-assisted placement of data-centre jobs for less carbon and less water, shown on a light, quiet page.
colors:
  carbon: "#059669"
  carbon-soft: "#d1fae5"
  carbon-ink: "#065f46"
  water: "#2563eb"
  water-soft: "#dbeafe"
  overload: "#e11d48"
  overload-soft: "#fff1f2"
  illustrative-ink: "#92400e"
  illustrative-soft: "#fffbeb"
  background: "#ffffff"
  foreground: "#0b0b0f"
  muted: "#f5f6f8"
  muted-foreground: "#6b6f7a"
  border: "#e7e8ec"
  ring: "#18181b"
  slate-neutral: "#94a3b8"
typography:
  display:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "62px"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
    fontFeature: "\"cv11\", \"ss01\""
  headline:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  widget: "22px"
  2xl: "24px"
  frame: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "24px"
  section: "96px"
  container: "1150px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
    typography: "{typography.label}"
  button-dark:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.xl}"
    padding: "8px 14px"
  button-soft:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
  segmented-tab:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
  segmented-tab-active:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
  chip-ibm:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-illustrative:
    backgroundColor: "{colors.illustrative-soft}"
    textColor: "{colors.illustrative-ink}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  chip-overload:
    backgroundColor: "{colors.overload-soft}"
    textColor: "{colors.overload}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  metric-tile-carbon:
    backgroundColor: "{colors.carbon-soft}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  metric-tile-water:
    backgroundColor: "{colors.water-soft}"
    textColor: "{colors.water}"
    rounded: "{rounded.xl}"
    padding: "16px"
  widget-card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.widget}"
    padding: "20px"
  section-card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  nav-bar:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
---

# Design System: GreenQ

## Overview

**Creative North Star: "The Clean Ledger"**

GreenQ is a white page with almost nothing on it except the evidence. A white ground, soft grey wells, one quiet sans-serif, and two meaning colours that never swap roles: emerald for carbon, blue for water. The style is light, simple and premium, inspired by the Waymark template's calm SaaS landing rhythm (recreated, never copied): two-tone headlines, white rounded cards on a white stage, and a quiet sidebar of six screens.

Density is low on purpose. Each screen carries one short headline, one or two big numbers per card, and labels instead of paragraphs. The app is a set of six slides in a sidebar, mostly watched rather than operated, so motion carries meaning: job blocks slide between sites, savings count up, the trade-off curve draws itself in. Nothing moves for decoration, and reduced-motion preferences turn every animation into an instant state change.

Honesty is a visual job here. Every number on screen is read from `results/ui_data.json`; illustrative inputs wear an amber ILLUSTRATIVE tag; real IBM hardware results wear dark, solid chips labelled "IBM", so a viewer can tell measured, simulated and illustrative apart at a glance.

**Key Characteristics:**
- White ground, soft grey (#f5f6f8) wells, hairline borders; no dark mode.
- Two meaning colours, each paired with one icon: emerald + leaf = carbon, blue + droplet = water.
- Two-tone headlines: a black statement line, then a 45%-opacity grey follow-up line.
- Large rounded containers (16–28px) with soft, wide, low-opacity shadows.
- Big tabular numbers, short grey captions, very little text.
- Motion only where it explains something.

## Colors

A near-monochrome light palette with two strictly semantic accents and two signal colours.

### Primary
- **Carbon Emerald** (carbon): carbon dioxide and only carbon. CO₂ figures, the leaf icon, the "Cut carbon" end of the priority slider, the cost layer of the circuit, the grid-carbon intensity bar, the trade-off curve's current-point marker. Its pale wash (carbon-soft) backs CO₂ metric tiles and the "best 10%" decile; its deep ink (carbon-ink) sets large CO₂ numbers.

### Secondary
- **Water Blue** (water): water and only water. Litre figures, the droplet icon, the "Save water" end of the slider, the circuit's mixer column. Its pale wash (water-soft) backs water metric tiles.

### Tertiary
- **Overload Rose** (overload / overload-soft): a lane or site holding more than one job. Rose ring on the lane, "Overloaded" chip, the "Site A overloaded at night" pill in the hero miniature.
- **Illustrative Amber** (illustrative-ink / illustrative-soft): the ILLUSTRATIVE tag and the word "illustrative" in captions. It marks invented-for-demonstration inputs and nothing else.

### Neutral
- **Paper White** (background): page ground and every card surface.
- **Near-Black Ink** (foreground): headings, body numbers, dark buttons, and the IBM-hardware identity (chips, histogram bars, rings on the curve, measurement gates).
- **Soft Grey Well** (muted): segmented-control tracks, inner panels, list rows, the dashboard backdrop, FAQ band (often at 60–70% opacity).
- **Quiet Grey Text** (muted-foreground): captions, axis labels, secondary nav links.
- **Hairline** (border): 1px rings around every card and lane.
- **Focus Ink** (ring): the 2px focus outline.
- **Slate Line** (slate-neutral): neutral strokes in the building illustrations, the dashed trade-off curve, the slider's midpoint.

### Named Rules
**The One Meaning Rule.** Emerald means carbon, blue means water, and each always travels with its icon (leaf, droplet). Neither colour is ever used as generic "success" or "link" colour on a data surface; if a figure is not CO₂ or litres, it is not green or blue.

**The Three Provenances Rule.** Real IBM hardware is near-black and solid with the word "IBM"; the noiseless simulator is a lighter, translucent emerald; random guessing is a dashed grey outline with no fill. Illustrative inputs carry the amber tag. A viewer must be able to tell measured from simulated from illustrative without reading a legend twice.

**The No Invented Number Rule.** Every figure rendered comes from `results/ui_data.json`. Colour and type may emphasise a number; they never stand in for one.

## Typography

**Display Font:** Inter Variable (with ui-sans-serif, system-ui)
**Body Font:** Inter Variable
**Label/Mono Font:** JetBrains Mono, used only for IBM job IDs and backend names

**Character:** One neutral grotesk set tight and semibold at large sizes, with stylistic sets cv11 and ss01 for a cleaner single-storey feel. Mono appears only where the text is a literal identifier someone might copy.

### Hierarchy
- **Display** (600, 42px → 62px from sm, line-height 1.04, -0.035em): the hero headline only, centred, balanced wrapping.
- **Headline** (600, 36px → 44px, -0.03em): section openers ("How it works.", "The quantum part, shown.", "Honest answers").
- **Title** (600, 20px, tracking-tight): widget and card headings; 21px on how-it-works step cards.
- **Metric** (600, 40px, line-height 1, tabular numerals): savings and priority readouts; 32px in metric tiles, 28px in scene tickers, 24px in proof facts. Units sit beside the number at 13–14px, 500, grey.
- **Body** (400, 15px, relaxed 1.625): step-card text and FAQ answers, kept to a few lines.
- **Label** (500–600, 12–13px): captions, chips, legend items, axis text (10–11px inside SVG).
- **Mono** (400, 12–12.5px): job IDs and backend name.

### Named Rules
**The Two-Tone Headline Rule.** Section and hero headlines are two short sentences: the first in ink, the second as a block line in ink at 45% opacity. The grey line completes the thought; it is never a tagline floating above it.

**The Tabular Rule.** Every changing number uses tabular numerals so count-ups and slider sweeps do not jitter.

## Layout (v3: slides, no page scroll)

**One canvas, scaled.** Every screen is laid out on a 1600×900 canvas. `src/lib/stage.ts` sets the root font size to `16px × min(width/1600, height/900)`, and the build converts all CSS px above 1px to rem (`pxToRem` in `vite.config.ts`), so 1920×1080 and 1366×768 show exactly the same layout. Text inside SVGs keeps px because SVGs already scale with their viewBox. We don't use CSS `zoom` or `transform: scale`: both put Motion's layout animations (the moving job blocks) off by the scale factor. Below 1000px wide the scaling stops and screens scroll.

**Frame.** A 220px collapsible left sidebar (76px collapsed, icons only) lists the six screens with their number keys, then Play story, Full screen and Code at the bottom. The stage has 40px side and 32px top padding. A 60px footer holds the team line, the progress bar (six segments, the current one 40px wide) and the rose "Not quantum advantage · a laptop is the referee" pill, which never leaves the screen. In story mode the caption replaces the team line and progress bar, not the pill.

**Screen grammar.** Each screen is a header row (one headline of 8 words or fewer, 38px, with an optional `i` popover, and the badges or controls on the right) above one body that fills the rest with `min-h-0` grids. No paragraphs: a number, a short label, and at most two lines in an `i` popover (380px wide).

| Screen | Body |
|---|---|
| 1 Start | 76px two-tone headline, two 64px count-up savings, Play; the mini scene on the right |
| 2 Schedule | left card: run now / run smart, job rules, job chips, the two sites, tickers; right column (440px): priority slider, trade-off curve, why-this-schedule |
| 3 Quantum | top: circuit card; bottom: histogram (1.35fr) and facts + 7 job IDs (1fr) |
| 4 Compare | one card with five tabs: Methods, Scaling, Job rules, Cities, Forecasts |
| 5 Ask | chat (examples, 3 latest turns, input) beside Describe / Form / Fleet impact |
| 6 About | three step wells (190px), honest answers, sources |

## Elevation & Depth

Depth is soft and ambient: wide, negative-spread shadows tinted slate (rgba(15,23,42,…)) at low opacity, combined with a 1px hairline ring on every surface. Larger and more important containers float higher. Widgets rest almost flat and lift dramatically only while being dragged.

### Shadow Vocabulary
- **Nav float** (`box-shadow: 0 4px 20px -10px rgba(15,23,42,0.25)`): the sticky, translucent (85% white, backdrop blur) nav bar.
- **Showcase float** (`box-shadow: 0 24px 60px -28px rgba(15,23,42,0.35)`): the hero miniature.
- **App frame** (`box-shadow: 0 30px 80px -30px rgba(15,23,42,0.35)`): the planner window.
- **Mini-card** (`box-shadow: 0 10px 30px -12px rgba(15,23,42,0.25)`): white cards inside step wells.
- **Primary lift** (`box-shadow: 0 8px 24px -12px rgba(15,23,42,0.6)`): the primary CTA only. Emerald is never used for a button, because it means carbon.
- **Widget rest / lifted** (`0 1px 2px rgba(0,0,0,0.12)` / `0 28px 60px -16px rgba(0,0,0,0.45), 0 10px 24px -8px rgba(0,0,0,0.3)`): draggable widgets, interpolated while held.
- **Active segment** (Tailwind shadow-sm): the selected tab in a segmented control.

### Named Rules
**The Hairline Plus Haze Rule.** Every raised surface pairs a 1px border-colour ring with a soft, wide shadow. No heavy, hard or offset shadows.

## Shapes

Generous, consistent rounding that grows with container size: 6px for chips and tags, 8px for job blocks and bars, 12px for lanes and list rows, 16px for buttons, tiles and inner panels, 22px for widgets, 24px for section cards and step wells, 28px for the app frame. Segmented controls, status pills and dots are fully round. Corners never mix sharp and round on one surface.

The only illustrations are two small line-drawn buildings (an evaporative cooling tower with a plume, an air-cooled chiller block with fans) in slate strokes on pale slate fills, with a single blue droplet. Job blocks are solid rounded bars whose width is proportional to the job's energy.

## Components

### Buttons
Soft, rounded and quiet; one emphasis per view.
- **Shape:** gently rounded (16px).
- **Primary:** near-black fill, white 15px medium text, 12px × 20px, primary lift; lifts 1px on hover. Used once, for "Open the planner".
- **Dark:** near-black fill, white 14px text, 8px × 14px; hover drops to 85% opacity. The nav's "Play story".
- **Soft:** grey well fill, ink text; hover darkens the well. The hero's "Play the 20-second story".
- **Icon buttons:** 6px padding, 8px radius, grey icon turning ink on a white hover fill (copy job ID).
- **Focus:** 2px ink outline, 2px offset, globally.

### Chips
- **IBM hardware:** near-black pill, white 12px semibold text, a small emerald status dot ("Run on real IBM hardware"); under the slider, tiny 10px bold "IBM" tags on hardware stops.
- **Illustrative:** amber-50 fill, amber-800 10px semibold uppercase text with a hairline amber ring, 6px radius.
- **Overloaded:** rose-50 fill, rose-700 11px semibold text, 6px radius.
- **Neutral info:** grey well pill with grey text ("Best of all 256, by exhaustive check").

### Cards / Containers
- **Corner Style:** 22px (widgets), 24px (section cards), 16px (inner tiles).
- **Background:** white cards on a grey well; inner tiles in grey well or the carbon/water soft washes.
- **Shadow Strategy:** see Elevation; widgets rest nearly flat.
- **Border:** 1px hairline ring always.
- **Internal Padding:** 20px widgets, 24px section cards, 16px tiles.

### Inputs / Fields
- **Priority slider:** a 10px round track running blue → slate → emerald (water on the left, carbon on the right), a 28px white thumb with a hairline border and soft shadow. Ticks mark every setting; hardware settings get taller ink ticks and an "IBM" tag.
- **Focus:** the thumb gains a white-then-ink double ring.

### Navigation
The left sidebar (muted well, hairline right border). The active screen is a white pill with a hairline ring that springs between items (`layoutId`, 0.3 s). Keyboard: ← → move, 1–6 jump, P story, F full screen, Esc leave full screen; keys are ignored while typing in a field.

### Honesty badges
Small uppercase chips, 11px semibold, always visible where they apply: ILLUSTRATIVE (amber), CITED (sky), REAL IBM RUN (near-black with an emerald dot), AI EXPLANATION (violet, sparkle icon), TEMPLATE (grey), LIVE SIMULATOR, NOT HARDWARE (amber ring). Violet is reserved for the language model: its badge and the one-time "show me" ring.

### Segmented Control
A grey, fully round track with 4px padding; options are round, 14px semibold. The selected option is white with ink text and a small shadow; others are grey and turn ink on hover. Used for Business as usual / GreenQ and for the proof's priority setting.

### Two Data Centres Scene (signature)
Two grey site panels, each with its building illustration, PUE and water figures, and an ILLUSTRATIVE tag, holding a white day lane (amber sun) and night lane (indigo moon). Coloured job blocks sit in lanes and slide between them with a spring when the schedule changes; moved blocks get a small white "moved" badge. Below, carbon and water tickers count from business-as-usual to the current value.

### Quantum Proof
A white circuit card drawn in SVG: grey wires, ink H gates and measurement boxes, emerald Rz/ZZ gates over a pale emerald cost band, blue Rx gates over a pale blue mixer band. Beside a histogram of ten deciles (best tenth tinted pale emerald), three series follow the Three Provenances Rule, with grey well fact tiles holding one big number and one sentence each.

### Honest answers
A two-column definition list on the About screen: a 15px semibold question, then one grey line.

## Motion

Motion explains a change; nothing loops and nothing moves for decoration. Under `prefers-reduced-motion` every animation becomes an instant state change.

| Moment | Motion |
|---|---|
| Slide change | spring slide (48px in, 32px out, direction-aware) + fade, about 300 ms |
| Run now → run smart | job blocks spring to their new lane (`layoutId`, 0.7 s); moved blocks glow emerald once; a dashed line in the job's colour draws from its chip to its new lane, then fades (2.2 s) |
| Numbers | count-ups (1.2–1.6 s, ease-out); bars draw in, staggered 70–120 ms |
| Trade-off | the curve draws itself on entry; the dot springs to follow the slider |
| Quantum | gates light up column by column (55 ms each); then the histogram fills series by series (random, simulator, IBM, 0.65 s apart) and the best-tenth well pulses once |
| Show me (from Ask) | jump to the screen; the target card gets one violet ring pulse |

## Do's and Don'ts

### Do:
- **Do** keep the ground white and the wells soft grey (#f5f6f8); let 1px hairlines and soft shadows separate surfaces.
- **Do** pair carbon with emerald and the leaf icon, and water with blue and the droplet icon, every time.
- **Do** show real IBM hardware as solid near-black with the word "IBM", the simulator as lighter translucent emerald, and random guessing as a dashed outline.
- **Do** tag every illustrative input with the amber ILLUSTRATIVE chip.
- **Do** read every number from `results/ui_data.json` and set it in tabular numerals.
- **Do** write headlines as two short sentences, the second in 45% ink.
- **Do** reserve motion for meaning (job blocks sliding, count-ups, curve draw-in) and make every animation instant under prefers-reduced-motion.

### Don't:
- **Don't** use emerald or blue for anything that is not carbon or water.
- **Don't** show an invented number, or an illustrative one without its tag.
- **Don't** add decorative motion, parallax or any looping ornament (the start-screen miniature switches once).
- **Don't** let a screen scroll at 1366×768 or 1920×1080; cut text instead.
- **Don't** show model text without its AI EXPLANATION or TEMPLATE badge.
- **Don't** introduce a dark theme, heavy or hard offset shadows, or sharp corners.
- **Don't** add paragraphs where a number and a single grey line will do.
- **Don't** copy Waymark's assets, copy or exact layouts; recreate the calm, not the page.
