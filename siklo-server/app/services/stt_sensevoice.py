"""SenseVoice-Small STT backend (FunAudioLLM/SenseVoice-Small via funasr).

Lazy-loaded singleton: the model is imported and loaded on the FIRST request,
never at process start, so the app boots without weights. funasr + torch are
NOT in the core requirements.txt (they are heavy); install them for Tier A via
``requirements-tier-a.txt``. A clear error surfaces if the deps are missing.

NOTE: model weights are downloaded by funasr on first load. Do NOT trigger this
in CI / sandboxes without network + disk budget — use STT_BACKEND=mock there.
"""

from __future__ import annotations

import re
import threading

from ..config import get_settings
from . import audio

_model = None
_lock = threading.Lock()

# SenseVoice emits rich-text tags like <|yue|><|NEUTRAL|><|Speech|>...
_LANG_TAG = re.compile(r"<\|(zh|yue|cmn|en|ja|ko|nospeech)\|>")
_TAG = re.compile(r"<\|[^|]*\|>")


def _get_model():
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                try:
                    from funasr import AutoModel
                except ImportError as e:  # pragma: no cover - optional dep
                    raise RuntimeError(
                        "funasr is not installed. Install Tier A deps "
                        "(pip install -r requirements-tier-a.txt) to use "
                        "STT_BACKEND=sensevoice, or set STT_BACKEND=mock."
                    ) from e
                s = get_settings()
                _model = AutoModel(
                    model=s.SENSEVOICE_MODEL,
                    device=s.SENSEVOICE_DEVICE,
                    disable_update=True,
                )
    return _model


def _map_lang(raw: str) -> str:
    """Map SenseVoice language tags to SikLo's {en, yue, cmn}."""
    m = _LANG_TAG.search(raw)
    tag = m.group(1) if m else ""
    if tag == "yue":
        return "yue"
    if tag in ("zh", "cmn"):
        return "cmn"
    if tag == "en":
        return "en"
    return "cmn"  # sensible default for un-tagged Chinese


def transcribe(audio_bytes: bytes, filename: str = "") -> dict:
    model = _get_model()

    # Normalize to 16 kHz mono wav for the model.
    wav = audio.decode_to_wav(audio_bytes)

    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "audio.wav"
        p.write_bytes(wav)
        res = model.generate(
            input=str(p),
            cache={},
            language="auto",
            use_itn=True,
        )

    raw = res[0]["text"] if res else ""
    lang = _map_lang(raw)
    text = _TAG.sub("", raw).strip()
    # SenseVoice does not expose a scalar confidence; report a fixed high value.
    return {"text": text, "lang": lang, "confidence": 0.9}
