"""End-to-end tests of all four endpoints in mock mode."""

from __future__ import annotations

import json


def _parse_sse(text: str) -> list[tuple[str, dict]]:
    """Parse an SSE body into a list of (event, data-dict) tuples."""
    events = []
    for block in text.strip().split("\n\n"):
        if not block.strip():
            continue
        event = None
        data_lines = []
        for line in block.splitlines():
            if line.startswith("event:"):
                event = line[len("event:") :].strip()
            elif line.startswith("data:"):
                data_lines.append(line[len("data:") :].strip())
        data = json.loads("\n".join(data_lines)) if data_lines else {}
        events.append((event, data))
    return events


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["backends"]["mt"] == "mock"


def test_stt(client, tone_wav):
    with open(tone_wav, "rb") as f:
        r = client.post("/api/stt", files={"audio": ("tone.wav", f, "audio/wav")})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"text", "lang", "confidence"}
    assert body["lang"] in ("en", "yue", "cmn")
    assert isinstance(body["text"], str) and body["text"]
    assert 0.0 <= body["confidence"] <= 1.0


def test_stt_empty_upload(client):
    r = client.post("/api/stt", files={"audio": ("empty.wav", b"", "audio/wav")})
    assert r.status_code == 400


def test_translate_sse_en_yue(client):
    r = client.post(
        "/api/translate",
        json={"text": "Hello, how are you?", "source": "en", "target": "yue"},
    )
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")

    events = _parse_sse(r.text)
    types = [e for e, _ in events]
    assert types.count("token") >= 1
    assert types[-1] == "done"

    # Reconstruct streamed text and compare to final translation.
    streamed = "".join(d["t"] for e, d in events if e == "token")
    _, done = events[-1]
    assert set(done) == {"translation", "romanization", "register_note"}
    assert done["translation"] == streamed
    assert done["romanization"]  # jyutping present for yue


def test_translate_all_directions(client):
    for source, target in [("en", "cmn"), ("yue", "en"), ("cmn", "en")]:
        r = client.post(
            "/api/translate",
            json={"text": "test", "source": source, "target": target},
        )
        assert r.status_code == 200
        events = _parse_sse(r.text)
        assert events[-1][0] == "done"
        assert events[-1][1]["translation"]


def test_translate_unsupported_direction(client):
    # yue -> cmn is not a supported pair; expect a graceful error event.
    r = client.post(
        "/api/translate",
        json={"text": "test", "source": "yue", "target": "cmn"},
    )
    assert r.status_code == 200
    events = _parse_sse(r.text)
    assert any(e == "error" for e, _ in events)


def test_tts(client):
    r = client.post("/api/tts", json={"text": "你好", "lang": "yue"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("audio/mpeg")
    body = r.content
    assert len(body) > 0
    # Starts with an MPEG audio frame sync word.
    assert body[:2] == b"\xff\xfb"


def test_tts_empty_text(client):
    r = client.post("/api/tts", json={"text": "   ", "lang": "yue"})
    assert r.status_code == 400


def test_go_search_substring(client):
    r = client.get("/api/destinations", params={"q": "Mong Kok"})
    assert r.status_code == 200
    results = r.json()["results"]
    assert len(results) >= 2
    assert all("Mong Kok" in p["name_en"] or "旺角" in p["name_yue"] for p in results)


def test_go_search_chinese(client):
    r = client.get("/api/destinations", params={"q": "機場"})
    assert r.status_code == 200
    results = r.json()["results"]
    assert results and results[0]["name_en"] == "Hong Kong International Airport"


def test_go_search_alias_fuzzy(client):
    r = client.get("/api/destinations", params={"q": "airprot"})  # typo
    assert r.status_code == 200
    results = r.json()["results"]
    assert any(p["name_en"].startswith("Hong Kong International") for p in results)


def test_go_empty_query_returns_all(client):
    r = client.get("/api/destinations")
    assert r.status_code == 200
    assert len(r.json()["results"]) == 6
