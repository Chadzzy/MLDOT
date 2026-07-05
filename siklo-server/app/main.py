"""SikLo backend — FastAPI application entrypoint.

Four endpoints back the Talk and Go experiences:
  POST /api/stt        multipart audio -> {text, lang, confidence}
  POST /api/translate  {text,source,target} -> SSE token stream + final JSON
  POST /api/tts        {text,lang,voice?} -> streamed audio/mpeg
  GET  /api/destinations?q=  -> POI search over the seed dataset

Model backends are lazy-loaded on first request (see app/services), so the
process boots instantly without any weights present.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import go, stt, translate, tts

settings = get_settings()

app = FastAPI(
    title="SikLo API",
    version="0.1.0",
    description="Speech + translation + POI backend for the SikLo MVP (Talk & Go).",
)

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
