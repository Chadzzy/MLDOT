# SikLo MVP — Execution Plan

**Scope:** Talk (single-device only) + Go, for **Cantonese and Mandarin**. Real speech pipeline built on open-source models. Design follows Duolingo best practices on the existing HK-inspired palette.

**Handover doc for implementing agents.** The prototype in `siklo/` is the UX reference — keep its visual language, replace mocks with the real pipeline described here.

---

## 1. MVP Scope

### In
- **Talk — Single Phone Mode only.** Split-screen: English speaker (top) ↔ Cantonese/Mandarin speaker (bottom). Tap-to-talk, real mic capture, STT → translation → streamed bilingual text → TTS playback of the translation. Language toggle for the bottom half (粵 Cantonese / 普 Mandarin).
- **Go.** Destination search over a curated HK POI dataset, free-text fallback via the translation model, driver card (inverted light theme, 52px chars), real TTS playback in Cantonese and Mandarin, driver notes translated to both.
- **PWA-ready web app** (mobile-first, installable). No native builds.

### Out (explicitly)
- Room codes / two-device sessions, WebSockets between users
- Translate (voice-note) and Learn modes
- Accounts, auth, persistence beyond localStorage
- Reactions system (Talk single-device doesn't need it)

---

## 2. Model Stack (all open-source or zero-cost)

### STT — speech to text
| Option | Model | Why | Requirements |
|---|---|---|---|
| **Primary** | `Qwen/Qwen3-ASR-1.7B` (Apache-style Qwen license — agent: verify license text on HF before shipping) | Current open-source SOTA for Mandarin + Cantonese + English; single model handles all three with language ID | ~5.1 GB VRAM FP16, ~1.3 GB INT4 |
| **Fallback / CPU tier** | `FunAudioLLM/SenseVoice-Small` | zh/yue/en/ja/ko, non-autoregressive, ~15× faster than Whisper, runs on CPU | CPU-viable, tiny |

Both auto-detect language → the Talk screen never asks "which language was that?" — detection drives translation direction.

### MT — translation
The hard problem: **colloquial spoken Cantonese ≠ written Chinese.** NLLB-200 has `yue_Hant` but skews written; unacceptable for Talk.

| Option | Model | Why |
|---|---|---|
| **Primary** | `Qwen3-8B-Instruct` (or Qwen2.5-7B-Instruct) served via vLLM or Ollama | Best colloquial Cantonese among open models; one model covers en↔yue, en↔cmn, and generates Jyutping + context notes in the same call. Prompted, not fine-tuned. |
| **Low-resource tier** | Qwen3-4B quantized (Q4) via Ollama/llama.cpp | Runs on a laptop; acceptable quality for demo |
| **Rejected** | NLLB-200-600M | Written-Chinese bias for yue; keep only as offline emergency fallback |

**Translation prompt contract** (structured JSON out): `{ translation, romanization (Jyutping for yue / Pinyin for cmn), register_note }`. Use vLLM guided JSON or Ollama format=json. Romanization can also come from `ToJyutping`/`pycantonese` (deterministic, preferred for Go cards).

### TTS — text to speech
| Option | Model | Why |
|---|---|---|
| **Primary (open source)** | `ASLP-lab/Cosyvoice2-Yue` (Cantonese fine-tune of CosyVoice2-0.5B, Apache-2.0) for yue; base `CosyVoice2-0.5B` for cmn | True open-source Cantonese TTS, ~150 ms first-audio latency, streaming-capable |
| **Zero-deploy tier** | `edge-tts` (Microsoft neural voices, free, no key): `zh-HK-HiuGaaiNeural` / `zh-HK-WanLungNeural` (yue), `zh-CN-XiaoxiaoNeural` (cmn) | Nothing to host; not OSS but zero-cost pragmatic default for demos |
| **Alternative** | GPT-SoVITS v2 (Cantonese cross-lingual) | Only if CosyVoice2-Yue quality disappoints; heavier to operate |

**Recommendation:** ship both tiers behind one `/tts` endpoint with a `TTS_BACKEND=cosyvoice|edge` env switch. Demos run on edge-tts with zero GPU; the open-source story is CosyVoice2-Yue.

### Deployment tiers
- **Tier A — laptop/demo (no GPU):** SenseVoice-Small (CPU) + Ollama Qwen3-4B-Q4 + edge-tts. Everything in `docker-compose up`.
- **Tier B — single 16 GB GPU (RunPod/Modal/HF Space):** Qwen3-ASR-1.7B + vLLM Qwen3-8B + CosyVoice2-Yue. Target < 3.5 s tap-release → first translated audio.

---

## 3. Architecture

```
siklo/                          # existing Vite React app → becomes the client
siklo-server/                   # NEW: FastAPI backend
  app/
    main.py                     # FastAPI, CORS, static
    routers/
      stt.py                    # POST /api/stt        (audio blob → {text, lang})
      translate.py              # POST /api/translate  ({text, source, target} → {translation, romanization, note})
      tts.py                    # POST /api/tts        ({text, lang, voice} → audio/mpeg, streamed)
      go.py                     # GET  /api/destinations?q=  (POI search + LLM fallback)
    services/
      stt_qwen.py / stt_sensevoice.py
      mt_qwen.py                # prompt templates per direction, JSON-schema output
      tts_cosyvoice.py / tts_edge.py
      romanize.py               # ToJyutping / pypinyin
    data/
      hk_poi.json               # ~200 curated HK destinations (see §5)
  Dockerfile, docker-compose.yml, .env.example
```

- **Client mic capture:** `MediaRecorder` (webm/opus) with a tap-to-talk button; client-side VAD (`@ricky0123/vad-web`) auto-stops on silence ≥ 800 ms as backup to manual release.
- **Streaming UX:** `/api/translate` streams tokens (SSE) → drives the existing `useStreamingText` cursor with *real* tokens instead of the timer fake. `/api/tts` streams audio; start playback on first chunk.
- **No WebSockets needed** (single device): plain fetch + SSE.
- **Latency budget (Tier B):** STT ≤ 1.2 s, MT first-token ≤ 0.6 s, TTS first-audio ≤ 0.8 s → speech-to-first-audio ~2.5–3.5 s. Show the existing waveform/typing indicators during each stage — never blank (PRD rule).

---

## 4. Talk — Single Device (rebuild spec)

Base: existing `SplitScreenView.jsx`, promoted to *the* Talk mode. Delete `TalkHome` session cards, room-code flow, `useSimulatedSession`, `TalkView` (two-device).

**Flow per utterance:**
1. Tap your half → mic starts, half glows (existing breathe animation), waveform renders live mic amplitude (`AnalyserService` on the audio stream — real, not fake).
2. Release (or VAD silence) → "Translating…" state → POST `/api/stt`.
3. STT returns `{text, lang}` → render source text instantly → SSE `/api/translate` streams the translation into the *other* half with the block cursor.
4. On translation complete → auto-play TTS of the translation (toggleable), speaker icon pulses during playback.
5. Both utterances append to a scrollable in-session transcript; latest exchange pinned large.

**Language handling:** top half = English. Bottom half = toggle 粵/普 (persisted in localStorage). STT auto-detect guards against wrong-half taps: if detected lang ≠ expected half, translate in the correct direction anyway and show a gentle "Heard Cantonese — translated it for you" hint. That's a Duolingo move: never punish, always recover.

---

## 5. Go (rebuild spec)

- **POI dataset:** curate `hk_poi.json` (~200 entries): MTR stations, hospitals, malls, airport/ferry/border points, major streets & tourist areas. Fields: `{ name_yue, name_cmn (Simplified), name_en, area, landmark_yue, landmark_cmn, landmark_en, jyutping, pinyin, aliases[] }`. Build it with an LLM pass then human-spot-check the top 50.
- **Search:** client-side fuzzy (fuse.js) over English/Chinese/aliases — instant, offline-friendly. No match → "Translate '…' as a destination" action that calls `/api/translate` and builds a card from free text.
- **Card:** keep the existing inverted cream design exactly. Play buttons call real `/api/tts` (yue and cmn). Driver note field → `/api/translate` to both languages, shown on the card.
- **Offline resilience (taxi = flaky signal):** cache generated card audio in IndexedDB; card itself renders from local data. Recent destinations in localStorage.

---

## 6. Design — Duolingo best practices × HK palette

Keep the palette and typography from the PRD verbatim. Layer on Duolingo's interaction grammar:

1. **Chunky tactile buttons** — primary actions get a 4px darker bottom edge (`box-shadow: 0 4px 0 #B05E1F`) that compresses on press (`translateY(2px)`, shadow 2px). Amber primary, jade secondary. This is the single biggest "feels like Duolingo" change.
2. **One primary action per screen** — Talk: the mic. Go: the search field. Everything else recedes.
3. **Immediate, multi-channel feedback** — every state change gets color + motion + (mobile) `navigator.vibrate(10)`. Success = jade flash + soft chime; error = amber shake (never red-harsh, never blame).
4. **Celebration moments, used sparingly** — first successful Talk exchange of a session: brief jade particle burst behind the transcript. Go card generated: card slides up with a satisfying spring (keep PRD's "nothing bounces" rule elsewhere — this is the one earned exception, spring damped, no overshoot > 4px).
5. **Never-blank progress** — reuse existing waveform/step indicators; label each stage ("Listening…", "Translating…", "Speaking…").
6. **Forgiving errors** — STT low-confidence → show best guess with a one-tap "↻ Try again" chip instead of an error state.
7. **Streaks-lite** — a small session counter ("3 exchanges today") in the header. No XP/leagues in MVP; hooks for Learn later.
8. **Copy voice** — short, warm, second person. "Hold and speak — I'll handle the Cantonese."

Deliverable: extract the design system into `siklo/src/styles/tokens.css` + a small `Button`/`Chip`/`Card` component set so both modes share the tactile language.

---

## 7. Execution phases (agent handover)

| Phase | Work | Agent | Depends on |
|---|---|---|---|
| **P1 — Backend scaffold** | `siklo-server/` FastAPI + all 4 endpoints with Tier A models (SenseVoice CPU, Ollama Qwen3-4B, edge-tts), docker-compose, smoke tests hitting each endpoint with a fixture WAV | Opus | — |
| **P2 — Design system refactor** | tokens.css, tactile Button/Chip/Card, strip Translate/Learn/two-device-Talk to feature-flag stubs, bottom nav → 2 tabs (Talk, Go) | Sonnet | — (parallel with P1) |
| **P3 — Talk rebuild** | Real mic capture + VAD, wire STT/translate-SSE/TTS, live waveform, transcript, language toggle, recovery UX | Opus | P1 + P2 |
| **P4 — Go rebuild** | hk_poi.json curation, fuse.js search, free-text fallback, real TTS on card, driver notes, IndexedDB audio cache | Sonnet | P1 + P2 |
| **P5 — Tier B + polish** | vLLM Qwen3-8B + Qwen3-ASR + CosyVoice2-Yue behind env switches; latency measurement; `/verify` pass driving both flows end-to-end; README with both run tiers | Opus | P3 + P4 |

Each phase lands as a separate commit series on `claude/build-siklo-prototype-2i5Iq` (or a child branch per phase, merged back).

**Definition of done (MVP):** on a laptop with `docker-compose up` + `npm run dev`, a user can (a) speak English and hear/read colloquial Cantonese and Mandarin translations, and the reverse; (b) search "Mong Kok", show the driver card, and play real Cantonese/Mandarin audio — all with no cloud API keys.

---

## 8. Risks & open decisions

| Risk | Mitigation |
|---|---|
| Colloquial Cantonese MT quality from prompted Qwen | Build a 30-sentence eval set (building-manager / taxi / market scenarios), score during P1; if weak, try YueTung (Qwen2.5-7B Cantonese fine-tune) as drop-in |
| CosyVoice2-Yue naturalness | edge-tts tier is always available; A/B in P5 |
| Qwen3-ASR license terms | Verify on HF model card in P1; SenseVoice fallback if restrictive |
| iOS Safari MediaRecorder quirks (no webm) | Record as mp4/aac on Safari (feature-detect), backend accepts both via ffmpeg decode |
| GPU hosting cost for Tier B | Decision needed from owner: RunPod/Modal budget, or demo stays Tier A. **Not blocking** — plan runs Tier A end-to-end |

**Open question for the owner (non-blocking):** Mandarin script for Go cards — PRD shows Simplified (mainland drivers); confirm, else render Traditional with a script toggle.
