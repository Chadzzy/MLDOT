"""POST /api/translate — SSE stream of tokens + final structured result.

Request body: {"text": str, "source": "en|yue|cmn", "target": "en|yue|cmn"}

SSE wire format:
    event: token
    data: {"t": "..."}

    event: done
    data: {"translation": "...", "romanization": "...", "register_note": "..."}

On error, an `event: error` frame is emitted so the client never hangs.
"""

from __future__ import annotations

import json
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..config import get_settings

router = APIRouter(prefix="/api", tags=["translate"])

Lang = Literal["en", "yue", "cmn"]


class TranslateRequest(BaseModel):
    text: str
    source: Lang
    target: Lang


def _backend():
    if get_settings().MT_BACKEND == "qwen":
        from ..services import mt_qwen

        return mt_qwen
    from ..services import mt_mock

    return mt_mock


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/translate")
async def translate(req: TranslateRequest):
    backend = _backend()

    async def event_gen():
        try:
            async for ev in backend.stream_translate(
                req.text, req.source, req.target
            ):
                if ev["type"] == "token":
                    yield _sse("token", {"t": ev["t"]})
                elif ev["type"] == "done":
                    yield _sse("done", ev["result"])
        except Exception as e:  # unsupported direction, network, parse, etc.
            yield _sse("error", {"message": str(e)})

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering for live tokens
        },
    )
