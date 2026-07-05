"""Application configuration.

Every model backend is selected by an environment variable and each has a
``mock`` option so the server (and its test-suite) boots and runs anywhere,
with no model weights or network access. See ``.env.example``.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---- Backend selection --------------------------------------------------
    # Default to "mock" everywhere so the app runs with zero weights/network.
    STT_BACKEND: Literal["mock", "sensevoice"] = "mock"
    MT_BACKEND: Literal["mock", "qwen"] = "mock"
    TTS_BACKEND: Literal["mock", "edge"] = "mock"

    # ---- STT (SenseVoice-Small via funasr) ---------------------------------
    SENSEVOICE_MODEL: str = "iic/SenseVoiceSmall"
    SENSEVOICE_DEVICE: str = "cpu"  # "cpu" or "cuda:0"

    # ---- MT (Qwen via Ollama or a vLLM OpenAI-compatible endpoint) ----------
    # api_style "ollama"  -> POST {OLLAMA_URL}/api/chat
    # api_style "openai"  -> POST {OLLAMA_URL}/v1/chat/completions  (vLLM etc.)
    MT_API_STYLE: Literal["ollama", "openai"] = "ollama"
    OLLAMA_URL: str = "http://localhost:11434"
    MT_MODEL: str = "qwen3:8b"
    MT_TEMPERATURE: float = 0.3
    MT_TIMEOUT_S: float = 120.0
    # Bearer token for OpenAI-compatible endpoints (vLLM usually ignores it).
    MT_API_KEY: str = "not-needed"

    # ---- TTS (edge-tts) -----------------------------------------------------
    EDGE_VOICE_YUE: str = "zh-HK-HiuGaaiNeural"
    EDGE_VOICE_CMN: str = "zh-CN-XiaoxiaoNeural"

    # ---- Audio decode -------------------------------------------------------
    FFMPEG_BIN: str = "ffmpeg"
    TARGET_SAMPLE_RATE: int = 16000

    # ---- CORS ---------------------------------------------------------------
    # Comma-separated origins, or "*" for dev (default).
    CORS_ORIGINS: str = "*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
