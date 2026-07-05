"""SikLo backend — FastAPI application entrypoint.

Four endpoints back the Talk and Go experiences:
  POST /api/stt        multipart audio -> {text, lang, confidence}
  POST /api/translate  {text,source,target} -> SSE token stream + final JSON
  POST /api/tts        {text,lang,voice?} -> streamed audio/mpeg
  GET  /api/destinations?q=  -> POI search over the seed dataset

Model backends are lazy-loaded on first request (see app/services), so the
process boots instantly without any weights present.
"""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import go, stt, translate, tts

settings = get_settings()

logger = logging.getLogger("siklo.timing")
# Ensure the timing line is emitted regardless of host (uvicorn/gunicorn/tests)
# without double-logging if a handler is already configured.
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(levelname)s:     %(name)s %(message)s"))
    logger.addHandler(_h)
    logger.propagate = False
logger.setLevel(logging.INFO)

app = FastAPI(
    title="SikLo API",
    version="0.1.0",
    description="Speech + translation + POI backend for the SikLo MVP (Talk & Go).",
)


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Stamp every response with its server-side duration.

    Adds ``X-Duration-Ms`` and logs one line per request so the on-device
    latency verification (scripts/measure_latency.py, plan §3 budget) has data
    to read. For streaming responses (SSE translate, audio/mpeg tts) this
    measures time-to-first-byte, not full-stream time — which is the number the
    latency budget cares about ("tap-release → first translated audio").
    """
    start = time.perf_counter()
    response = await call_next(request)
    dur_ms = (time.perf_counter() - start) * 1000.0
    response.headers["X-Duration-Ms"] = f"{dur_ms:.1f}"
    logger.info("%s %s -> %s %.1fms", request.method, request.url.path,
                response.status_code, dur_ms)
    return response

_origins = (
    ["*"]
    if settings.CORS_ORIGINS.strip() == "*"
    else [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stt.router)
app.include_router(translate.router)
app.include_router(tts.router)
app.include_router(go.router)


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "backends": {
            "stt": settings.STT_BACKEND,
            "mt": settings.MT_BACKEND,
            "tts": settings.TTS_BACKEND,
        },
    }
