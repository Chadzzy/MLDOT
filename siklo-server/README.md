# SikLo backend (`siklo-server`)

FastAPI backend for the SikLo MVP — the speech + translation + POI service
behind the **Talk** and **Go** experiences (plan §2/§3). Cantonese (yue) and
Mandarin (cmn), all open-source / zero-cost models.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/healthz` | Liveness + which backends are active |
| `POST` | `/api/stt` | multipart audio (`m4a`/`aac`/`wav`/`webm`) → `{text, lang, confidence}` |
| `POST` | `/api/translate` | `{text, source, target}` → **SSE** token stream + final structured JSON |
| `POST` | `/api/tts` | `{text, lang:"yue"\|"cmn", voice?}` → streamed `audio/mpeg` |
| `GET`  | `/api/destinations?q=` | POI search over the seed dataset |

### `/api/stt`
`multipart/form-data` field `audio`. Returns:
```json
{"text": "...", "lang": "en|yue|cmn", "confidence": 0.0}
```
`lang` is auto-detected and drives the translation direction — the Talk screen
never asks which language was spoken.

### `/api/translate` (SSE)
Body: `{"text": str, "source": "en|yue|cmn", "target": "en|yue|cmn"}`.
Supported directions: **en↔yue, en↔cmn** (i.e. `en→yue`, `en→cmn`, `yue→en`,
`cmn→en`). Wire format:
```
event: token
data: {"t": "你"}

event: token
data: {"t": "好"}

event: done
data: {"translation": "...", "romanization": "...", "register_note": "..."}
```
`romanization` is Jyutping (yue) / Pinyin (cmn) / `""` (en). On any failure
(unsupported direction, model/network error) a terminal `event: error` frame is
emitted (`data: {"message": "..."}`) so the client never hangs. Concatenating
all `token` frames reproduces `done.translation` exactly.

### `/api/tts`
Body: `{"text": str, "lang": "yue"|"cmn", "voice": optional}`. Streams
`audio/mpeg`. Backend/network errors surface as HTTP 503 *before* the stream
starts (the first chunk is probed eagerly) so clients get a clean error, not a
truncated file.

### `/api/destinations`
`?q=` free-text; matches English / Traditional / Simplified / romanization /
aliases. Substring matches win; a difflib fuzzy fallback (≥0.6) tolerates typos
when there are no substring hits. Empty `q` returns the full seed set. Each
result follows the plan §5 schema:
`{name_yue, name_cmn, name_en, area, landmark_yue, landmark_cmn, landmark_en, jyutping, pinyin, aliases[]}`.
(Go's real search is client-side fuse.js in P4; this endpoint is the
free-text / fallback path.)

## Backends & configuration

Every backend is chosen by an env var and each has a **`mock`** option.
Defaults are mock everywhere so the server and tests run with **no weights and
no network**. See `.env.example`.

| Var | Options | Default | Notes |
|---|---|---|---|
| `STT_BACKEND` | `mock` \| `sensevoice` \| `qwen3asr` | `mock` | SenseVoice-Small (Tier A, CPU) / Qwen3-ASR-1.7B (Tier B, GPU) |
| `MT_BACKEND`  | `mock` \| `qwen` | `mock` | Qwen over Ollama or vLLM (HTTP) |
| `TTS_BACKEND` | `mock` \| `edge` \| `cosyvoice` | `mock` | edge-tts (Tier A) / CosyVoice2 (Tier B) |

Models are **lazy-loaded on first request**, never at startup.

## Run — mock mode (default, runs anywhere)

```bash
cd siklo-server
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # already mock everywhere
pytest                          # 12 tests, all green
uvicorn app.main:app --reload   # http://localhost:8000/healthz
```

## Run — Tier A (laptop/demo: SenseVoice + Ollama + edge-tts)

Tier A needs three extra things the core install deliberately omits:

1. **ffmpeg** on PATH (decodes uploaded m4a/aac): `apt-get install ffmpeg`.
2. **Heavy STT deps** (funasr + torch): `pip install -r requirements-tier-a.txt`
   (multi-GB; weights download on first `/api/stt` call).
3. **Ollama** with a Qwen model pulled:
   ```bash
   ollama pull qwen3:8b        # or qwen3:4b for laptop-class quality
   ```

Then set in `.env`:
```
STT_BACKEND=sensevoice
MT_BACKEND=qwen
TTS_BACKEND=edge
OLLAMA_URL=http://localhost:11434
MT_MODEL=qwen3:8b
```

### Docker (Tier A)
```bash
docker compose up                       # api only (mock/edge; qwen via host Ollama)
docker compose --profile tier-a-llm up  # api + a local Ollama container
docker compose exec ollama ollama pull qwen3:8b
```
The image bundles ffmpeg. Point the mobile app's `EXPO_PUBLIC_API_URL` at
`http://<this-machine-lan-ip>:8000`.

## MT eval

30-sentence colloquial-Cantonese eval set (building-manager / taxi / market),
Traditional 口語 references: `app/data/eval/cantonese_eval.jsonl`.

```bash
MT_BACKEND=qwen python scripts/run_eval.py    # prints EN / reference / model / jyutping
```
Runs against mock (canned output) if Ollama isn't configured, and prints a
clear message if the backend is unreachable. Use this to judge colloquial
quality and decide whether to swap in YueTung (plan §8).

## Tier B (single GPU) — built in P5

The heavier backends are wired in behind env switches. Install
`requirements-tier-b.txt` (GPU host) and use the `tier-b` compose profile
(`docker compose --profile tier-b up api-tier-b vllm`). See the top-level
`../siklo/README.md` for full setup.

- **STT — `STT_BACKEND=qwen3asr`** (`app/services/stt_qwen3asr.py`).
  `Qwen/Qwen3-ASR-1.7B` via transformers (`AutoModelForMultimodalLM` +
  `processor.apply_transcription_request(..., language=None)` for auto
  language ID → parsed `{language, transcription}`). Language mapped to
  en/yue/cmn; an unmappable language falls back best-effort with **lowered
  confidence** (0.45) so the client can offer "↻ Try again".
  **LICENSE: Apache-2.0** — verified on the model card (plan §8 risk). No
  distribution restriction; SenseVoice-Small remains the *default* only because
  it is tiny and CPU-viable, **not** for licensing reasons. If a future
  checkpoint ships under a restrictive Qwen license, keep SenseVoice as default.
- **MT — `MT_BACKEND=qwen`** against vLLM serving `Qwen3-8B-Instruct`: set
  `MT_API_STYLE=openai` and point `OLLAMA_URL` at the vLLM base URL
  (`http://vllm:8000`), `MT_MODEL=qwen3-8b`. No new code — the existing
  OpenAI-compatible path handles it.
- **TTS — `TTS_BACKEND=cosyvoice`** (`app/services/tts_cosyvoice.py`).
  `ASLP-lab/Cosyvoice2-Yue` (**Apache-2.0**, Cantonese fine-tune of
  CosyVoice2-0.5B) for yue; base `CosyVoice2-0.5B` for cmn. Driven via
  `CosyVoice2(...).inference_instruct2(text, "用粤语说这句话"|"用普通话说这句话",
  prompt_speech_16k, stream=True)`. CosyVoice emits float PCM tensors at
  `sample_rate` (24 kHz); each chunk is transcoded to MP3 via an ffmpeg pipe to
  match the `audio/mpeg` router contract. Needs the CosyVoice framework on
  PYTHONPATH (not on PyPI), model dirs (`COSYVOICE_YUE_DIR`/`COSYVOICE_CMN_DIR`),
  and a short 16 kHz reference clip (`COSYVOICE_PROMPT_WAV`) for the zero-shot
  voice.

### Latency instrumentation

Every response carries an `X-Duration-Ms` header and a `siklo.timing` log line
(time-to-first-byte for streaming endpoints). `scripts/measure_latency.py` hits
stt/translate/tts N times and prints p50/p95 per stage plus the summed
speech→first-audio estimate vs the 3.5 s budget (plan §3). On-device latency
verification against a real Tier B GPU server is the remaining manual step
(see `../siklo/README.md` checklist).

## Environment notes

- **ffmpeg** is required only for real STT. It is **not installed** in this
  build/sandbox; mock STT needs nothing.
- **edge-tts** reaches Microsoft's servers over HTTPS. In network-restricted
  environments (including this sandbox, where TLS to `speech.platform.bing.com`
  is intercepted) the call fails with a clear `RuntimeError` → HTTP 503; the
  code path is otherwise correct. Verified locally: the request is made and the
  error is handled gracefully. Use `TTS_BACKEND=mock` where outbound TLS to
  Microsoft is blocked.

## For P3 (Talk live wiring) — API contract cheatsheet

- **Flow:** record → `POST /api/stt` (multipart, field name `audio`) → take
  `{text, lang}` → open SSE `POST /api/translate` with
  `source = <detected lang>`, `target = <the other half's lang>` → render tokens
  from `event: token` (`data.t`), finalize on `event: done` → `POST /api/tts`
  with `{text: done.translation, lang: target}` and play the `audio/mpeg` stream.
- **Direction rule:** only en↔yue and en↔cmn are supported. If STT detects a
  language that doesn't match the tapped half, translate in the *correct*
  direction anyway (this is what the "Heard Cantonese — translated it for you"
  hint is for). Never send `yue→cmn`/`cmn→yue` — those return `event: error`.
- **SSE client:** use `react-native-sse` or `expo/fetch` streaming; frames are
  `event:`/`data:` separated by blank lines. Reassembling `token` frames equals
  `done.translation`, so you can drive the cursor from tokens and trust `done`
  for the final text + romanization + register_note.
- **Errors are in-band:** translate failures arrive as `event: error` on a 200
  stream; stt/tts failures are HTTP 503 with `{"detail": "..."}`. Show the
  forgiving "↻ Try again" UX, not an error wall.
- **TTS lang** is `"yue"|"cmn"` only (never `"en"`) — you only ever speak the
  translation, which is the non-English side, or English via the OS/other means.
