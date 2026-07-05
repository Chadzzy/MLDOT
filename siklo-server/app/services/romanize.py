"""Deterministic romanization.

  * Jyutping for Cantonese (yue) via ``ToJyutping``
  * Hanyu Pinyin for Mandarin (cmn) via ``pypinyin``

Used by the Go router for POI cards and as a fallback for the MT service when
the LLM omits or mangles the romanization field. Imports are lazy so the
package is optional at import time; a clear error surfaces on first use.
"""

from __future__ import annotations


def jyutping(text: str) -> str:
    """Return space-separated Jyutping (with tone numbers) for Cantonese text."""
    if not text:
        return ""
    try:
        import ToJyutping
    except ImportError as e:  # pragma: no cover - depends on optional dep
        raise RuntimeError(
            "ToJyutping is not installed; add it to the environment to romanize "
            "Cantonese, or supply romanization from the MT model."
        ) from e

    # ToJyutping.get_jyutping_text returns a single string of space-joined syllables.
    try:
        return ToJyutping.get_jyutping_text(text)
    except AttributeError:  # pragma: no cover - API drift across versions
        pairs = ToJyutping.get_jyutping_list(text)
        return " ".join(jp for _ch, jp in pairs if jp)


def pinyin(text: str) -> str:
    """Return space-separated Hanyu Pinyin (with tone marks) for Mandarin text."""
    if not text:
        return ""
    try:
        from pypinyin import Style, pinyin as _pinyin
    except ImportError as e:  # pragma: no cover - depends on optional dep
        raise RuntimeError(
            "pypinyin is not installed; add it to the environment to romanize "
            "Mandarin, or supply romanization from the MT model."
        ) from e

    syllables = _pinyin(text, style=Style.TONE)
    return " ".join(s[0] for s in syllables if s and s[0])


def romanize_for(text: str, lang: str) -> str:
    """Romanize ``text`` according to ``lang`` ('yue' | 'cmn'). Empty otherwise."""
    if lang == "yue":
        return jyutping(text)
    if lang == "cmn":
        return pinyin(text)
    return ""
