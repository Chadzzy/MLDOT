"""Mock MT backend — deterministic canned translations, streamed char-by-char.

Same interface as mt_qwen.stream_translate. Lets the full SSE pipeline and the
mobile client be developed/tested without an LLM.
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator

from .mt_prompts import SUPPORTED

# Canned, direction-keyed results. Cantonese is colloquial (口語), Traditional.
_CANNED: dict[tuple[str, str], dict] = {
    ("en", "yue"): {
        "translation": "你好，呢句係測試翻譯，唔該晒。",
        "romanization": "nei5 hou2, ni1 geoi3 hai6 caak1 si3 faan1 jik6, m4 goi1 saai3.",
        "register_note": "Casual, friendly spoken Cantonese (mock).",
    },
    ("en", "cmn"): {
        "translation": "你好，这是一句测试翻译，谢谢。",
        "romanization": "nǐ hǎo, zhè shì yī jù cè shì fān yì, xiè xie.",
        "register_note": "Neutral polite Mandarin (mock).",
    },
    ("yue", "en"): {
        "translation": "Hello, this is a test translation, thanks.",
        "romanization": "",
        "register_note": "Casual English (mock).",
    },
    ("cmn", "en"): {
        "translation": "Hello, this is a test translation, thank you.",
        "romanization": "",
        "register_note": "Neutral English (mock).",
    },
}


async def stream_translate(
    text: str, source: str, target: str
) -> AsyncIterator[dict]:
    if (source, target) not in SUPPORTED:
        raise ValueError(f"Unsupported direction {source}->{target}")

    result = _CANNED[(source, target)]
    for ch in result["translation"]:
        await asyncio.sleep(0)  # cooperative yield; keeps it a real async stream
        yield {"type": "token", "t": ch}
    yield {"type": "done", "result": dict(result)}
