#!/usr/bin/env python3
"""Measure per-stage SikLo pipeline latency against a running server.

Hits /api/stt (with a fixture wav), /api/translate (SSE) and /api/tts N times
and reports p50/p95 for each stage, then the summed speech-to-first-audio
estimate against the Tier B budget (plan §3: STT ≤ 1.2 s, MT first-token ≤
0.6 s, TTS first-audio ≤ 0.8 s → ~2.5-3.5 s end to end).

What each stage times (client-side wall clock, so it includes the network hop —
run it from the phone's network for a true on-device figure):
  stt                 full request (multipart upload → {text,lang} JSON)
  translate_first_tok request → first `event: token` frame (the "Translating…"
                      indicator can clear here)
  tts_first_audio     request → first audio byte (playback can start here)

Usage:
    cd siklo-server
    uvicorn app.main:app &                 # or a real Tier B server
    python scripts/measure_latency.py --url http://localhost:8000 -n 20

Works against mock mode (fast, no weights) for a smoke test of the harness; the
real numbers come from pointing --url at a Tier B GPU server.
"""

from __future__ import annotations

import argparse
import math
import struct
import sys
import time
import wave
from pathlib import Path

import httpx

BUDGET_S = {"stt": 1.2, "translate_first_tok": 0.6, "tts_first_audio": 0.8}
PIPELINE_BUDGET_S = 3.5


def _make_tone_wav(path: Path) -> None:
    sr, dur, freq = 16000, 1.0, 440.0
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        frames = bytearray()
        for i in range(int(sr * dur)):
            frames += struct.pack(
                "<h", int(0.3 * 32767 * math.sin(2 * math.pi * freq * i / sr))
            )
        w.writeframes(bytes(frames))


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return float("nan")
    s = sorted(values)
    k = (len(s) - 1) * (pct / 100.0)
    lo = math.floor(k)
    hi = math.ceil(k)
    if lo == hi:
        return s[int(k)]
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def time_stt(client: httpx.Client, url: str, wav: bytes) -> float:
    t0 = time.perf_counter()
    r = client.post(
        f"{url}/api/stt",
        files={"audio": ("tone.wav", wav, "audio/wav")},
    )
    r.raise_for_status()
    return time.perf_counter() - t0


def time_translate_first_token(client: httpx.Client, url: str) -> float:
    t0 = time.perf_counter()
    with client.stream(
        "POST",
        f"{url}/api/translate",
        json={"text": "Hello, how are you?", "source": "en", "target": "yue"},
    ) as r:
        r.raise_for_status()
        for line in r.iter_lines():
            if line.startswith("event: token") or line.startswith("event:token"):
                return time.perf_counter() - t0
    # No token frame (error/empty) — treat as full-stream time.
    return time.perf_counter() - t0


def time_tts_first_audio(client: httpx.Client, url: str) -> float:
    t0 = time.perf_counter()
    with client.stream(
        "POST",
        f"{url}/api/tts",
        json={"text": "你好，唔該", "lang": "yue"},
    ) as r:
        r.raise_for_status()
        for chunk in r.iter_bytes():
            if chunk:
                return time.perf_counter() - t0
    return time.perf_counter() - t0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("-n", "--iterations", type=int, default=20)
    ap.add_argument(
        "--fixture",
        default=str(
            Path(__file__).resolve().parent.parent
            / "app" / "tests" / "fixtures" / "tone.wav"
        ),
        help="wav uploaded to /api/stt (auto-generated if missing)",
    )
    ap.add_argument("--warmup", type=int, default=1,
                    help="untimed warmup iterations (load lazy models first)")
    args = ap.parse_args()

    fixture = Path(args.fixture)
    if not fixture.exists():
        _make_tone_wav(fixture)
    wav = fixture.read_bytes()

    url = args.url.rstrip("/")
    stages = {
        "stt": lambda c: time_stt(c, url, wav),
        "translate_first_tok": lambda c: time_translate_first_token(c, url),
        "tts_first_audio": lambda c: time_tts_first_audio(c, url),
    }

    print(f"Server : {url}")
    try:
        with httpx.Client(timeout=60.0) as c:
            h = c.get(f"{url}/healthz")
            h.raise_for_status()
            print(f"Backends: {h.json().get('backends')}")
    except Exception as e:
        print(f"ERROR: cannot reach {url}/healthz — is the server running? ({e})")
        return 1

    samples: dict[str, list[float]] = {k: [] for k in stages}
    with httpx.Client(timeout=60.0) as c:
        # Warmup (untimed) so first-request lazy model loads don't skew p50/p95.
        for _ in range(max(0, args.warmup)):
            for fn in stages.values():
                try:
                    fn(c)
                except Exception:
                    pass
        for i in range(args.iterations):
            for name, fn in stages.items():
                try:
                    samples[name].append(fn(c))
                except Exception as e:
                    print(f"  [{i}] {name}: request failed: {e}")

    print(f"\nIterations: {args.iterations} (after {args.warmup} warmup)\n")
    header = f"{'stage':<22}{'p50 (ms)':>12}{'p95 (ms)':>12}{'budget':>10}{'':>8}"
    print(header)
    print("-" * len(header))
    p50s = {}
    for name in stages:
        vals = samples[name]
        p50 = _percentile(vals, 50) * 1000
        p95 = _percentile(vals, 95) * 1000
        p50s[name] = p50 / 1000
        budget = BUDGET_S.get(name)
        budget_ms = f"{budget * 1000:.0f}" if budget else "-"
        flag = ""
        if budget is not None and not math.isnan(p95):
            flag = "OK" if p95 <= budget * 1000 else "OVER"
        print(f"{name:<22}{p50:>12.1f}{p95:>12.1f}{budget_ms:>10}{flag:>8}")

    pipeline = sum(p50s.get(k, 0.0) for k in BUDGET_S)
    print("-" * len(header))
    print(
        f"\nSpeech → first-audio (summed p50): {pipeline * 1000:.0f} ms  "
        f"vs budget {PIPELINE_BUDGET_S * 1000:.0f} ms  "
        f"[{'WITHIN' if pipeline <= PIPELINE_BUDGET_S else 'OVER'} BUDGET]"
    )
    print(
        "\nNote: mock backends report harness overhead only. For the real "
        "budget check, point --url at a Tier B GPU server and run this from the "
        "phone's network."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
