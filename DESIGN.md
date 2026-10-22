---
name: GreenQ
description: Savings read off painted staff gauges at night at a dam; measured, not claimed.
colors:
  ground: "#0e0f0f"
  ground-2: "#121414"
  ground-deep: "#0a0b0b"
  concrete: "#171918"
  concrete-2: "#1d201f"
  line: "rgba(228, 232, 230, 0.14)"
  line-strong: "rgba(228, 232, 230, 0.28)"
  enamel: "#e9f0ee"
  enamel-naive: "#cfd8d6"
  ink-on-enamel: "#0e0f0f"
  hot: "#ffffff"
  text: "#e6eae8"
  text-2: "#b0b8b5"
  text-3: "#8b9491"
  carbon: "#2dd4bf"
  carbon-ink: "#5eead4"
  carbon-deep: "#0d5c54"
  carbon-e-mark: "#0f766e"
  water: "#5b9dff"
  water-ink: "#8cbcff"
  water-deep: "#1c3f80"
  water-e-mark: "#1d4ed8"
  amber: "#f2a33a"
  amber-ink: "#1a1206"
typography:
  display:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(3.4rem, 6.3vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(2.6rem, 4.4vw, 4.6rem)"
    fontWeight: 800
    lineHeight: 0.95
  title:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.02em"
  numeral:
    fontFamily: "Big Shoulders Stencil Display, Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "clamp(3.6rem, 6vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "\"tnum\" 1"
  lede:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 1.3vw, 1.45rem)"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.86em"
    fontWeight: 500
    letterSpacing: "0"
rounded:
  hairline: "1px"
  sm: "2px"
  md: "4px"
spacing:
  page: "clamp(1rem, 4.2vw, 5rem)"
  gap: "clamp(1rem, 2vw, 2.25rem)"
  section-y: "clamp(3rem, 6vw, 6.5rem)"
  bay-gap: "8px"
components:
  button-primary:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.ink-on-enamel}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "1rem 1.4rem"
  button-primary-hover:
    backgroundColor: "{colors.hot}"
    textColor: "{colors.ink-on-enamel}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.1rem"
  segmented-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    padding: "0.85rem 1.3rem"
  segmented-button-on:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.ink-on-enamel}"
  board:
    backgroundColor: "{colors.ground-2}"
    rounded: "{rounded.md}"
    padding: "clamp(1rem, 1.6vw, 1.6rem)"
  sluice-bay:
    backgroundColor: "{colors.concrete}"
    rounded: "{rounded.sm}"
    padding: "0.7rem"
  job-plate:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.ink-on-enamel}"
    rounded: "{rounded.sm}"
    padding: "0.45rem 0.6rem"
  job-plate-naive:
    backgroundColor: "{colors.enamel-naive}"
    textColor: "{colors.ink-on-enamel}"
  job-plate-moved:
    backgroundColor: "{colors.hot}"
    textColor: "{colors.ink-on-enamel}"
  hardware-badge:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.ink-on-enamel}"
    rounded: "{rounded.sm}"
    padding: "0.42rem 0.6rem"
  baseline-tag:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.sm}"
---

# Design System: GreenQ

## Overview

**Creative North Star: "Night at the Dam"**

GreenQ's numbers are read off painted staff gauges, the way an engineer reads a reservoir level by torchlight: a wet-concrete near-black ground, white enamel plates with alternating E-marks, stencilled numerals, and a level line that draws down from a business-as-usual mark to the optimised mark. The point of the world is that savings are *measured*, not claimed; every quantity sits on a scale with a stated window and a stated source.

Density is presentation-grade: built to be read on a 1080p recording or a projector, so type is large, contrast is high, and each section carries one fast read. Colour is semantic, never decorative. Two enamel tones each own exactly one quantity (teal for carbon, blue for water), amber owns only the baseline and overload, and white enamel carries the evidence state. The ground is plain: no grid, no texture, no glow. Depth comes from the recessed sluice bays and the enamel plates sitting on them, not from cards floating in space.

The world refuses the dark KPI-tile dashboard with charts in cards. Readouts are bare numerals under a thick coloured rule; charts are gauges, levels and ledgers.

**Key Characteristics:**
- Neutral wet-concrete near-black ground; panels are flat tonal steps, hairline-ruled.
- White enamel as the material of record: staff plates, job plates, hardware marks, primary action.
- Condensed uppercase display and stencil numerals against a hyperlegible reading sans.
- One state grammar for evidence: solid, hatched, dashed.
- Single-meaning colour: teal = carbon, blue = water, amber = business as usual / overload.
- Exponential ease-out motion; settled state is always readable; reduced motion respected.

## Colors

A near-neutral night palette where three hues each carry exactly one meaning and white enamel carries the proof.

### Primary
- **Gauge Enamel** (`enamel`): the material of record. Staff-gauge plates, job plates, the hardware swatch and level fills, section and display headings, the primary button, the active segment. On it, text is always `ink-on-enamel`.
- **Hot White** (`hot`): the one hot accent at a time. Focus rings (3px outline, 3px offset), the slider thumb, the job plate that just moved, primary-button hover.

### Secondary
- **Carbon Teal** (`carbon`): carbon only. Readout rules, gauge level line and well tint, carbon key marks, the "when" glyph in How It Works. `carbon-ink` is its lighter text tone for labels and titles on the ground; `carbon-deep` is the carbon end of the priority staff; `carbon-e-mark` is the deep teal for E-marks painted on the white staff, where the bright teal would wash out.
- **Water Blue** (`water`): water only, with the same family: `water-ink` for text, `water-deep` for the water end of the priority staff, `water-e-mark` for E-marks on the white staff.

### Tertiary
- **Baseline Amber** (`amber`): business-as-usual and overload marks only. The dashed baseline line on gauges, the BUSINESS AS USUAL tag (text in `amber-ink`), the naive board heading, overloaded bay border, warning hatch and warning text.

### Neutral
- **Wet Concrete** (`ground`): page ground. `ground-2` lifts boards and the ledger one step; `ground-deep` is the footer.
- **Poured Concrete** (`concrete`, `concrete-2`): sluice bays, cells in How It Works art, scrollbar thumb, the neutral centre of the priority staff.
- **Seam Lines** (`line`, `line-strong`): hairline borders, section dividers, table rules, gridlines. `line-strong` for interactive outlines and axis baselines.
- **Readable Greys** (`text`, `text-2`, `text-3`): body, secondary copy and captions, fine print and axis labels. `text-2` is also the stroke for the random-guessing baseline.
- **Faded Enamel** (`enamel-naive`): job plates on the business-as-usual board, one step duller than the GreenQ board.

### Named Rules
**The One Meaning Rule.** Teal is only ever carbon and blue is only ever water. Neither colour is used for brand, emphasis, links or state.

**The Amber Is the Old Way Rule.** Amber is reserved for business-as-usual and overload marks. It never marks a success, a highlight, or another baseline: random guessing is a neutral dashed `text-2` stroke, not amber.

**The Deep E Rule.** E-marks on the white enamel staff use the deep tones (`carbon-e-mark`, `water-e-mark`), never the bright `carbon`/`water`, so the ladder reads at a distance.

**The Plain Ground Rule.** The ground is neutral wet-concrete near-black with no decorative grid, noise, texture or gradient wash.

## Typography

**Display Font:** Big Shoulders Display (with Arial Narrow)
**Numeral Font:** Big Shoulders Stencil Display (with Big Shoulders Display, Arial Narrow)
**Body Font:** Atkinson Hyperlegible Next (with Segoe UI, system-ui)
**Label/Mono Font:** JetBrains Mono, for job IDs, backend names, file paths and the cost equation only

All four are self-hosted via @fontsource. Root size scales `clamp(16px, 0.5vw + 8.6px, 20px)` so the whole ramp grows on a projector. Body sets tabular numerals globally.

**Character:** Painted-infrastructure condensed caps doing the shouting, a sans designed for low-vision legibility doing the explaining.

### Hierarchy
- **Display** (800, clamp(3.4rem, 6.3vw, 6rem), 0.92, uppercase, max 12ch): the hero headline only, in enamel.
- **Numeral** (stencil 800, clamp(3.6rem, 6vw, 6rem), 0.95): headline savings readouts, coloured by quantity, with the unit in Display at 0.36em uppercase. The same face at smaller sizes paints gauge numerals (700), the saved-amount plate (800), level-bar values and step counters.
- **Headline** (800, clamp(2.6rem, 4.4vw, 4.6rem), 0.95, uppercase): section titles, in enamel.
- **Title** (700, 1.7rem, 1.05, uppercase, 0.02em): sub-panel titles, board titles, footer column heads (1.35rem).
- **Lede** (400, clamp(1.1rem, 1.3vw, 1.45rem), `text-2`, max 62ch): the one-paragraph read under each section title; key figures in bold enamel.
- **Body** (400, 1rem, 1.55): explanations, list items, captions.
- **Label** (700, ~1rem, 0.06em, uppercase): readout labels, segmented buttons, slider end labels, table headers (0.78rem, `text-3`), hardware badges (0.8rem, 0.08em).

### Named Rules
**The Stencil Is for Measurements Rule.** The stencil face sets numbers that were measured or computed (savings, gauge marks, percentages, step counts), plus the wordmark. Words in headings use the non-stencil display cut.

**The Mono Is Evidence Rule.** Mono appears only on identifiers a juror could look up: job IDs, backend names, file paths, the cost equation.

## Layout

Full-bleed sections with a fluid page gutter (`spacing.page`), separated by a single `line` hairline, vertical padding `spacing.section-y`. Grids use `minmax(0, …fr)` columns and the shared `spacing.gap`.

- **First viewport:** a two-column hero at `min-height: 100svh`, roughly 59/41 (1.18fr / 0.82fr). Left column stacks wordmark and team line, headline, lede, two savings readouts side by side, then the primary action and evidence status. Right column holds the two staff gauges at `min(76svh, 860px)` tall.
- **Sections:** a head (Headline + Lede, max 70rem; on the boards section the head goes side by side) then content. Boards are a 2-up pair; proof is 1.15fr / 0.85fr; How It Works is four equal steps each topped by a 6px enamel rule; footer is three columns over a team line.
- **Rhythm:** heavy top rules (6px for readouts and steps, 3px for honest-note items) start blocks instead of boxes. Bay grids use a tight 8px gap.
- **Breakpoints:** at 1100px the hero stacks (gauges below copy, 64svh), proof stacks, steps go 2-up, footer 2-up. At 760px everything goes single-column, gauges 52svh, the gauge tag shortens to AS USUAL, slider badges shorten, secondary bay metadata hides, segmented control stretches full width.

## Elevation & Depth

Mostly flat, with depth borrowed from concrete and enamel rather than floating cards. Surfaces step tonally (`ground` → `ground-2` → `concrete`) and are edged with hairlines. Sluice bays are *recessed* (an inner top shadow plus a faint top sheen); enamel job plates sit *on* them with a short drop shadow. Only the moved plate and the slider thumb lift further.

### Shadow Vocabulary
- **Bay recess** (`box-shadow: inset 0 10px 18px -12px rgba(0,0,0,0.8)`): every sluice bay.
- **Plate rest** (`box-shadow: 0 4px 10px rgba(0,0,0,0.45)`): job plates at rest.
- **Plate moved** (`box-shadow: 0 0 0 2px #fff, 0 8px 22px rgba(0,0,0,0.6)`): the job plate that changed bay.
- **Thumb lift** (`box-shadow: 0 6px 18px rgba(0,0,0,0.55), 0 0 0 1px #fff`): the priority slider thumb; on focus it becomes a double ring (`0 0 0 4px` ground, `0 0 0 7px` hot).

### Named Rules
**The Recess, Not Float Rule.** Containers are cut into the concrete (inset shadow, hairline), never lifted as glowing cards. Lift is reserved for enamel objects that move.

## Shapes

Engineering-plate geometry: near-square corners throughout. Panels, buttons and the ledger take 4px; bays, plates, badges and tags 2px; bars and swatches 1px. Thick straight rules (6px, 3px) open blocks instead of enclosing them. Recurring silhouettes are the tall staff plate with an alternating E-ladder, the 45° hatch, and the dashed baseline line.

### Named Rules
**The State Grammar Rule.** One encoding everywhere: **solid enamel** = real IBM hardware; **hatched** (45° enamel hatch with an enamel outline) = simulator or no hardware run; **dashed** = baseline (amber dash for business as usual, neutral `text-2` dash for random guessing). Every chart, slider tick, swatch and legend uses this grammar, and each view carries a legend for it.

## Components

### Buttons
Painted, plain, confident.
- **Shape:** gently squared (4px).
- **Primary:** enamel fill, near-black ink, Body 600 at 1.05rem, `1rem 1.4rem`, optional trailing 20px stroke icon.
- **Hover / Focus:** hover goes to hot white and nudges down 1px (0.25s, expo-out). Focus is the global 3px hot-white outline at 3px offset.
- **Ghost:** transparent with a `line-strong` border, 0.95rem; hover turns the border enamel. Used for secondary actions such as replay and simulator runs.
- **Disabled/busy:** 0.6 opacity, progress cursor.

### Segmented Control
- **Style:** a 4px-radius `line-strong` outline split by hairlines; uppercase Label type in `text-2`.
- **State:** the active segment fills enamel with near-black ink; hover lifts text to enamel. Goes full width on phones.

### Cards / Containers
- **Board:** `ground-2`, hairline border, 4px radius, fluid padding. Title colour signals the side: amber on business as usual, enamel on GreenQ.
- **Sluice bay:** `concrete` with a faint top sheen, hairline border, 2px radius, Bay recess shadow. **Overload:** amber border plus a 135° amber warning hatch at 12% and an amber note.
- **Ledger:** `ground-2` table panel, hairline border, 4px radius, uppercase `text-3` headers, right-aligned numerals, horizontal scroll under 62rem.

### Inputs / Fields
- **Priority slider:** a horizontal staff, 44px tall, gradient `water-deep` → `concrete-2` → `carbon-deep`, 2px radius. Stops are ticks: hardware stops are tall solid enamel (10×44px) with an enamel HARDWARE badge above; simulator stops are short hatched ticks; the selected simulator stop fills `text`. The thumb is a 30×64px hot-white blade with a 3px near-black border and Thumb lift shadow, scaling 1.06 vertically while dragged.

### Navigation
None. The page is a single linear story; the primary action scrolls to the boards.

### Staff Gauge (signature)
A tall SVG river staff: a dark stilling well, a white enamel plate with an alternating E-ladder in the deep quantity tone, stencil numerals on alternating sides with a ground-coloured halo, an amber dashed business-as-usual line and tag, and the quantity-coloured level line. The span between the two marks is hatched in the quantity colour and labelled with the saved amount on a dark plate outlined in that colour. On load the level draws down from the baseline (2.2s, 0.6s delay, `cubic-bezier(0.16, 1, 0.3, 1)`); later changes take 0.9s; reduced motion jumps to the settled value. The caption carries title, legend keys and the scale.

**The Not From Zero Rule.** The gauge window does not start at zero, so every gauge caption states its window and the words "not from zero" (e.g. "scale 3,000–3,800 kg, not from zero"). No gauge ships without it.

### Savings Readout
A 6px rule in the quantity colour, an uppercase label with its authored icon (molecule ring for carbon, drop for water, so the two differ by shape as well as colour), a stencil numeral with a display-cut unit, and a plain-text comparison line in `text`.

### Job Plate
An enamel plate with the job name (700), energy in kWh and an optional "from" line; width scales with job size (minimum 66%). It slides between bays with a spring (stiffness 140, damping 22) via shared layout; no motion under reduced motion.

### Evidence Levels
Horizontal bars on a quartered gridline track, labels in a 34% column, stencil values trailing the bar. Fills follow the State Grammar Rule.

## Do's and Don'ts

### Do:
- **Do** encode evidence with the State Grammar: solid enamel for real IBM hardware, hatched for simulator, dashed for baselines, with a legend in each view.
- **Do** keep teal for carbon and blue for water, and use the deep tones (`carbon-e-mark`, `water-e-mark`) for E-marks on the white staff.
- **Do** caption every gauge with its window and "not from zero".
- **Do** set measured numbers in the stencil face and identifiers in mono.
- **Do** open blocks with thick rules (6px or 3px) rather than boxing them.
- **Do** use `cubic-bezier(0.16, 1, 0.3, 1)` for transitions, with a readable settled state and a reduced-motion path.
- **Do** keep one hot-white accent per moment: focus, the thumb, or the plate that just moved.

### Don't:
- **Don't** use amber for anything but business-as-usual and overload; random guessing is a neutral dashed `text-2` stroke.
- **Don't** add a decorative grid, noise, texture or gradient wash to the ground.
- **Don't** build dark KPI tiles or charts in cards; readouts are bare numerals under a rule, charts are gauges, levels and ledgers.
- **Don't** use teal or blue for brand, links, emphasis or state.
- **Don't** start a gauge at zero silently or drop its caption.
- **Don't** use glyph or emoji icons; icons are authored 24px SVG strokes at one weight.
