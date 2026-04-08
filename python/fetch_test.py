"""
Dev helper: run a tiny BizBuySell crawl (same as CLI).

  cd python && source venv/bin/activate
  playwright install firefox
  python fetch_test.py

Or: scrapy crawl bizbuysell -s CLOSESPIDER_ITEMCOUNT=5 -o output/sample.json
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    cmd = [
        sys.executable,
        "-m",
        "scrapy",
        "crawl",
        "bizbuysell",
        "-s",
        "CLOSESPIDER_ITEMCOUNT=5",
        "-o",
        str(ROOT / "output" / "sample.json"),
    ]
    raise SystemExit(subprocess.call(cmd, cwd=ROOT))


if __name__ == "__main__":
    main()
