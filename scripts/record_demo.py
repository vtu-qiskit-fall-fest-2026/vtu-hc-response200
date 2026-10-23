"""Record the automated demo as a video (no audio), ready for a voice-over.

    pip install playwright            # once (Chrome or Playwright's Chromium is used)
    python scripts/record_demo.py --preset standard
    python scripts/record_demo.py --preset short --no-captions

Starts the server if it isn't running, opens the app in record mode
(?record=1: no player bar, no mouse pointer) at 1920x1080, plays the chosen
preset once and writes results/demo/greenq_demo_<preset>.webm (and .mp4 when
ffmpeg is installed). It then checks that the video length matches the
timeline within one second and reports dropped frames. The narration files
for the voice-over are in docs/demo/ (python scripts/build_demo.py).
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "results" / "demo"


def server_up(url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/api/health", timeout=2) as r:
            return r.status == 200
    except OSError:
        return False


def ensure_server(url: str):
    if server_up(url):
        return None
    print("Starting the server...", flush=True)
    proc = subprocess.Popen([sys.executable, "-m", "server"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(120):
        if server_up(url):
            return proc
        time.sleep(1)
    proc.terminate()
    sys.exit("The server did not start. Run  python -m server  and check the output.")


def probe(path: Path) -> tuple[float, int]:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return -1.0, -1
    dur = subprocess.run([ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout.strip()
    frames = subprocess.run([ffprobe, "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                             "stream=nb_read_frames", "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout.strip()
    return float(dur or -1), int(frames or -1)


def main() -> int:
    ap = argparse.ArgumentParser(description="Record the GreenQ Full demo")
    ap.add_argument("--preset", choices=["standard", "short"], default="standard")
    ap.add_argument("--no-captions", action="store_true", help="record without on-screen subtitles")
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    timeline = json.loads((ROOT / "docs" / "demo" / "timeline.json").read_text())
    total = timeline["presets"][args.preset]["total"]
    OUT.mkdir(parents=True, exist_ok=True)
    proc = ensure_server(args.url)
    tmp = Path(tempfile.mkdtemp(prefix="greenq_rec_"))
    try:
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch()
            except Exception:  # no bundled Chromium: use the installed Chrome
                browser = p.chromium.launch(channel="chrome")
            ctx = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1,
                                      record_video_dir=str(tmp), record_video_size={"width": 1920, "height": 1080})
            created = time.time()
            page = ctx.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            q = f"?record=1&demo={args.preset}" + ("&captions=0" if args.no_captions else "")
            page.goto(args.url + "/" + q, wait_until="networkidle")
            page.mouse.move(1, 1)
            page.wait_for_function("window.__greenqDemo && window.__greenqDemo.started > 0", timeout=20000)
            started_epoch = page.evaluate("(performance.timeOrigin + window.__greenqDemo.started) / 1000")
            print(f"Recording the {args.preset} demo ({total:.0f} s)...", flush=True)
            page.wait_for_function("window.__greenqDemo.done === true", timeout=int((total + 60) * 1000), polling=500)
            page.wait_for_timeout(800)
            video = page.video
            ctx.close()
            browser.close()
            raw = Path(video.path())
        offset = max(0.0, started_epoch - created)
        webm = OUT / f"greenq_demo_{args.preset}{'_nocaptions' if args.no_captions else ''}.webm"
        ffmpeg = shutil.which("ffmpeg")
        if ffmpeg:
            subprocess.run([ffmpeg, "-loglevel", "error", "-y", "-ss", f"{offset:.3f}", "-i", str(raw), "-t", f"{total:.3f}",
                            "-c:v", "libvpx-vp9", "-b:v", "3M", "-deadline", "good", "-cpu-used", "5", "-row-mt", "1", "-an", str(webm)], check=True)
            mp4 = webm.with_suffix(".mp4")
            subprocess.run([ffmpeg, "-loglevel", "error", "-y", "-i", str(webm), "-c:v", "libx264", "-pix_fmt", "yuv420p",
                            "-crf", "18", "-r", "30", "-an", str(mp4)], check=True)
        else:
            shutil.copy(raw, webm)
            print("ffmpeg not found: the video is untrimmed (it starts at page load).")
        dur, frames = probe(webm)
        ok = True
        if dur > 0:
            print(f"Video length {dur:.2f} s; timeline {total:.2f} s.")
            if abs(dur - total) > 1.0:
                print("WARNING: length differs from the timeline by more than 1 s.")
                ok = False
            fps = frames / dur if dur > 0 and frames > 0 else 0
            print(f"Frames: {frames} (about {fps:.1f} fps; Playwright records about 25 fps).")
            if fps and fps < 20:
                print("WARNING: low frame rate: frames were dropped. Close other apps and record again.")
                ok = False
        if errors:
            print("Console errors during the demo:", *errors[:5], sep="\n  ")
            ok = False
        print("Wrote", webm.relative_to(ROOT), "and .mp4" if ffmpeg else "")
        print("Voice-over script and subtitles: docs/demo/narration_%s.txt / .srt / .vtt" % args.preset)
        return 0 if ok else 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        if proc:
            proc.terminate()


if __name__ == "__main__":
    sys.exit(main())
