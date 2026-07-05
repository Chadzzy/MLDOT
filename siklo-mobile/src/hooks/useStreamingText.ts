import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Ported from siklo/src/hooks/useStreamingText.js verbatim (timing/behavior
 * unchanged). English streams word-by-word, Chinese streams char-by-char at
 * 0.6x the per-token delay, both with +/- variationMs jitter so it doesn't
 * feel mechanical.
 *
 * P3 note: to feed real SSE tokens instead of the mock word/char splitter,
 * add a `pushToken(token: string)` escape hatch that appends directly to
 * displayedText and bypasses the timer-driven `streamNext` loop — the
 * cursor/isStreaming/isDone state machine below already supports that shape.
 */

export interface UseStreamingTextOptions {
  delay?: number;
  variationMs?: number;
  isChinese?: boolean;
  autoStart?: boolean;
}

export interface UseStreamingTextResult {
  displayedText: string;
  isStreaming: boolean;
  isDone: boolean;
  start: () => void;
  reset: () => void;
}

export function useStreamingText(
  fullText: string,
  options: UseStreamingTextOptions = {}
): UseStreamingTextResult {
  const { delay = 100, variationMs = 40, isChinese = false, autoStart = false } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplayedText('');
    setIsStreaming(false);
    setIsDone(false);
    indexRef.current = 0;
  }, []);

  const start = useCallback(() => {
    reset();
    setIsStreaming(true);
  }, [reset]);

  useEffect(() => {
    if (!isStreaming || !fullText) return;

    const tokens = isChinese ? fullText.split('') : fullText.split(' ');

    const streamNext = () => {
      if (indexRef.current >= tokens.length) {
        setIsStreaming(false);
        setIsDone(true);
        return;
      }
      const separator = isChinese ? '' : indexRef.current > 0 ? ' ' : '';
      setDisplayedText(prev => prev + separator + tokens[indexRef.current]);
      indexRef.current++;
      const variation = Math.random() * variationMs - variationMs / 2;
      const baseDelay = isChinese ? delay * 0.6 : delay;
      timeoutRef.current = setTimeout(streamNext, baseDelay + variation);
    };

    timeoutRef.current = setTimeout(streamNext, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, fullText, delay, variationMs, isChinese]);

  useEffect(() => {
    if (autoStart && fullText) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, fullText]);

  return { displayedText, isStreaming, isDone, start, reset };
}
