"""Render a modernized app's start screen headlessly with the installed Chrome.

The runtime supports `?shot=1`: it draws only the start screen at (0,0), with no page chrome, at the
program's native size, and does not run start-up scripts that wait for the user.

Usage: python eval/render.py <app_dir> <out.png> [width height]
"""
import subprocess
import sys
import tempfile
from pathlib import Path

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]


def chrome() -> str:
    for c in CHROME_CANDIDATES:
        if Path(c).exists():
            return c
    raise SystemExit("No Chrome or Edge found")


def render(app_dir: Path, out: Path, width: int = 512, height: int = 342) -> Path:
    url = (app_dir.resolve() / "index.html").as_uri() + "?shot=1"
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([
            chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--force-device-scale-factor=1", f"--user-data-dir={profile}",
            "--allow-file-access-from-files", "--virtual-time-budget=3000",
            f"--window-size={width},{height}", f"--screenshot={out.resolve()}", url,
        ], check=True, capture_output=True, timeout=120)
    return out


if __name__ == "__main__":
    w, h = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (512, 342)
    print(render(Path(sys.argv[1]), Path(sys.argv[2]), w, h))
