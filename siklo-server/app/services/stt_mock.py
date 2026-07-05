"""Mock STT backend — returns a canned result, no audio processing.

Keeps tests hermetic and lets the whole pipeline run without weights.
"""

from __future__ import annotations


def transcribe(_audio: bytes, filename: str = "") -> dict:
    return {
        "text": "你好，唔該幫我翻譯呢句嘢。",
        "lang": "yue",
        "confidence": 0.97,
    }
