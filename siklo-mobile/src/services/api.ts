/**
 * SikLo API client — the single contract between the mobile app and
 * siklo-server. Owned by the Talk feature (P3); Go (P4) consumes it
 * read-only and keeps any go-specific helpers in features/go.
 *
 * Server contracts (see siklo-server/README.md):
 * - POST /api/stt        multipart field "audio" -> { text, lang, confidence }
 * - POST /api/translate  JSON { text, source, target } -> SSE stream:
 *     event: token  data: {"t": "..."}      (repeated)
 *     event: done   data: { translation, romanization, register_note }
 *     event: error  data: { message }       (in-band, HTTP stays 200)
 * - GET/POST /api/tts    { text, lang: "yue"|"cmn", voice? } -> audio/mpeg
 * - GET /api/destinations?q= -> POI search results
 *
 * Valid translate directions: en<->yue, en<->cmn only.
 */

import { fetch as expoFetch } from 'expo/fetch';

export type Lang = 'en' | 'yue' | 'cmn';
export type TargetLang = Exclude<Lang, never>;

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

/** Network calls that can otherwise hang forever abort after this long. */
const REQUEST_TIMEOUT_MS = 15000;

/**
 * fetch with a hard timeout so a stalled network can't strand the Talk state
 * machine in `transcribing` (or Go in a pending search). Aborts after
 * `timeoutMs` and rethrows a friendly, actionable error.
 */
async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export interface SttResult {
  text: string;
  lang: Lang;
  confidence: number;
}

export interface TranslateResult {
  translation: string;
  romanization: string;
  register_note: string;
}

export interface TranslateCallbacks {
  onToken: (token: string) => void;
  onDone: (result: TranslateResult) => void;
  onError: (detail: string) => void;
}

/** Upload a recorded audio file (m4a/aac/wav) for transcription. */
export async function transcribe(fileUri: string): Promise<SttResult> {
  const form = new FormData();
  // React Native FormData file part
  form.append('audio', {
    uri: fileUri,
    name: 'utterance.m4a',
    type: 'audio/mp4',
  } as unknown as Blob);

  const res = await fetchWithTimeout(`${API_BASE}/api/stt`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `STT failed (${res.status})`);
  }
  return res.json();
}

/**
 * Stream a translation over SSE. Returns an abort function.
 * Uses expo/fetch which supports response body streaming in Expo SDK 52+.
 */
export function translateStream(
  params: { text: string; source: Lang; target: Lang },
  cb: TranslateCallbacks,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await expoFetch(`${API_BASE}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        cb.onError(`Translate failed (${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let settled = false; // saw a terminal `done`/`error` frame

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          let event = 'message';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data) continue;

          if (event === 'token') {
            cb.onToken(JSON.parse(data).t as string);
          } else if (event === 'done') {
            settled = true;
            cb.onDone(JSON.parse(data) as TranslateResult);
          } else if (event === 'error') {
            // Server emits `{ message }`; tolerate `{ detail }` too for safety.
            settled = true;
            const parsed = JSON.parse(data);
            cb.onError((parsed.message ?? parsed.detail) as string ?? 'Translation error');
          }
        }
      }

      // Stream closed without a terminal frame (e.g. dropped connection mid-
      // stream): surface an error so the caller never hangs on "Translating…".
      if (!settled && !controller.signal.aborted) {
        cb.onError('Translation stopped early. Try again.');
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        cb.onError(e instanceof Error ? e.message : 'Network error');
      }
    }
  })();

  return () => controller.abort();
}

/** URL the audio player can stream TTS from directly (GET variant). */
export function ttsUrl(text: string, lang: 'yue' | 'cmn', voice?: string): string {
  const q = new URLSearchParams({ text, lang });
  if (voice) q.set('voice', voice);
  return `${API_BASE}/api/tts?${q.toString()}`;
}

export interface Destination {
  name_yue: string;
  name_cmn: string;
  name_en: string;
  area: string;
  landmark_yue: string;
  landmark_cmn: string;
  landmark_en: string;
  jyutping: string;
  pinyin: string;
  aliases: string[];
}

/** Server-side POI search (fallback to bundled data lives in features/go). */
export async function searchDestinations(q: string): Promise<Destination[]> {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/destinations?q=${encodeURIComponent(q)}`,
  );
  if (!res.ok) throw new Error(`Destination search failed (${res.status})`);
  const body = await res.json();
  return (body.results ?? body) as Destination[];
}
