"""GET /api/destinations?q= — POI search over the seed dataset.

Substring match first (fast, order-preserving), then a fuzzy fallback via
difflib so minor typos still surface results. Matches across English, both
Chinese scripts, romanization and aliases. Empty q returns the whole seed set.
"""

from __future__ import annotations

import json
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api", tags=["go"])

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "hk_poi.json"


@lru_cache
def _load_pois() -> list[dict]:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _haystacks(poi: dict) -> list[str]:
    fields = [
        poi.get("name_en", ""),
        poi.get("name_yue", ""),
        poi.get("name_cmn", ""),
        poi.get("area", ""),
        poi.get("jyutping", ""),
        poi.get("pinyin", ""),
    ]
    fields.extend(poi.get("aliases", []))
    return [f.lower() for f in fields if f]


def _score(query: str, poi: dict) -> tuple[bool, float]:
    """Return (is_substring_match, best_score) for ``query`` against ``poi``."""
    q = query.lower().strip()
    if not q:
        return (False, 0.0)
    substring = False
    best = 0.0
    for hay in _haystacks(poi):
        if q in hay:
            substring = True
            # Prefer shorter (more exact) fields.
            best = max(best, 0.9 + 0.1 * (len(q) / max(len(hay), 1)))
        else:
            best = max(best, SequenceMatcher(None, q, hay).ratio())
    return (substring, best)


# Only surface fuzzy matches this close when there are no substring hits — keeps
# typo-tolerance without polluting exact searches with unrelated POIs.
_FUZZY_THRESHOLD = 0.6


@router.get("/destinations")
def destinations(
    q: str = Query("", description="Free-text query"),
    limit: int = Query(20, ge=1, le=100),
):
    pois = _load_pois()
    if not q.strip():
        return {"query": q, "results": pois[:limit]}

    scored = [(_score(q, p), p) for p in pois]
    substr = sorted(
        ((score, p) for (is_sub, score), p in scored if is_sub),
        key=lambda sp: sp[0],
        reverse=True,
    )
    if substr:
        chosen = substr
    else:
        chosen = sorted(
            ((score, p) for (_is, score), p in scored if score >= _FUZZY_THRESHOLD),
            key=lambda sp: sp[0],
            reverse=True,
        )
    results = [p for _s, p in chosen[:limit]]
    return {"query": q, "results": results}
