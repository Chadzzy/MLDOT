# SikLo MVP — Execution Plan (v2, mobile)

**Scope:** Talk (single-device only) + Go, for **Cantonese and Mandarin**, as a **native mobile app** (Expo / React Native). Real speech pipeline built on open-source models. Design follows Duolingo interaction best practices on the HK palette.

**Handover doc for implementing agents.**

## UI source of truth — do not redesign

The Talk and Go experiences were heavily prototyped. Two artifacts define the UI, and the mobile app **ports them faithfully**:

1. **The coded prototype in `siklo/`** — especially `src/components/talk/SplitScreenView.jsx` (split-screen tap-to-talk halves, breathe glow while listening, streaming block-cursor text, centre swap divider, warmer `--bg-elevated` tint on the Cantonese half, larger Traditional characters) and `src/components/go/DestinationCard.jsx` (inverted cream card, 52px characters, full-width 56px audio buttons, driver-note field).
2. **PRD v0.3** — palette, type scale, motion rules (200–300 ms ease-out, nothing bounces), interaction principles.

Any visual deviation from these needs owner sign-off. The Duolingo layer (§6) changes *tactility and feedback*, not layout.

---

## 1. MVP Scope

### In
- **Talk — Single Phone Mode only.** The `SplitScreenView` experience: English half (top) ↔ Cantonese/Mandarin half (bottom), tap-to-talk per half, real mic capture, STT → translation → streamed bilingual text → TTS playback of the translation. 粵/普 toggle for the bottom half.
- **Go.** Destination search over a curated HK POI dataset, free-text fallback via the translation model, driver card, real TTS playback. **Traditional characters for Cantonese, Simplified for Mandarin, switched by the 粵/普 toggle** — exactly as PRD and prototype.
- **Expo (React Native) app**, iOS + Android, dev-client builds. Two-tab bottom nav (Talk, Go); Translate/Learn tabs hidden behind a feature flag, not deleted.

### Out (explicitly)
- Room codes / two-device sessions
- Translate (voice-note) and Learn modes
- Accounts, auth, server-side persistence
- App Store / Play Store submission (EAS builds for TestFlight/internal track only, later)

---

## 2. Model Stack (all open-source or zero-cost)

### STT — speech to text
| Option | Model | Why | Requirements |
|---|---|---|---|
| **Primary** | `Qwen/Qwen3-ASR-1.7B` (agent: verify license text on HF in P1) | Current open-source SOTA for Mandarin + Cantonese + English in one model, with language ID | ~5.1 GB VRAM FP16, ~1.3 GB INT4 |
| **Fallback / CPU tier** | `FunAudioLLM/SenseVoice-Small` | zh/yue/en, non-autoregressive, ~15× faster than Whisper, CPU-viable | tiny |

Auto language detection drives translation direction — the Talk screen never asks which language was spoken.

### MT — translation
**Colloquial spoken Cantonese ≠ written Chinese.** NLLB-200 has `yue_Hant` but skews written; rejected for Talk.

| Option | Model | Why |
|---|---|---|
| **Primary** | `Qwen3-8B-Instruct` via vLLM (or Ollama) | Best colloquial Cantonese among open models; one model covers en↔yue, en↔cmn, and emits Jyutping/Pinyin + register notes in one structured-JSON call |
| **Low-resource tier** | Qwen3-4B quantized (Q4) via Ollama | Laptop-class demo quality |
| **If quality disappoints** | YueTung (Qwen2.5-7B Cantonese fine-tune) | Drop-in swap; decide on the P1 eval set |

Deterministic romanization for Go cards: `ToJyutping` (yue) / `pypinyin` (cmn) server-side.

### TTS — text to speech
| Option | Model | Why |
|---|---|---|
| **Primary (open source)** | `ASLP-lab/Cosyvoice2-Yue` (Apache-2.0 Cantonese fine-tune of CosyVoice2-0.5B) for yue; base `CosyVoice2-0.5B` for cmn | True OSS Cantonese TTS, ~150 ms first-audio, streaming-capable |
| **Zero-deploy tier** | `edge-tts` (free, no key): `zh-HK-HiuGaai/HiuMaan/WanLungNeural` (yue), `zh-CN-Xiaoxiao/YunxiNeural` (cmn) | Nothing to host; pragmatic demo default |

One `/tts` endpoint, `TTS_BACKEND=cosyvoice|edge` env switch.

### Deployment tiers
- **Tier A — laptop/demo (no GPU):** SenseVoice-Small (CPU) + Ollama Qwen3-4B-Q4 + edge-tts. `docker-compose up`, phone connects over LAN.
- **Tier B — single 16 GB GPU (RunPod/Modal):** Qwen3-ASR-1.7B + vLLM Qwen3-8B + CosyVoice2-Yue. Target < 3.5 s tap-release → first translated audio.

---

## 3. Architecture

```
siklo/                # existing web prototype — kept as the UI reference, untouched
siklo-mobile/         # NEW: Expo app (SDK ≥53)
  app/                # expo-router: (tabs)/talk.tsx, (tabs)/go.tsx, go/card.tsx
  src/
    theme/tokens.ts   # palette + type scale ported 1:1 from PRD/prototype CSS vars
    components/       # Button (tactile), Chip, Card, Waveform, StreamingText
    features/talk/    # SplitScreen, useRecorder, useTranslateStream
    features/go/      # Search, DestinationCard, poi search (fuse.js)
    services/api.ts   # STT / translate-SSE / TTS client
    data/hk_poi.json  # bundled POI dataset
siklo-server/         # NEW: FastAPI backend
  app/routers/  stt.py  translate.py  tts.py  go.py
  app/services/ stt_*.py  mt_qwen.py  tts_*.py  romanize.py
  Dockerfile, docker-compose.yml, .env.example
```

**Mobile-specific decisions:**
- **Audio capture:** `expo-audio` (SDK ≥53; `expo-av` is dead). Records m4a/aac on both platforms — one codec path, backend decodes via ffmpeg. Tap-to-talk = press starts `AudioRecorder`, release stops and uploads. Silence auto-stop (≥ 800 ms) via metering callback as backup.
- **Live waveform while listening:** drive the prototype's waveform bars from `expo-audio` metering levels — real amplitude, not the timer fake.
- **Streaming translation text:** SSE via `react-native-sse` (or `expo/fetch` streaming) → feeds the ported `useStreamingText` cursor with real tokens.
- **TTS playback:** `expo-audio` player streaming from the `/tts` URL; start on first chunk.
- **Haptics:** `expo-haptics` — light impact on tap-to-talk press/release, success notification on translation complete.
- **Storage:** AsyncStorage (recents, toggle state), `expo-file-system` (cached Go-card audio for offline taxi use).
- **Styling:** plain `StyleSheet` + `theme/tokens.ts`. No UI library (PRD rule: component libraries will fight this design). Font via `expo-font` (Plus Jakarta Sans).
- **Navigation:** expo-router tabs, 2 visible tabs, PRD bottom-nav spec (64px, amber active with 2px top indicator).

**Latency budget (Tier B):** STT ≤ 1.2 s, MT first-token ≤ 0.6 s, TTS first-audio ≤ 0.8 s → speech-to-first-audio ~2.5–3.5 s. Every stage shows its indicator ("Listening…", "Translating…", "Speaking…") — never blank.

---

## 4. Talk — Single Device (port spec)

Port `SplitScreenView.jsx` to RN, preserving: half-screen tap targets, breathe glow while listening, `--bg-elevated` tint + larger Traditional characters on the bottom half, centre divider with swap icon, streaming block cursor `▋`, LIVE indicator + session timer.

**Flow per utterance:**
1. Press-and-hold your half → haptic tick, mic starts, half glows, waveform renders live metering.
2. Release (or silence auto-stop) → "Translating…" → upload to `/api/stt`.
3. STT returns `{text, lang}` → source text renders instantly → SSE `/api/translate` streams the translation into the *other* half with the cursor.
4. Translation complete → cursor fades (400 ms per PRD), success haptic, auto-play TTS of the translation (toggleable), speaker icon pulses during playback.
5. Exchanges append to an in-session transcript; latest pinned large.

**Language handling:** top = English; bottom = 粵/普 toggle (persisted). If STT detects a language that doesn't match the tapped half, translate in the correct direction anyway and show a gentle "Heard Cantonese — translated it for you" hint. Never an error wall.

---

## 5. Go (port spec)

- **POI dataset:** `hk_poi.json`, ~200 entries: `{ name_yue (Traditional), name_cmn (Simplified), name_en, area, landmark_yue, landmark_cmn, landmark_en, jyutping, pinyin, aliases[] }`. MTR stations, hospitals, malls, airport/ferry/border, major streets. LLM-generated, human spot-check top 50.
- **Search:** client-side fuzzy (fuse.js) over en/zh/aliases — instant, offline. No match → "Translate '…' as a destination" via `/api/translate`.
- **Card:** port `DestinationCard.jsx` exactly (inverted cream, 52px chars, 56px audio buttons). 粵 shows Traditional + Jyutping context, 普 shows Simplified + Pinyin context — toggle switches both script and audio language, as prototyped. Driver note → `/api/translate` to both languages, rendered on card.
- **Offline resilience:** card renders from bundled data; generated audio cached to `expo-file-system`; recents in AsyncStorage.

---

## 6. Design — Duolingo interaction layer × HK palette

Palette, type, layout: **unchanged from prototype/PRD.** The Duolingo layer adds tactility and feedback only:

1. **Chunky tactile buttons** — primary actions get a 4px darker bottom edge (amber → `#B05E1F`) that compresses on press (`translateY(2px)`). Applies to Go's audio buttons and CTAs; the Talk halves keep their full-bleed glow interaction.
2. **One primary action per screen** — Talk: the halves. Go: the search field.
3. **Multi-channel feedback** — every state change: color + motion + haptic. Success = jade + soft chime; retry = amber shake, never harsh red.
4. **One earned celebration per mode** — first successful exchange of a Talk session: brief jade particle burst. Go card generated: damped spring slide-up (≤ 4px overshoot; PRD's "nothing bounces" holds everywhere else).
5. **Never-blank progress** — prototype's waveform/step indicators, staged labels.
6. **Forgiving errors** — low-confidence STT shows best guess + "↻ Try again" chip.
7. **Streaks-lite** — "3 exchanges today" counter in header; hooks for Learn later, no XP/leagues.
8. **Copy voice** — short, warm, second person: "Hold and speak — I'll handle the Cantonese."

---

## 7. Execution phases (agent handover)

| Phase | Work | Agent | Depends on |
|---|---|---|---|
| **P1 — Backend** | `siklo-server/` FastAPI, 4 endpoints on Tier A models, m4a/aac ffmpeg decode, docker-compose, smoke tests with fixture recordings, 30-sentence Cantonese MT eval | Opus | — |
| **P2 — Expo scaffold + port** | `siklo-mobile/` Expo app, tokens.ts from prototype CSS, tactile component set, 2-tab nav, pixel-faithful static ports of SplitScreen + GoHome + DestinationCard | Sonnet | — (parallel) |
| **P3 — Talk live** | expo-audio recording + metering waveform, STT/translate-SSE/TTS wiring, haptics, transcript, toggle, recovery UX | Opus | P1 + P2 |
| **P4 — Go live** | hk_poi.json curation, fuse.js search, free-text fallback, real TTS + audio caching, driver notes | Sonnet | P1 + P2 |
| **P5 — Tier B + verify** | vLLM Qwen3-8B + Qwen3-ASR + CosyVoice2-Yue env switches, latency measurement, end-to-end verify on device (both flows), README for both tiers | Opus | P3 + P4 |

**Definition of done:** with `docker-compose up` on a laptop and the Expo dev client on a phone (same LAN), a user can (a) hold-and-speak English and hear/read colloquial Cantonese or Mandarin, and the reverse; (b) search "Mong Kok", show the driver card in 粵 (Traditional) or 普 (Simplified), and play real audio in either — no cloud API keys.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Colloquial Cantonese MT quality from prompted Qwen | P1 eval set (building-manager / taxi / market scenarios); swap to YueTung if weak |
| CosyVoice2-Yue naturalness | edge-tts tier always available; A/B in P5 |
| Qwen3-ASR license terms | Verify on HF card in P1; SenseVoice fallback |
| expo-audio metering granularity for live waveform | Fallback: animate from recording state only (prototype behavior) — cosmetic, not blocking |
| Phone ↔ laptop LAN friction in Tier A demos | Document `EXPO_PUBLIC_API_URL`; optional tunnel (cloudflared) in compose |
| GPU hosting cost for Tier B | Owner decision on budget; **not blocking** — Tier A runs end-to-end |
