"""CosyVoice2 TTS backend (ASLP-lab/Cosyvoice2-Yue + base CosyVoice2-0.5B).

Tier B primary TTS (plan §2). Cantonese uses the Apache-2.0 Cantonese fine-tune
``ASLP-lab/Cosyvoice2-Yue``; Mandarin uses the base ``CosyVoice2-0.5B``. Both are
driven through the same CosyVoice framework
(https://github.com/FunAudioLLM/CosyVoice), which must be installed and on the
PYTHONPATH (it is not a pip package on PyPI — see requirements-tier-b.txt notes).

Usage API (from the CosyVoice repo example.py and the ASLP-lab WenetSpeech-Yue
README):

    from cosyvoice.cli.cosyvoice import CosyVoice2
    from cosyvoice.utils.file_utils import load_wav
    cosyvoice = CosyVoice2(model_dir, load_jit=False, load_trt=False,
                           load_vllm=False, fp16=False)
    prompt_16k = load_wav('reference_voice.wav', 16000)
    for out in cosyvoice.inference_instruct2(text, '用粤语说这句话',
                                             prompt_16k, stream=True):
        pcm = out['tts_speech']          # torch tensor, shape (1, N), float32
    sr = cosyvoice.sample_rate           # 24000 for CosyVoice2

CosyVoice2 requires a **prompt (reference) speech** clip for its zero-shot voice;
we ship none (no weights/assets in the repo), so ``COSYVOICE_PROMPT_WAV`` must
point at a short 16 kHz reference wav. A clear RuntimeError is raised if it is
missing.

The router contract is a stream of **MP3** chunks (``audio/mpeg``). CosyVoice
emits float PCM tensors, so each chunk is transcoded to MP3 via an ffmpeg
subprocess pipe (mirroring app/services/audio.py's shell-out approach). MP3 is
frame-based, so per-chunk transcoding yields a concatenatable stream — the same
shape edge-tts and the mock backend already produce.

Heavy imports (torch, cosyvoice) live inside functions so importing this module
needs neither.
"""

from __future__ import annotations

import asyncio
import subprocess
import threading
from pathlib import Path
from typing import AsyncIterator

from ..config import get_settings

# One lazily-loaded model per language ("yue" | "cmn").
_models: dict[str, object] = {}
_prompt = None  # cached (tensor, ) reference speech
_lock = threading.Lock()

# Per-language CosyVoice instruct prompt (the model is instruction-controlled).
_INSTRUCT = {
    "yue": "用粤语说这句话",
    "cmn": "用普通话说这句话",
}


def _model_dir(lang: str) -> str:
    s = get_settings()
    if lang == "yue":
        return s.COSYVOICE_YUE_DIR
    if lang == "cmn":
        return s.COSYVOICE_CMN_DIR
    raise ValueError(f"Unsupported TTS lang '{lang}' (expected 'yue' or 'cmn').")


def _load_prompt():
    """Load and cache the 16 kHz reference voice CosyVoice zero-shot needs."""
    global _prompt
    if _prompt is not None:
        return _prompt
    s = get_settings()
    path = Path(s.COSYVOICE_PROMPT_WAV)
    if not path.is_file():
        raise RuntimeError(
            "CosyVoice needs a reference voice clip but "
            f"COSYVOICE_PROMPT_WAV ('{path}') was not found. Point it at a short "
            "(3-10 s) 16 kHz mono wav of the target speaker, or set "
            "TTS_BACKEND=edge / mock."
        )
    from cosyvoice.utils.file_utils import load_wav

    _prompt = load_wav(str(path), 16000)
    return _prompt


def _get_model(lang: str):
    m = _models.get(lang)
    if m is not None:
        return m
    with _lock:
        if lang not in _models:
            try:
                from cosyvoice.cli.cosyvoice import CosyVoice2
            except ImportError as e:  # pragma: no cover - optional dep
                raise RuntimeError(
                    "CosyVoice is not installed. Clone "
                    "github.com/FunAudioLLM/CosyVoice, install its requirements "
                    "and put it on PYTHONPATH (see requirements-tier-b.txt) to "
                    "use TTS_BACKEND=cosyvoice, or set TTS_BACKEND=edge / mock."
                ) from e
            _models[lang] = CosyVoice2(
                _model_dir(lang),
                load_jit=False,
                load_trt=False,
                load_vllm=False,
                fp16=False,
            )
    return _models[lang]


def _tensor_to_pcm16(tensor) -> bytes:
    """Flatten a CosyVoice float tensor to little-endian 16-bit PCM bytes."""
    import numpy as np

    arr = tensor.detach().cpu().numpy().reshape(-1)
    arr = np.clip(arr, -1.0, 1.0)
    return (arr * 32767.0).astype("<i2").tobytes()


def _pcm_to_mp3(pcm: bytes, sample_rate: int) -> bytes:
    """Transcode raw mono s16le PCM to MP3 via an ffmpeg subprocess pipe."""
    if not pcm:
        return b""
    settings = get_settings()
    cmd = [
        settings.FFMPEG_BIN,
        "-hide_banner",
        "-loglevel", "error",
        "-f", "s16le",
        "-ar", str(sample_rate),
        "-ac", "1",
        "-i", "pipe:0",
        "-f", "mp3",
        "-b:a", "128k",
        "pipe:1",
    ]
    proc = subprocess.run(cmd, input=pcm, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(
            "ffmpeg failed to transcode CosyVoice PCM to MP3: "
            + proc.stderr.decode("utf-8", "ignore").strip()
        )
    return proc.stdout


async def synthesize(
    text: str, lang: str, voice: str | None = None
) -> AsyncIterator[bytes]:
    if lang not in _INSTRUCT:
        raise ValueError(
            f"Unsupported TTS lang '{lang}' (expected 'yue' or 'cmn')."
        )

    loop = asyncio.get_running_loop()

    # Model load + inference are blocking/GPU-bound; run them off the event loop.
    def _prepare():
        model = _get_model(lang)
        prompt = _load_prompt()
        gen = model.inference_instruct2(
            text, _INSTRUCT[lang], prompt, stream=True
        )
        return model, iter(gen)

    try:
        model, it = await loop.run_in_executor(None, _prepare)
    except (RuntimeError, ValueError):
        raise
    except Exception as e:  # model init / inference setup failure
        raise RuntimeError(f"CosyVoice synthesis failed: {e}") from e

    sr = getattr(model, "sample_rate", 24000)
    _sentinel = object()

    def _next_chunk():
        try:
            out = next(it)
        except StopIteration:
            return _sentinel
        # Transcode inside the worker thread too (ffmpeg call is blocking).
        return _pcm_to_mp3(_tensor_to_pcm16(out["tts_speech"]), sr)

    while True:
        try:
            mp3 = await loop.run_in_executor(None, _next_chunk)
        except (RuntimeError, ValueError):
            raise
        except Exception as e:
            raise RuntimeError(f"CosyVoice synthesis failed: {e}") from e
        if mp3 is _sentinel:
            break
        if mp3:
            yield mp3
