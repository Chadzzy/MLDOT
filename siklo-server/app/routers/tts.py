"""POST /api/tts — {text, lang, voice?} -> streamed audio/mpeg."""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
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


@router.post("/tts")
async def tts(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text.")
    backend = _backend()

    # Probe the first chunk eagerly so backend errors (network/deps) become a
    # clean HTTP error rather than a truncated audio stream.
    agen = backend.synthesize(req.text, req.lang, req.voice)
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
