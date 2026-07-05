"""Qwen3-ASR STT backend (Qwen/Qwen3-ASR-1.7B via transformers).

Tier B primary STT (plan §2): multilingual (52 langs incl. Cantonese/Mandarin/
English) with built-in language identification. License is **Apache-2.0** (see
the model card + README), so there is no distribution restriction — SenseVoice
remains the Tier A / CPU default only for weight-size reasons, not licensing.

Lazy-loaded singleton, mirroring stt_sensevoice.py: transformers + torch are
NOT in requirements.txt (they are heavy, GPU-oriented); install them for Tier B
via ``requirements-tier-b.txt``. A clear RuntimeError surfaces if they are
missing. Heavy imports live inside ``_get_model``/``transcribe`` so importing
this module needs no torch.

Usage API (from the Qwen3-ASR-1.7B model card / -hf transformers variant):

    from transformers import AutoProcessor, AutoModelForMultimodalLM
    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForMultimodalLM.from_pretrained(model_id, device_map="auto")
    inputs = processor.apply_transcription_request(audio=..., language=None)
    inputs = inputs.to(model.device, model.dtype)
    out = model.generate(**inputs, max_new_tokens=256)
    gen = out[:, inputs["input_ids"].shape[1]:]
    processor.decode(gen, return_format="parsed")  # -> {language, transcription}

``language=None`` asks the model to auto-detect (returned in the parsed output),
which is exactly what the Talk screen needs — it never asks which language was
spoken.

NOTE: weights (~3.5 GB) are downloaded by transformers on first load. Do NOT
trigger this in CI / sandboxes without network + disk + GPU budget — use
STT_BACKEND=mock there.
"""

from __future__ import annotations

import tempfile
import threading
from pathlib import Path

from ..config import get_settings
from . import audio

_model = None
_processor = None
_lock = threading.Lock()


def _load():
    """Import transformers/torch and load the model+processor once."""
    global _model, _processor
    if _model is not None:
        return _model, _processor
    with _lock:
        if _model is None:
            try:
                import torch  # noqa: F401
                from transformers import AutoProcessor
            except ImportError as e:  # pragma: no cover - optional dep
                raise RuntimeError(
                    "transformers/torch are not installed. Install Tier B deps "
                    "(pip install -r requirements-tier-b.txt) to use "
                    "STT_BACKEND=qwen3asr, or set STT_BACKEND=mock."
                ) from e

            # The -hf checkpoints expose the transformers-native class. Prefer
            # AutoModelForMultimodalLM (documented on the model card); fall back
            # to AutoModel for older transformers builds.
            try:
                from transformers import AutoModelForMultimodalLM as _AutoModel
            except ImportError:  # pragma: no cover - version-dependent
                from transformers import AutoModel as _AutoModel

            s = get_settings()
            _processor = AutoProcessor.from_pretrained(s.QWEN3ASR_MODEL)
            _model = _AutoModel.from_pretrained(
                s.QWEN3ASR_MODEL,
                device_map=s.QWEN3ASR_DEVICE_MAP,
            )
    return _model, _processor


def _map_lang(raw_lang: str) -> tuple[str, float]:
    """Map a Qwen3-ASR language label to SikLo's {en, yue, cmn}.

    Returns (lang, confidence_multiplier). Unknown → best-effort default with a
    lowered confidence so the client can surface the "↻ Try again" affordance.
    """
    tag = (raw_lang or "").strip().lower()
    if "yue" in tag or "cantonese" in tag:
        return "yue", 1.0
    if tag in ("zh", "cmn") or "mandarin" in tag or "chinese" in tag:
        return "cmn", 1.0
    if tag in ("en", "eng") or "english" in tag:
        return "en", 1.0
    # Unknown / unmapped language: best-effort default to Mandarin (the most
    # likely non-English input for this product) with lowered confidence.
    return "cmn", 0.5


def _parse_decoded(decoded) -> tuple[str, str]:
    """Normalize processor.decode(return_format='parsed') output.

    Depending on transformers version it is either a dict or a 1-element list of
    dicts, each with 'language' and 'transcription' keys.
    """
    item = decoded
    if isinstance(decoded, (list, tuple)):
        item = decoded[0] if decoded else {}
    if isinstance(item, dict):
        return str(item.get("transcription", "")).strip(), str(
            item.get("language", "")
        )
    # Fallback: a bare string (e.g. transcription_only) with no language info.
    return str(item).strip(), ""


def transcribe(audio_bytes: bytes, filename: str = "") -> dict:
    model, processor = _load()

    # Normalize any container to 16 kHz mono WAV, matching the STT contract.
    wav = audio.decode_to_wav(audio_bytes)

    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "audio.wav"
        p.write_bytes(wav)

        # language=None -> the model auto-detects and returns the language.
        inputs = processor.apply_transcription_request(
            audio=str(p),
            language=None,
        ).to(model.device, model.dtype)

        output_ids = model.generate(**inputs, max_new_tokens=256)
        generated_ids = output_ids[:, inputs["input_ids"].shape[1]:]
        decoded = processor.decode(generated_ids, return_format="parsed")

    text, raw_lang = _parse_decoded(decoded)
    lang, conf_mult = _map_lang(raw_lang)
    # Qwen3-ASR does not expose a scalar confidence; report a fixed high value,
    # lowered when the detected language could not be mapped.
    return {"text": text, "lang": lang, "confidence": round(0.9 * conf_mult, 2)}
