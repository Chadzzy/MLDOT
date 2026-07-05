"""POST /api/stt — multipart audio -> {text, lang, confidence}."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..config import get_settings

router = APIRouter(prefix="/api", tags=["stt"])


def _backend():
    if get_settings().STT_BACKEND == "sensevoice":
        from ..services import stt_sensevoice

        return stt_sensevoice
    from ..services import stt_mock

    return stt_mock


@router.post("/stt")
async def stt(audio: UploadFile = File(...)):
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio upload.")
    try:
        result = _backend().transcribe(data, filename=audio.filename or "")
    except RuntimeError as e:
        # Missing ffmpeg / weights / deps -> actionable 503.
        raise HTTPException(status_code=503, detail=str(e)) from e
    return result
