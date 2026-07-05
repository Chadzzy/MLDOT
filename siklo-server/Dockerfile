# SikLo backend — Tier A image (mock/edge/qwen-over-HTTP by default).
# ffmpeg is included so uploaded m4a/aac audio can be decoded for STT.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt requirements-tier-a.txt ./
# Core deps only by default (fast, light). To bake in local SenseVoice STT,
# build with: --build-arg TIER=a
ARG TIER=core
RUN if [ "$TIER" = "a" ]; then \
        pip install -r requirements-tier-a.txt ; \
    else \
        pip install -r requirements.txt ; \
    fi

COPY app ./app
COPY scripts ./scripts

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8000/healthz || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
