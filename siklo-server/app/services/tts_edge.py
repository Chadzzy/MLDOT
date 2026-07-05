"""edge-tts backend — free Microsoft Edge neural voices, no API key.

Async streaming of MP3 audio. Voices per plan §2:
  yue -> zh-HK-HiuGaaiNeural   (configurable via EDGE_VOICE_YUE)
  cmn -> zh-CN-XiaoxiaoNeural  (configurable via EDGE_VOICE_CMN)

edge-tts reaches Microsoft's servers over the network; if that is blocked the
generator raises a clear RuntimeError which the router surfaces to the client.
"""

from __future__ import annotations

from typing import AsyncIterator

from ..config import get_settings


def voice_for(lang: str, override: str | None = None) -> str:
    if override:
        return override
    s = get_settings()
    if lang == "yue":
        return s.EDGE_VOICE_YUE
    if lang == "cmn":
        return s.EDGE_VOICE_CMN
    raise ValueError(f"Unsupported TTS lang '{lang}' (expected 'yue' or 'cmn').")


async def synthesize(
    text: str, lang: str, voice: str | None = None
) -> AsyncIterator[bytes]:
    try:
        import edge_tts
    except ImportError as e:  # pragma: no cover - optional dep
        raise RuntimeError(
            "edge-tts is not installed. `pip install edge-tts` or set "
            "TTS_BACKEND=mock."
        ) from e

    v = voice_for(lang, voice)
    try:
        communicate = edge_tts.Communicate(text, v)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]
    except Exception as e:  # network blocked, voice rejected, etc.
        raise RuntimeError(
            f"edge-tts synthesis failed (network to Microsoft may be blocked): {e}"
        ) from e
