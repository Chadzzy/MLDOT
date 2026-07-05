"""Qwen MT backend — streams tokens from Ollama or a vLLM OpenAI-compat server.

Interface (shared by every MT backend):

    async def stream_translate(text, source, target) -> AsyncIterator[dict]

yields, in order:
    {"type": "token", "t": "<piece of text>"}   # zero or more
    {"type": "done", "result": {                 # exactly one, last
        "translation": str, "romanization": str, "register_note": str}}

The model is asked for strict JSON; we stream the raw generated tokens for a
live typing effect, then parse the accumulated text for the final structured
result. Romanization is repaired deterministically (ToJyutping/pypinyin) if the
model omits or malforms it.
"""

from __future__ import annotations

import json
import re
from typing import AsyncIterator

import httpx

from ..config import get_settings
from . import romanize
from .mt_prompts import SUPPORTED, build_messages


class UnsupportedDirection(ValueError):
    pass


def _check_direction(source: str, target: str) -> None:
    if (source, target) not in SUPPORTED:
        raise UnsupportedDirection(
            f"Unsupported direction {source}->{target}. "
            f"Supported: {sorted('->'.join(d) for d in SUPPORTED)}"
        )


def _extract_json(raw: str) -> dict | None:
    """Best-effort extraction of the JSON object from model output."""
    raw = raw.strip()
    # Strip code fences if present.
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fence:
        raw = fence.group(1)
    # Grab the outermost {...}.
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    candidate = raw[start : end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


def _finalize(raw: str, target: str) -> dict:
    data = _extract_json(raw) or {}
    translation = str(data.get("translation") or "").strip()
    if not translation:
        # Parsing failed — fall back to the raw text so the user still sees output.
        translation = raw.strip()
    romanization = str(data.get("romanization") or "").strip()
    if not romanization and target in ("yue", "cmn"):
        try:
            romanization = romanize.romanize_for(translation, target)
        except RuntimeError:
            romanization = ""
    register_note = str(data.get("register_note") or "").strip()
    return {
        "translation": translation,
        "romanization": romanization,
        "register_note": register_note,
    }


async def _stream_ollama(messages: list[dict]) -> AsyncIterator[str]:
    s = get_settings()
    url = f"{s.OLLAMA_URL.rstrip('/')}/api/chat"
    payload = {
        "model": s.MT_MODEL,
        "messages": messages,
        "stream": True,
        "options": {"temperature": s.MT_TEMPERATURE},
        "format": "json",
    }
    async with httpx.AsyncClient(timeout=s.MT_TIMEOUT_S) as client:
        async with client.stream("POST", url, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                obj = json.loads(line)
                piece = obj.get("message", {}).get("content", "")
                if piece:
                    yield piece
                if obj.get("done"):
                    break


async def _stream_openai(messages: list[dict]) -> AsyncIterator[str]:
    s = get_settings()
    url = f"{s.OLLAMA_URL.rstrip('/')}/v1/chat/completions"
    payload = {
        "model": s.MT_MODEL,
        "messages": messages,
        "stream": True,
        "temperature": s.MT_TEMPERATURE,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {s.MT_API_KEY}"}
    async with httpx.AsyncClient(timeout=s.MT_TIMEOUT_S) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                line = line.strip()
                if not line or not line.startswith("data:"):
                    continue
                data = line[len("data:") :].strip()
                if data == "[DONE]":
                    break
                obj = json.loads(data)
                delta = obj["choices"][0].get("delta", {})
                piece = delta.get("content", "")
                if piece:
                    yield piece


async def stream_translate(
    text: str, source: str, target: str
) -> AsyncIterator[dict]:
    _check_direction(source, target)
    messages = build_messages(text, source, target)
    s = get_settings()
    producer = _stream_openai if s.MT_API_STYLE == "openai" else _stream_ollama

    buf: list[str] = []
    async for piece in producer(messages):
        buf.append(piece)
        yield {"type": "token", "t": piece}

    yield {"type": "done", "result": _finalize("".join(buf), target)}
