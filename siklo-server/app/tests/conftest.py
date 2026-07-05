"""Test fixtures. Forces mock backends so the suite runs anywhere."""

import math
import os
import struct
import wave
from pathlib import Path

import pytest

# Ensure mock backends regardless of any .env on the machine.
os.environ.setdefault("STT_BACKEND", "mock")
os.environ.setdefault("MT_BACKEND", "mock")
os.environ.setdefault("TTS_BACKEND", "mock")

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def _ensure_tone_wav() -> Path:
    p = FIXTURES / "tone.wav"
    if p.exists():
        return p
    FIXTURES.mkdir(parents=True, exist_ok=True)
    sr, dur, freq = 16000, 1.0, 440.0
    with wave.open(str(p), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        frames = bytearray()
        for i in range(int(sr * dur)):
            v = int(0.3 * 32767 * math.sin(2 * math.pi * freq * i / sr))
            frames += struct.pack("<h", v)
        w.writeframes(bytes(frames))
    return p


@pytest.fixture(scope="session")
def tone_wav() -> Path:
    return _ensure_tone_wav()


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    return TestClient(app)
