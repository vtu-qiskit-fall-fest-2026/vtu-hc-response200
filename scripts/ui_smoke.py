"""Browser smoke test for the demo UI (optional; needs Playwright).

    pip install playwright && python -m playwright install chromium
    python -m server            # in another terminal
    python scripts/ui_smoke.py

Checks: no console errors on first load; the hero's savings equal
results/ui_data.json; no screen scrolls or overflows at 1920x1080 or 1366x768;
the Full demo (Short preset) plays to the end without console errors; under
reduced motion the hero and Dewy hold still (two frames are identical).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
DATA = json.loads((ROOT / "results" / "ui_data.json").read_text())
MID = next(s for s in DATA["sweep"] if s["w"] == 0.5)

OVERFLOW = """() => { const m = document.querySelector('main'); const mr = m.getBoundingClientRect(); let n = 0;
  for (const el of document.querySelectorAll('main [data-widget] *')) { const r = el.getBoundingClientRect();
    if (r.width && (r.bottom > mr.bottom + 1 || r.right > mr.right + 1)) n++; }
  return { scroll: m.scrollHeight - m.clientHeight, overflow: n }; }"""


def main() -> int:
    bad: list[str] = []
    with sync_playwright() as p:
        try:
            b = p.chromium.launch()
        except Exception:  # no bundled Chromium: use the installed Chrome
            b = p.chromium.launch(channel="chrome")
        for w, h in [(1920, 1080), (1366, 768)]:
            pg = b.new_page(viewport={"width": w, "height": h})
            errs: list[str] = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.goto(URL, wait_until="networkidle")
            pg.evaluate("localStorage.clear()")
            pg.reload(wait_until="networkidle")
            pg.mouse.move(5, h - 5)
            pg.wait_for_timeout(14000)  # hero reaches the savings phase
            text = pg.locator("main svg[role=img]").first.text_content() or ""
            for v in (MID["saved_kg_co2"], MID["saved_litres"]):
                if f"{round(v):,}" not in text:
                    bad.append(f"{w}: hero does not show {round(v):,}")
            for k in "123456":
                pg.keyboard.press(k)
                pg.wait_for_timeout(1500)
                r = pg.evaluate(OVERFLOW)
                if r["scroll"] > 0 or r["overflow"] > 0:
                    bad.append(f"{w}x{h} screen {k}: {r}")
            bad += [f"{w}: console: {e}" for e in errs]
            pg.close()
        # the Full demo (Short preset) plays through on the real app without errors
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(URL + "/?record=1&demo=short", wait_until="networkidle")
        total = json.loads((ROOT / "docs" / "demo" / "timeline.json").read_text())["presets"]["short"]["total"]
        try:
            pg.wait_for_function("window.__greenqDemo && window.__greenqDemo.done === true", timeout=int((total + 30) * 1000), polling=1000)
        except Exception:  # noqa: BLE001
            bad.append("Full demo (short) did not finish")
        bad += [f"demo: console: {e}" for e in errs]
        pg.close()
        ctx = b.new_context(viewport={"width": 1920, "height": 1080}, reduced_motion="reduce")
        pg = ctx.new_page()
        pg.goto(URL, wait_until="networkidle")
        pg.keyboard.press("1")
        pg.wait_for_timeout(1500)
        a = pg.screenshot()
        pg.wait_for_timeout(2500)
        if a != pg.screenshot():
            bad.append("reduced motion: the Start screen still moves")
        b.close()
    print("\n".join(bad) if bad else "UI smoke test passed")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
