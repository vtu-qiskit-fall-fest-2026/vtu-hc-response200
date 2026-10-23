"""Assemble a slim folder for deploying the demo on Vercel, then (optionally) deploy it.

    python scripts/build_vercel.py            # build deploy/vercel/greenq
    python scripts/build_vercel.py --deploy   # build, then  vercel deploy --prod  from there

Vercel serves the built React app (web/dist) as static files and runs the
FastAPI server (server/main.py) as one Python function for /api/*. The function
only needs Qiskit, SciPy, NumPy, FastAPI and httpx, so it gets its own small
requirements file; the full requirements.txt (Streamlit, Aer, IBM Runtime,
matplotlib...) is for local runs and is not deployed. No secrets are copied:
.env stays local. To turn on live AI answers, add GROQ_API_KEY in the Vercel
project settings (without it, saved answers and templates are used).
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "deploy" / "vercel" / "greenq"
PKGS = ["fastapi", "httpx", "python-dotenv", "numpy", "scipy", "qiskit"]


def pinned() -> list[str]:
    """Same versions as requirements.txt, only the packages the server imports."""
    lines = (ROOT / "requirements.txt").read_text().splitlines()
    out = []
    for p in PKGS:
        m = next((l.split("#")[0].strip() for l in lines if re.match(rf"^{re.escape(p)}==", l.strip(), re.I)), None)
        out.append(m or p)
    return out


def build() -> None:
    dist = ROOT / "web" / "dist"
    if not (dist / "index.html").exists():
        subprocess.run(["npm", "run", "build"], cwd=ROOT / "web", check=True)
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "api").mkdir(parents=True)
    shutil.copytree(dist, OUT / "public")
    for d in ("server", "greenq"):
        shutil.copytree(ROOT / d, OUT / d, ignore=shutil.ignore_patterns("__pycache__"))
    (OUT / "results").mkdir()
    for f in ("ui_data.json", "llm_cache.json"):
        if (ROOT / "results" / f).exists():
            shutil.copy(ROOT / "results" / f, OUT / "results" / f)
    (OUT / "docs" / "demo").mkdir(parents=True)
    shutil.copy(ROOT / "docs" / "demo" / "timeline.json", OUT / "docs" / "demo" / "timeline.json")
    (OUT / "api" / "index.py").write_text(
        '"""Vercel entry point: the GreenQ FastAPI app (server/main.py) for /api/*."""\n'
        "import sys\nfrom pathlib import Path\n\n"
        "sys.path.insert(0, str(Path(__file__).resolve().parents[1]))\n\n"
        "from urllib.parse import parse_qs  # noqa: E402\n\n"
        "from server.main import app as _app  # noqa: E402\n\n\n"
        "async def app(scope, receive, send):\n"
        "    # vercel.json rewrites /api/<x> to /api/index?__path=/api/<x>; give FastAPI the original path\n"
        "    if scope.get(\"type\") == \"http\":\n"
        "        q = parse_qs(scope.get(\"query_string\", b\"\").decode())\n"
        "        if \"__path\" in q:\n"
        "            path = q.pop(\"__path\")[0]\n"
        "            rest = \"&\".join(f\"{k}={v}\" for k, vs in q.items() for v in vs)\n"
        "            scope = dict(scope, path=path, raw_path=path.encode(), query_string=rest.encode())\n"
        "    await _app(scope, receive, send)\n"
    )
    (OUT / "requirements.txt").write_text("\n".join(pinned()) + "\n")
    (OUT / ".python-version").write_text("3.12\n")
    (OUT / "vercel.json").write_text(json.dumps({
        "rewrites": [{"source": "/api/(.*)", "destination": "/api/index?__path=/api/$1"}],
        "functions": {"api/index.py": {
            "maxDuration": 60,
            "memory": 2048,
            "includeFiles": "{server,greenq,results,docs}/**",
        }},
    }, indent=2) + "\n")
    (OUT / ".vercelignore").write_text(".env\n**/__pycache__\n")
    print(f"Built {OUT.relative_to(ROOT)}  (requirements: {', '.join(pinned())})")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--deploy", action="store_true", help="run  vercel deploy --prod  after building")
    args = ap.parse_args()
    build()
    if args.deploy:
        vercel = shutil.which("vercel")
        if not vercel:
            sys.exit("Vercel CLI not found: npm i -g vercel, then vercel login")
        return subprocess.run([vercel, "deploy", "--prod", "--yes"], cwd=OUT).returncode
    return 0


if __name__ == "__main__":
    sys.exit(main())
