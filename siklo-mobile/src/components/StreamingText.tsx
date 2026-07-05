import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, StyleProp, Text, TextStyle } from 'react-native';
import { useStreamingText } from '../hooks/useStreamingText';
import { colors } from '../theme/tokens';

export interface StreamingTextHandle {
  /** Restart the mock word/char streaming animation from `text`. */
  start: () => void;
  reset: () => void;
  /**
   * P3 hook: append a real SSE token as it arrives, switching this instance
   * into "external" streaming mode (the mock timer-driven splitter is
   * bypassed). Call `finish()` once the stream ends to fade the cursor.
   */
  pushToken: (token: string) => void;
  finish: () => void;
}

export interface StreamingTextProps {
  text: string;
  isChinese?: boolean;
  style?: StyleProp<TextStyle>;
  autoStart?: boolean;
  delay?: number;
}

const StreamingText = forwardRef<StreamingTextHandle, StreamingTextProps>(function StreamingText(
  { text, isChinese = false, style, autoStart = true, delay = 90 },
  ref
) {
  const { displayedText, isStreaming, isDone, start, reset } = useStreamingText(text, {
    autoStart,
    isChinese,
    delay,
  });

  // External (P3 SSE) streaming state — takes over from the mock hook once
  // pushToken() is called at least once.
  const [external, setExternal] = useState(false);
  const [externalText, setExternalText] = useState('');
  const [externalStreaming, setExternalStreaming] = useState(false);
  const [externalDone, setExternalDone] = useState(false);

  useImperativeHandle(ref, () => ({
    start: () => {
      setExternal(false);
      start();
    },
    reset: () => {
      setExternal(false);
      setExternalText('');
      setExternalStreaming(false);
      setExternalDone(false);
      reset();
    },
    pushToken: (token: string) => {
      setExternal(true);
      setExternalStreaming(true);
      setExternalDone(false);
      setExternalText(prev => prev + token);
    },
    finish: () => {
      setExternalStreaming(false);
      setExternalDone(true);
    },
  }));

  const shownText = external ? externalText : displayedText;
  const shownStreaming = external ? externalStreaming : isStreaming;
  const shownDone = external ? externalDone : isDone;

  return (
    <Text style={style}>
      {shownText}
      {shownStreaming && <BlinkCursor />}
      {shownDone && !shownStreaming && <FadeCursor />}
    </Text>
  );
});

export default StreamingText;

function BlinkCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.Text style={{ color: colors.accentPrimary, opacity, marginLeft: 2 }}>
      {'▋'}
    </Animated.Text>
  );
}

function FadeCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.Text style={{ color: colors.accentPrimary, opacity, marginLeft: 2 }}>
      {'▋'}
    </Animated.Text>
  );
}
