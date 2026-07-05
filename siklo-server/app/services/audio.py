"""Audio decoding helpers.

Phones record m4a/aac (expo-audio); the web prototype may send webm/wav. We
normalize any input to 16 kHz mono 16-bit PCM WAV for the STT model using
ffmpeg. ffmpeg is invoked as a subprocess so we don't hard-depend on a python
binding; ``ffmpeg-python`` is listed as a convenience but not required here.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from ..config import get_settings


def ffmpeg_available() -> bool:
    return shutil.which(get_settings().FFMPEG_BIN) is not None


def decode_to_wav(data: bytes, sample_rate: int | None = None) -> bytes:
    """Decode arbitrary audio bytes to mono PCM WAV at ``sample_rate`` (Hz).

    Raises RuntimeError with a clear message if ffmpeg is unavailable or fails.
    """
    settings = get_settings()
    sr = sample_rate or settings.TARGET_SAMPLE_RATE

    if not ffmpeg_available():
        raise RuntimeError(
            f"ffmpeg ('{settings.FFMPEG_BIN}') not found on PATH; install ffmpeg "
            "to decode uploaded audio (Tier A: `apt-get install ffmpeg`)."
        )

    # Use temp files: ffmpeg's stdin/stdout piping is finicky for some
    # container formats (m4a needs a seekable input).
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "in"
        dst = Path(tmp) / "out.wav"
        src.write_bytes(data)
        cmd = [
            settings.FFMPEG_BIN,
            "-hide_banner",
            "-loglevel", "error",
            "-y",
            "-i", str(src),
            "-ac", "1",
            "-ar", str(sr),
            "-f", "wav",
            "-acodec", "pcm_s16le",
            str(dst),
        ]
        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0:
            raise RuntimeError(
                "ffmpeg failed to decode audio: "
                + proc.stderr.decode("utf-8", "ignore").strip()
            )
        return dst.read_bytes()
