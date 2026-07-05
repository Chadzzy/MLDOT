"""Mock TTS backend — streams a tiny valid silent MP3.

Enough for the client to receive audio/mpeg bytes and for tests to assert a
non-empty MP3 body without any network or model. The payload is a handful of
MPEG-1 Layer III silent frames.
"""

from __future__ import annotations

from typing import AsyncIterator

# MPEG-1 Layer III, 128 kbps, 44.1 kHz, mono. Frame length = 144*128000/44100 = 417 bytes.
# Header 0xFFFB9040 + zero-filled payload = a valid (silent) frame.
_FRAME_HEADER = b"\xff\xfb\x90\x40"
_FRAME = _FRAME_HEADER + b"\x00" * (417 - len(_FRAME_HEADER))
MOCK_MP3 = _FRAME * 10  # ~0.26 s of silence


async def synthesize(
    text: str, lang: str, voice: str | None = None
) -> AsyncIterator[bytes]:
    # Stream in a couple of chunks to exercise the streaming path.
    half = len(MOCK_MP3) // 2
    yield MOCK_MP3[:half]
    yield MOCK_MP3[half:]
