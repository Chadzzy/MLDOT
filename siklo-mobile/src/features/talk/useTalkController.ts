import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { StreamingTextHandle } from '../../components/StreamingText';
import type { Lang } from '../../services/api';
import { useRecorder } from '../../hooks/useRecorder';
import type { Side, TalkPipeline } from './pipeline';

/**
 * Talk state machine + orchestration. One utterance walks:
 *
 *   idle → recording → transcribing → translating → speaking → idle
 *
 * Every terminal path (success, low-confidence, STT/translate/TTS error,
 * discard, no-audio) returns to `idle`, so the UI never sticks on a stage
 * label. Errors are amber + retryable, never a wall (plan §6).
 */

export type TalkStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'translating'
  | 'speaking'
  | 'error';

export type BottomLang = 'yue' | 'cmn';

export interface ExchangeLine {
  id: number;
  english: string;
  chinese: string;
  chineseLang: BottomLang;
  romanization: string;
  ttsUrl: string | null;
}

export interface ActiveExchange {
  id: number;
  side: Side;
  sourceLang: Lang;
  sourceText: string;
  targetLang: Lang;
  /** Half the translation streams into ('top' English, 'bottom' Chinese). */
  streamingSide: Side;
  lowConfidence: boolean;
}

const AUTOPLAY_KEY = 'siklo.autoPlayTts';
const LANG_NAME: Record<Lang, string> = { en: 'English', yue: 'Cantonese', cmn: 'Mandarin' };

export interface TalkController {
  status: TalkStatus;
  transcript: ExchangeLine[];
  active: ActiveExchange | null;
  hint: string | null;
  errorMessage: string | null;
  /** Set while a retryable failure/low-confidence is showing a chip. */
  retrySide: Side | null;
  // recorder view state
  isRecording: boolean;
  recordingSide: Side | null;
  levels: number[];
  meteringAvailable: boolean;
  permissionDenied: boolean;
  // tts
  autoPlay: boolean;
  isSpeaking: boolean;
  toggleAutoPlay: () => void;
  stopSpeaking: () => void;
  replayLatest: () => void;
  // interactions
  press: (side: Side) => void;
  release: () => void;
  retry: () => void;
  reset: () => void;
  /** Callback ref for the streaming half's StreamingText. */
  setStreamHandle: (h: StreamingTextHandle | null) => void;
}

export function useTalkController(
  pipeline: TalkPipeline,
  bottomLang: BottomLang,
  onExchangeComplete: () => void
): TalkController {
  const [status, setStatus] = useState<TalkStatus>('idle');
  const [transcript, setTranscript] = useState<ExchangeLine[]>([]);
  const [active, setActive] = useState<ActiveExchange | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrySide, setRetrySide] = useState<Side | null>(null);
  const [recordingSide, setRecordingSide] = useState<Side | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);

  const statusRef = useRef(status);
  statusRef.current = status;
  const sideRef = useRef<Side | null>(null);
  const bottomLangRef = useRef(bottomLang);
  bottomLangRef.current = bottomLang;
  const idRef = useRef(0);
  const abortStreamRef = useRef<(() => void) | null>(null);

  // Streaming-text handle plumbing (buffers tokens until the node mounts so no
  // early SSE token is dropped between setActive and the commit).
  const handleRef = useRef<StreamingTextHandle | null>(null);
  const pendingTokens = useRef<string[]>([]);
  const flushTokens = useCallback(() => {
    const h = handleRef.current;
    if (!h) return;
    while (pendingTokens.current.length) h.pushToken(pendingTokens.current.shift()!);
  }, []);
  const setStreamHandle = useCallback(
    (h: StreamingTextHandle | null) => {
      handleRef.current = h;
      if (h) flushTokens();
    },
    [flushTokens]
  );

  // ── TTS player ──
  const player = useAudioPlayer(undefined);
  const playerStatus = useAudioPlayerStatus(player);
  const isSpeaking = status === 'speaking';

  useEffect(() => {
    AsyncStorage.getItem(AUTOPLAY_KEY).then((v) => {
      if (v === '0') setAutoPlay(false);
    });
  }, []);

  // Return to idle when TTS playback finishes on its own.
  useEffect(() => {
    if (statusRef.current === 'speaking' && playerStatus.didJustFinish) {
      setStatus('idle');
    }
  }, [playerStatus.didJustFinish]);

  const stopSpeaking = useCallback(() => {
    try {
      player.pause();
    } catch {
      /* no-op */
    }
    if (statusRef.current === 'speaking') setStatus('idle');
  }, [player]);

  const speak = useCallback(
    (url: string) => {
      try {
        player.replace(url);
        player.seekTo(0);
        player.play();
        setStatus('speaking');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {
        setStatus('idle');
      }
    },
    [player]
  );

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => {
      const next = !prev;
      AsyncStorage.setItem(AUTOPLAY_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const replayLatest = useCallback(() => {
    if (statusRef.current === 'speaking') {
      stopSpeaking();
      return;
    }
    if (statusRef.current !== 'idle') return;
    const last = transcript[transcript.length - 1];
    if (last?.ttsUrl) speak(last.ttsUrl);
  }, [transcript, speak, stopSpeaking]);

  // ── Recorder (silence auto-stop routes to the same release path as manual) ──
  const releaseRef = useRef<() => void>(() => {});
  const recorder = useRecorder(() => releaseRef.current());

  const fail = useCallback((message: string, side: Side) => {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setActive(null);
    setErrorMessage(message);
    setRetrySide(side);
    setStatus('error');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, []);

  const processUtterance = useCallback(
    async (uri: string | null, side: Side) => {
      const expectedSourceLang: Lang = side === 'top' ? 'en' : bottomLangRef.current;
      const otherLang: Lang = side === 'top' ? bottomLangRef.current : 'en';

      let stt;
      try {
        stt = await pipeline.transcribe(uri, { side, expectedSourceLang, otherLang });
      } catch (e) {
        fail(e instanceof Error ? e.message : 'That didn’t go through. Try again.', side);
        return;
      }

      if (!stt.text?.trim()) {
        fail("I didn't catch that — give it another go.", side);
        return;
      }

      // Direction: English always translates to the session's Chinese variant;
      // any Chinese always translates to English. This can never form the
      // unsupported yue↔cmn pair.
      let source: Lang;
      let target: Lang;
      if (stt.lang === 'en') {
        source = 'en';
        target = bottomLangRef.current;
      } else {
        source = stt.lang;
        target = 'en';
      }

      // Gentle mismatch hint when the detected language isn't what this half
      // expected — we still translate the correct way (plan §4, never a wall).
      setHint(stt.lang !== expectedSourceLang ? `Heard ${LANG_NAME[stt.lang]} — translated it for you` : null);

      const lowConfidence = stt.confidence < 0.6;
      const streamingSide: Side = source === 'en' ? 'bottom' : 'top';
      const id = ++idRef.current;

      handleRef.current = null;
      pendingTokens.current = [];
      setActive({ id, side, sourceLang: source, sourceText: stt.text, targetLang: target, streamingSide, lowConfidence });
      if (lowConfidence) setRetrySide(side);
      setStatus('translating');

      abortStreamRef.current = pipeline.translateStream(
        { text: stt.text, source, target },
        {
          onToken: (tok) => {
            pendingTokens.current.push(tok);
            flushTokens();
          },
          onDone: (result) => {
            abortStreamRef.current = null;
            handleRef.current?.finish();
            const chineseLang = bottomLangRef.current;
            const english = source === 'en' ? stt!.text : result.translation;
            const chinese = source === 'en' ? result.translation : stt!.text;
            const url = pipeline.ttsUrl(result.translation, target);
            const line: ExchangeLine = {
              id,
              english,
              chinese,
              chineseLang,
              romanization: result.romanization,
              ttsUrl: url,
            };
            setTranscript((prev) => [...prev, line]);
            setActive(null);
            onExchangeComplete();

            if (url && autoPlayRef.current) {
              speak(url);
            } else {
              setStatus('idle');
            }
          },
          onError: (detail) => {
            abortStreamRef.current = null;
            fail(detail || 'Translation hiccup — try again.', side);
          },
        }
      );
    },
    [pipeline, fail, flushTokens, speak, onExchangeComplete]
  );

  // keep processUtterance reachable from release without stale closures
  const processRef = useRef(processUtterance);
  processRef.current = processUtterance;
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  // Re-bind release to use the live processUtterance.
  const releaseImpl = useCallback(async () => {
    if (statusRef.current !== 'recording') return;
    const side = sideRef.current;
    setStatus('transcribing');
    const uri = await recorder.stop();
    setRecordingSide(null);
    if (!side) {
      setStatus('idle');
      return;
    }
    await processRef.current(uri, side);
  }, [recorder]);
  releaseRef.current = releaseImpl;

  const press = useCallback(
    async (side: Side) => {
      if (statusRef.current === 'speaking') stopSpeaking();
      if (statusRef.current !== 'idle' && statusRef.current !== 'error') return;
      setErrorMessage(null);
      setRetrySide(null);
      setHint(null);
      sideRef.current = side;
      setRecordingSide(side);
      setStatus('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const ok = await recorder.start();
      if (!ok) {
        setRecordingSide(null);
        setStatus('idle');
      }
    },
    [recorder, stopSpeaking]
  );

  const retry = useCallback(() => {
    const side = retrySide ?? sideRef.current;
    setErrorMessage(null);
    setRetrySide(null);
    setHint(null);
    setActive(null);
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setStatus('idle');
    if (side) press(side);
  }, [retrySide, press]);

  const reset = useCallback(() => {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    recorder.stop({ discard: true }).catch(() => {});
    stopSpeaking();
    setTranscript([]);
    setActive(null);
    setHint(null);
    setErrorMessage(null);
    setRetrySide(null);
    setRecordingSide(null);
    setStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSpeaking]);

  return {
    status,
    transcript,
    active,
    hint,
    errorMessage,
    retrySide,
    isRecording: recorder.isRecording,
    recordingSide,
    levels: recorder.levels,
    meteringAvailable: recorder.meteringAvailable,
    permissionDenied: recorder.permission === 'denied',
    autoPlay,
    isSpeaking,
    toggleAutoPlay,
    stopSpeaking,
    replayLatest,
    press,
    release: releaseImpl,
    retry,
    reset,
    setStreamHandle,
  };
}
