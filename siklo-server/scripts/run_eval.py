#!/usr/bin/env python3
"""Run the Cantonese MT eval set through the configured MT backend.

Usage:
    cd siklo-server
    MT_BACKEND=qwen OLLAMA_URL=http://localhost:11434 MT_MODEL=qwen3:8b \
        python scripts/run_eval.py

Prints a table of English -> model output vs. the colloquial reference. This is
a qualitative harness (no automatic scoring): eyeball whether the output is
真 colloquial Cantonese (口語) and Traditional. Falls back gracefully with an
explanatory message if the backend/Ollama is unreachable.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# Make ``app`` importable when run from the repo root or siklo-server/.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402

EVAL_PATH = ROOT / "app" / "data" / "eval" / "cantonese_eval.jsonl"


def load_eval() -> list[dict]:
    rows = []
    with open(EVAL_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def get_backend():
    if get_settings().MT_BACKEND == "qwen":
        from app.services import mt_qwen

        return mt_qwen
    from app.services import mt_mock

    return mt_mock


async def translate_one(backend, text: str) -> dict:
    result = {}
    async for ev in backend.stream_translate(text, "en", "yue"):
        if ev["type"] == "done":
            result = ev["result"]
    return result


async def main() -> int:
    settings = get_settings()
    rows = load_eval()
    backend = get_backend()

    print(f"MT_BACKEND={settings.MT_BACKEND}  MODEL={settings.MT_MODEL}  "
          f"URL={settings.OLLAMA_URL}")
    print(f"Eval set: {len(rows)} sentences\n")

    if settings.MT_BACKEND == "mock":
        print("NOTE: running against the MOCK backend — output is canned, not a "
              "real translation. Set MT_BACKEND=qwen with Ollama/vLLM running for "
              "a real eval.\n")

    ok = 0
    for i, row in enumerate(rows, 1):
        try:
            res = await translate_one(backend, row["en"])
        except Exception as e:  # network / backend down
            print(f"[{i:2}] ERROR: {e}")
            if i == 1 and settings.MT_BACKEND == "qwen":
                print("\nCould not reach the MT backend. Is Ollama running and "
                      f"the model '{settings.MT_MODEL}' pulled? "
                      f"(OLLAMA_URL={settings.OLLAMA_URL})")
                return 1
            continue
        ok += 1
        print(f"[{i:2}] EN   : {row['en']}")
        print(f"     REF  : {row['yue_reference']}")
        print(f"     MODEL: {res.get('translation','')}")
        print(f"     JYUT : {res.get('romanization','')}")
        print(f"     NOTE : {res.get('register_note','')}")
        print()

    print(f"Completed {ok}/{len(rows)} sentences.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
