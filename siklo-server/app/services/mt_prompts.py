"""Prompt templates for translation.

The single hard requirement of SikLo's Talk mode: target=yue must be
COLLOQUIAL SPOKEN Cantonese (廣東話口語, Traditional characters) — NOT written
Chinese (書面語). target=cmn is Mandarin in Simplified characters. Every
direction returns strict JSON {translation, romanization, register_note}.
"""

from __future__ import annotations

LANG_NAMES = {
    "en": "English",
    "yue": "Cantonese",
    "cmn": "Mandarin",
}

# Directions we support.
SUPPORTED = {
    ("en", "yue"),
    ("en", "cmn"),
    ("yue", "en"),
    ("cmn", "en"),
}

_JSON_CONTRACT = (
    'Respond with ONLY a single strict JSON object and nothing else — no '
    'markdown, no code fences, no commentary. Schema:\n'
    '{"translation": "<the translation>", '
    '"romanization": "<see below>", '
    '"register_note": "<one short English sentence on tone/register/politeness>"}'
)


def _target_rules(target: str) -> str:
    if target == "yue":
        return (
            "Translate into NATURAL, COLLOQUIAL SPOKEN Cantonese as actually "
            "spoken in Hong Kong (廣東話口語). Use TRADITIONAL Chinese characters. "
            "You MUST use spoken colloquial forms and particles, e.g. 唔 (not 不), "
            "冇 (not 沒有), 喺 (not 在), 嘅 (not 的), 咗, 嚟, 佢, 我哋, 咩, 喇, 㗎, 呢. "
            "It is FORBIDDEN to produce written/formal Chinese (書面語) — a native "
            "speaker must hear it as everyday speech, not a news broadcast. "
            'For "romanization" give Jyutping with tone numbers, space-separated.'
        )
    if target == "cmn":
        return (
            "Translate into natural spoken Mandarin (普通話) using SIMPLIFIED "
            "Chinese characters. "
            'For "romanization" give Hanyu Pinyin with tone marks, space-separated.'
        )
    if target == "en":
        return (
            "Translate into natural, idiomatic English. "
            'Set "romanization" to an empty string "".'
        )
    return ""


def build_messages(text: str, source: str, target: str) -> list[dict]:
    """Return OpenAI/Ollama-style chat messages for the given direction."""
    src_name = LANG_NAMES.get(source, source)
    system = (
        f"You are an expert Hong Kong translator. You translate from "
        f"{src_name} for a live two-way conversation between a local speaker "
        f"and a visitor. Preserve the speaker's intent, politeness and "
        f"register. {_target_rules(target)}\n\n{_JSON_CONTRACT}"
    )
    user = f"Translate this {src_name} utterance:\n\n{text}"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
