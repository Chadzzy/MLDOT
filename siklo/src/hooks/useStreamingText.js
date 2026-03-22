import { useState, useEffect, useRef, useCallback } from 'react';

export function useStreamingText(fullText, options = {}) {
  const { delay = 100, variationMs = 40, isChinese = false, autoStart = false } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const timeoutRef = useRef(null);
  const indexRef = useRef(0);

  const reset = useCallback(() => {
    clearTimeout(timeoutRef.current);
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
      const separator = isChinese ? '' : (indexRef.current > 0 ? ' ' : '');
      setDisplayedText(prev => prev + separator + tokens[indexRef.current]);
      indexRef.current++;
      const variation = Math.random() * variationMs - variationMs / 2;
      const baseDelay = isChinese ? delay * 0.6 : delay;
      timeoutRef.current = setTimeout(streamNext, baseDelay + variation);
    };

    timeoutRef.current = setTimeout(streamNext, 300);
    return () => clearTimeout(timeoutRef.current);
  }, [isStreaming, fullText, delay, variationMs, isChinese]);

  useEffect(() => {
    if (autoStart && fullText) start();
  }, [autoStart, fullText, start]);

  return { displayedText, isStreaming, isDone, start, reset };
}
