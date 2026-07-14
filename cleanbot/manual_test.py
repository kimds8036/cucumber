import json
import sys
from pathlib import Path

import httpx

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).parent
URI = "http://localhost:8001/clean"
OUT_FILE = ROOT / "results3.txt"
CASES_FILE = ROOT / "manual_test_cases.json"

tests = json.loads(CASES_FILE.read_text(encoding="utf-8-sig"))

results = []
for text in tests:
    r = httpx.post(
        URI,
        json={"text": text},
        timeout=10.0,
    )
    r.raise_for_status()
    results.append(r.json())

with open(OUT_FILE, "w", encoding="utf-8") as f:
    for r in results:
        f.write(json.dumps(r, ensure_ascii=False, indent=2))
        f.write("\n\n")

print(f"완료. {OUT_FILE.name} 확인하세요.")
