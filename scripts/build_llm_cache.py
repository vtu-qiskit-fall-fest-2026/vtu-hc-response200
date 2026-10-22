"""Pre-generate the AI explanations the demo shows, so it works offline.

    python scripts/build_llm_cache.py

Needs GROQ_API_KEY in .env (optional: LLM_BASE_URL, LLM_MODEL). Writes
results/llm_cache.json with "why this schedule" lines for the 3 hardware stops
x 3 job-rule presets, answers to the 5 example questions for the same 9
settings, and the story captions. Every sentence passes the same number check
as live answers (server/llm.py: ground). Takes about two minutes because it
paces requests for the free tier.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server import llm  # noqa: E402


def main() -> None:
    data = json.loads((ROOT / "results" / "ui_data.json").read_text())
    if llm.config() is None:
        sys.exit("No GROQ_API_KEY in .env, so there is nothing to generate. The demo still works: it falls back to templates.")
    print(f"Generating with {llm.config()['model']} ...", flush=True)
    cache = llm.build_cache(data)
    out = llm.CACHE_FILE
    out.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {out.relative_to(ROOT)}: {len(cache['explain'])} explanations, {len(cache['ask'])} answers, "
          f"{len(cache['narration'])} captions.")


if __name__ == "__main__":
    main()
