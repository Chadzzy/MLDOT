"""POST/GET /api/tts — {text, lang, voice?} -> streamed audio/mpeg.

GET exists so mobile audio players (expo-audio) can stream directly from a
URL without a body-carrying request.
"""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..config import get_settings

router = APIRouter(prefix="/api", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    lang: Literal["yue", "cmn"]
    voice: Optional[str] = None


def _backend():
    if get_settings().TTS_BACKEND == "edge":
        from ..services import tts_edge

        return tts_edge
    from ..services import tts_mock

    return tts_mock


async def _stream_tts(text: str, lang: Literal["yue", "cmn"], voice: Optional[str]):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Empty text.")
    backend = _backend()

    # Probe the first chunk eagerly so backend errors (network/deps) become a
    # clean HTTP error rather than a truncated audio stream.
    agen = backend.synthesize(text, lang, voice)
    try:
        first = await agen.__anext__()
    except StopAsyncIteration:
        first = b""
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    async def body():
        if first:
            yield first
        async for chunk in agen:
            yield chunk

    return StreamingResponse(body(), media_type="audio/mpeg")


@router.post("/tts")
async def tts(req: TTSRequest):
    return await _stream_tts(req.text, req.lang, req.voice)


@router.get("/tts")
async def tts_get(
    text: str = Query(...),
    lang: Literal["yue", "cmn"] = Query(...),
    voice: Optional[str] = Query(default=None),
):
    return await _stream_tts(text, lang, voice)
