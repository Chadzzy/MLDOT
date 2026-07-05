# SikLo

A native mobile translator for **Hong Kong Cantonese and Mandarin**, built on
open-source speech models — no cloud API keys. Two experiences:

- **Talk** — split-screen, tap-to-talk. Hold your half, speak English, and
  hear + read colloquial Cantonese (or Mandarin) on the other half; release and
  it flows back the other way. Real mic capture → STT → translation (streamed)
  → TTS playback, with auto language detection so it never asks which language
  you spoke.
- **Go** — search a curated HK POI dataset (MTR, hospitals, malls,
  airport/ferry/border), show a driver card in 粵 (Traditional + Jyutping) or 普
  (Simplified + Pinyin), and play real audio for the taxi driver.

The full product spec is `docs/MVP_PLAN.md` (model stack, phases, latency
budget, risks). This README gets a developer from clone to a phone demo.

## Repo layout

This directory (`siklo/`) is the original **web prototype** — the pixel-faithful
UI reference (Vite + React). The shipping app and its backend are siblings:

```
siklo/          # web prototype — UI source of truth (SplitScreenView, DestinationCard)
../siklo-mobile # Expo / React Native app (the product): Talk + Go, 2-tab nav
../siklo-server # FastAPI backend: /api/stt, /api/translate (SSE), /api/tts, /api/destinations
```

- `../siklo-server/README.md` — backend endpoints, backends, both tiers in depth.
- `docs/MVP_PLAN.md` — the handover plan.

## Model stack (two deployment tiers)

| Stage | Tier A (laptop/demo, no GPU) | Tier B (single 16 GB GPU) |
|---|---|---|
| STT | SenseVoice-Small (CPU, funasr) | Qwen3-ASR-1.7B (Apache-2.0) |
| MT  | Qwen3-4B/8B via Ollama | Qwen3-8B-Instruct via vLLM |
| TTS | edge-tts (free, no key) | CosyVoice2-Yue + CosyVoice2-0.5B |

Every backend is env-switched and has a `mock` default, so the server and its
tests run anywhere with no weights and no network.

---

## Quickstart — Tier A demo (phone + laptop, same Wi-Fi)

### 1. Backend

```bash
cd ../siklo-server
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000   # 0.0.0.0 so the phone can reach it
```

`http://localhost:8000/healthz` shows the active backends. This runs in **mock
mode** out of the box (canned STT, echo MT, silent MP3) — enough to exercise the
whole app. For real speech on a laptop, install the Tier A extras and flip the
env vars:

```bash
pip install -r requirements-tier-a.txt   # funasr + torch (multi-GB); needs ffmpeg on PATH
ollama pull qwen3:8b                      # or qwen3:4b for laptop-class quality
# in .env:  STT_BACKEND=sensevoice  MT_BACKEND=qwen  TTS_BACKEND=edge  MT_MODEL=qwen3:8b
```

Or with Docker (bundles ffmpeg):
```bash
docker compose up                        # api (mock/edge; qwen via host Ollama)
docker compose --profile tier-a-llm up   # api + a local Ollama container
docker compose exec ollama ollama pull qwen3:8b
```

### 2. Find your LAN IP

```bash
ipconfig getifaddr en0        # macOS Wi-Fi
hostname -I | awk '{print $1}'  # Linux
```

### 3. Mobile app (Expo dev client)

```bash
cd ../siklo-mobile
npm install
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000 npx expo start
```

Open the **dev client** on a phone on the same Wi-Fi (scan the QR). The phone
talks to the laptop's `:8000` over the LAN. If the phone can't reach it, check
the firewall or use a tunnel (`npx expo start --tunnel`, or cloudflared to the
API).

You should now be able to hold-and-speak on Talk and search a destination on Go.

---

## Tier B setup (single GPU: RunPod / Modal / a 16 GB card)

Target: tap-release → first translated audio **< 3.5 s** (plan §3 budget).

```bash
cd ../siklo-server
# STT (Qwen3-ASR) + TTS (CosyVoice2) extras — GPU host only:
pip install -r requirements-tier-b.txt
# CosyVoice is not on PyPI — clone it and put it on PYTHONPATH:
git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git
export PYTHONPATH=$PYTHONPATH:$PWD/CosyVoice:$PWD/CosyVoice/third_party/Matcha-TTS
# download weights into COSYVOICE_YUE_DIR / COSYVOICE_CMN_DIR and provide a
# short 16 kHz reference clip at COSYVOICE_PROMPT_WAV (see .env.example).
```

Or via compose (vLLM for MT + the heavy api image, GPU-reserved):

```bash
docker compose --profile tier-b up api-tier-b vllm
# (naming the services keeps the default Tier A `api` from also binding :8000)
```

The `tier-b` profile sets `STT_BACKEND=qwen3asr`, `MT_BACKEND=qwen`
(`MT_API_STYLE=openai` → the `vllm` service serving `Qwen3-8B-Instruct`), and
`TTS_BACKEND=cosyvoice`. Model weights cache in the `hf-cache` /
`pretrained-models` named volumes.

**Measure the pipeline:**
```bash
python scripts/measure_latency.py --url http://<gpu-host>:8000 -n 20
```
Prints p50/p95 for STT, translate-first-token and TTS-first-audio, plus the
summed speech→first-audio estimate vs the 3.5 s budget. Run it **from the
phone's network** for a true on-device figure.

---

## Remaining manual verification (on device — can't be done in CI)

The code paths, mock-mode tests, and compose config are all validated
automatically. These require a real phone + a running server and are the
outstanding sign-off items:

- [ ] **Tier B latency vs budget** — run `measure_latency.py` against the GPU
      server from the phone's Wi-Fi; confirm tap-release → first audio < 3.5 s.
      This is the only place real STT/MT/TTS latency is exercised (no GPU in CI).
- [ ] **Mic metering waveform** — hold a Talk half and confirm the waveform bars
      track real amplitude (expo-audio metering), not a timer fake.
- [ ] **Tap-to-audio feel** — press/release haptics fire, "Listening… /
      Translating… / Speaking…" indicators never blank, success chime + jade
      burst on first exchange.
- [ ] **Language mismatch UX** — speak Cantonese into the English half; confirm
      it still translates the correct direction and shows the gentle
      "Heard Cantonese — translated it for you" hint (never an error wall).
- [ ] **Go TTS caching / offline** — generate a driver card, kill the network,
      reopen it: card renders from bundled data and cached audio replays
      (expo-file-system). Recents persist (AsyncStorage).
- [ ] **粵/普 toggle** — switches both script (Traditional↔Simplified) and audio
      language on Go and the Talk bottom half; state persists across restarts.
- [ ] **CosyVoice2-Yue naturalness A/B** — compare against edge-tts (plan §8);
      the edge tier stays available as a fallback.
- [ ] **Network resilience** — with the server down, STT/search time out after
      15 s with a friendly retry (not a hung `transcribing` state).
