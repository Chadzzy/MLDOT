import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  transcribe as apiTranscribe,
  translateStream as apiTranslateStream,
  ttsUrl as apiTtsUrl,
  type Lang,
  type SttResult,
  type TranslateCallbacks,
} from '../../services/api';
import { MOCK_TALK_EXCHANGES } from '../../data/mockTalk';

/**
 * Single injection point for the Talk data flow: the live network pipeline and
 * the offline mock pipeline implement one interface, so SplitScreen's state
 * machine stays identical in both modes (plan §6 dev/demo requirement — the
 * app must still demo with no server). Selection lives in `useTalkPipeline`.
 */

export type Side = 'top' | 'bottom';
export const MOCK_MODE_KEY = 'siklo.mockMode';

export interface UtteranceContext {
  /** Which half was pressed. */
  side: Side;
  /** Language the tapped half expects (en for top, the 粵/普 choice for bottom). */
  expectedSourceLang: Lang;
  /** Language of the other half (translation target when it matches). */
  otherLang: Lang;
}

export interface TalkPipeline {
  readonly mock: boolean;
  transcribe: (fileUri: string | null, ctx: UtteranceContext) => Promise<SttResult>;
  translateStream: (
    params: { text: string; source: Lang; target: Lang },
    cb: TranslateCallbacks
  ) => () => void;
  /** TTS is only for the Chinese side; returns null when nothing should play. */
  ttsUrl: (text: string, lang: Lang) => string | null;
}

// ── Live pipeline ──────────────────────────────────────────────────────────

export const realPipeline: TalkPipeline = {
  mock: false,
  async transcribe(fileUri) {
    if (!fileUri) {
      throw new Error("I didn't catch any audio — hold the button while you speak.");
    }
    return apiTranscribe(fileUri);
  },
  translateStream(params, cb) {
    return apiTranslateStream(params, cb);
  },
  ttsUrl(text, lang) {
    // Server speaks yue/cmn only; English target has no TTS in the MVP.
    if (lang !== 'yue' && lang !== 'cmn') return null;
    return apiTtsUrl(text, lang);
  },
};

// ── Mock pipeline (no server, no network) ────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const isChinese = (s: string) => /[㐀-鿿]/.test(s);

/**
 * Cycles the bundled MOCK_TALK_EXCHANGES, honoring the tapped side so English
 * lands on top and Chinese on the bottom. Stateful across calls (mirrors the
 * prototype's index-cycling mock), so keep one instance per session.
 */
export function createMockPipeline(): TalkPipeline {
  let idx = 0;
  let pendingTranslation = '';

  return {
    mock: true,
    async transcribe(_fileUri, ctx) {
      await delay(450);
      const ex = MOCK_TALK_EXCHANGES[idx % MOCK_TALK_EXCHANGES.length];
      idx += 1;
      if (ctx.side === 'top') {
        pendingTranslation = ex.you.cantonese;
        return { text: ex.you.english, lang: 'en', confidence: 0.97 };
      }
      pendingTranslation = ex.partner.english;
      // Report the toggle's language so direction stays natural in the demo.
      return { text: ex.partner.cantonese, lang: ctx.expectedSourceLang, confidence: 0.96 };
    },
    translateStream(_params, cb) {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const text = pendingTranslation;
      const zh = isChinese(text);
      const tokens = zh ? Array.from(text) : text.split(' ');
      let i = 0;

      const step = () => {
        if (cancelled) return;
        if (i >= tokens.length) {
          cb.onDone({ translation: text, romanization: '', register_note: '' });
          return;
        }
        const sep = zh ? '' : i > 0 ? ' ' : '';
        cb.onToken(sep + tokens[i]);
        i += 1;
        timer = setTimeout(step, zh ? 55 : 90);
      };

      timer = setTimeout(step, 300);
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    },
    ttsUrl() {
      // No audio server in mock mode.
      return null;
    },
  };
}

// ── Selection hook ───────────────────────────────────────────────────────────

const serverConfigured = !!process.env.EXPO_PUBLIC_API_URL;

export interface UseTalkPipelineResult {
  pipeline: TalkPipeline;
  mockMode: boolean;
  toggleMock: () => void;
}

/**
 * Chooses the pipeline: mock when EXPO_PUBLIC_API_URL is unset, or when the
 * user has flipped the 'siklo.mockMode' flag (long-press the LIVE dot). An
 * explicit stored flag wins over the env default in both directions.
 */
export function useTalkPipeline(): UseTalkPipelineResult {
  // null = no stored override → fall back to env presence.
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(MOCK_MODE_KEY).then((v) => {
      if (v === '1') setOverride(true);
      else if (v === '0') setOverride(false);
    });
  }, []);

  const mockMode = override != null ? override : !serverConfigured;

  const mockRef = useRef<TalkPipeline | null>(null);
  if (!mockRef.current) mockRef.current = createMockPipeline();

  const toggleMock = useCallback(() => {
    setOverride((prev) => {
      const current = prev != null ? prev : !serverConfigured;
      const next = !current;
      AsyncStorage.setItem(MOCK_MODE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  return { pipeline: mockMode ? mockRef.current : realPipeline, mockMode, toggleMock };
}
