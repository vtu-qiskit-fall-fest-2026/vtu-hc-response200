"""One command to start the GreenQ demo:  python -m server

Builds the React frontend first if web/dist is missing (needs Node.js 20+),
exports results/ui_data.json if missing, then serves on http://127.0.0.1:8000
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def build_frontend(force: bool) -> None:
    if (WEB / "dist" / "index.html").exists() and not force:
        return
    npm = shutil.which("npm")
    if npm is None:
        sys.exit("web/dist is missing and Node.js (npm) was not found. Install Node.js 20+ "
                 "from https://nodejs.org and run  python -m server  again.")
    print("Building the frontend (first run only)...", flush=True)
    if not (WEB / "node_modules").exists():
        subprocess.run([npm, "ci", "--no-audit", "--no-fund"], cwd=WEB, check=True)
    subprocess.run([npm, "run", "build"], cwd=WEB, check=True)


def main() -> None:
    ap = argparse.ArgumentParser(description="Start the GreenQ demo")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--rebuild", action="store_true", help="rebuild the frontend even if it exists")
    args = ap.parse_args()

    build_frontend(args.rebuild)
    if not (ROOT / "results" / "ui_data.json").exists():
        subprocess.run([sys.executable, str(ROOT / "scripts" / "export_ui_data.py")], check=True)

    import uvicorn

    print(f"\n  GreenQ demo running at  http://{args.host}:{args.port}\n  (Ctrl+C to stop)\n", flush=True)
    uvicorn.run("server.main:app", host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
