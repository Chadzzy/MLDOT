import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  RecordingPresets,
  type RecordingOptions,
} from 'expo-audio';

/**
 * Press-and-hold voice capture for the Talk halves (plan §3 mobile decisions).
 *
 * - expo-audio `AudioRecorder`, m4a/aac (RecordingPresets.HIGH_QUALITY), one
 *   codec path for both platforms; the backend decodes via ffmpeg.
 * - Requests mic permission on first use; denial surfaces a friendly inline
 *   message (never a crash) via `error` + `permission === 'denied'`.
 * - Polls recorder metering (~90 ms) into a rolling window of 0..1 `levels`
 *   that drive the Waveform `levels` prop. If metering never reports a number
 *   (unsupported platform), `meteringAvailable` flips false so the caller can
 *   fall back to the idle waveform animation — cosmetic, per plan §8.
 * - Silence auto-stop: after some speech and a min duration, ≥800 ms below the
 *   silence threshold fires `onAutoStop` (backup to manual release).
 */

const BARS = 12;
const POLL_MS = 90;
const MIN_RECORD_MS = 600;
const SILENCE_HOLD_MS = 800;
// Metering is dBFS (~ -160 silence .. 0 max). Map -60..0 dB onto 0..1.
const DB_FLOOR = -60;
const SILENCE_DB = -50;

const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export type PermissionState = 'undetermined' | 'granted' | 'denied';

export interface UseRecorderResult {
  isRecording: boolean;
  /** Rolling window (length 12, oldest→newest) of normalized 0..1 amplitude. */
  levels: number[];
  /** False once we've confirmed the platform never reports metering. */
  meteringAvailable: boolean;
  permission: PermissionState;
  error: string | null;
  /** Begins capture. Resolves true when recording actually started. */
  start: () => Promise<boolean>;
  /** Stops capture; resolves the recorded file URI (or null when discarded). */
  stop: (opts?: { discard?: boolean }) => Promise<string | null>;
  clearError: () => void;
}

function normalize(db?: number): number {
  if (db == null || !isFinite(db)) return 0;
  const v = (db - DB_FLOOR) / (0 - DB_FLOOR);
  return Math.max(0, Math.min(1, v));
}

const SILENCE_LEVEL = normalize(SILENCE_DB);
const emptyLevels = () => new Array<number>(BARS).fill(0);

export function useRecorder(onAutoStop?: () => void): UseRecorderResult {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);

  const [isRecording, setIsRecording] = useState(false);
  const [levels, setLevels] = useState<number[]>(emptyLevels);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [error, setError] = useState<string | null>(null);
  const [meteringAvailable, setMeteringAvailable] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelsRef = useRef<number[]>(emptyLevels());
  const startedAtRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);
  const sawSpeechRef = useRef(false);
  const meteringSeenRef = useRef(false);
  const autoStopFiredRef = useRef(false);
  const stoppingRef = useRef(false);
  const onAutoStopRef = useRef(onAutoStop);
  onAutoStopRef.current = onAutoStop;

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => clearPoll, [clearPoll]);

  const clearError = useCallback(() => setError(null), []);

  const stop = useCallback(
    async ({ discard = false }: { discard?: boolean } = {}): Promise<string | null> => {
      clearPoll();
      if (!stoppingRef.current) {
        stoppingRef.current = true;
        try {
          await recorder.stop();
        } catch {
          // Recorder may already be stopped/torn down — safe to ignore.
        }
        stoppingRef.current = false;
      }
      setIsRecording(false);
      levelsRef.current = emptyLevels();
      setLevels(emptyLevels());
      const uri = recorder.uri;
      return discard ? null : uri ?? null;
    },
    [recorder, clearPoll]
  );

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    let perm = await getRecordingPermissionsAsync();
    if (!perm.granted) {
      perm = await requestRecordingPermissionsAsync();
    }
    if (!perm.granted) {
      setPermission('denied');
      setError('Microphone is off. Turn it on in Settings so I can hear you.');
      return false;
    }
    setPermission('granted');

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      recorder.record();
    } catch {
      setError('Could not start the mic. Give it another try.');
      return false;
    }

    startedAtRef.current = Date.now();
    silenceStartRef.current = null;
    sawSpeechRef.current = false;
    autoStopFiredRef.current = false;
    levelsRef.current = emptyLevels();
    setLevels(emptyLevels());
    setIsRecording(true);

    clearPoll();
    pollRef.current = setInterval(() => {
      let db: number | undefined;
      try {
        db = recorder.getStatus().metering;
      } catch {
        db = undefined;
      }
      if (typeof db === 'number' && isFinite(db)) meteringSeenRef.current = true;

      const lvl = normalize(db);
      const next = [...levelsRef.current.slice(1), lvl];
      levelsRef.current = next;
      setLevels(next);

      const now = Date.now();
      if (lvl > SILENCE_LEVEL) {
        sawSpeechRef.current = true;
        silenceStartRef.current = null;
      } else if (silenceStartRef.current == null) {
        silenceStartRef.current = now;
      } else if (
        !autoStopFiredRef.current &&
        sawSpeechRef.current &&
        now - startedAtRef.current > MIN_RECORD_MS &&
        now - silenceStartRef.current >= SILENCE_HOLD_MS
      ) {
        autoStopFiredRef.current = true;
        clearPoll();
        onAutoStopRef.current?.();
      }
    }, POLL_MS);

    // If metering never reports after a beat, fall back to the idle animation.
    setTimeout(() => {
      if (!meteringSeenRef.current) setMeteringAvailable(false);
    }, 500);

    return true;
  }, [recorder, clearPoll]);

  return { isRecording, levels, meteringAvailable, permission, error, start, stop, clearError };
}
