import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

const BAR_COUNT = 12;
const MIN_HEIGHT = 4;

export interface WaveformProps {
  color?: string;
  height?: number;
  /**
   * P3 hook: real mic-metering levels (0..1), one per bar, updated from
   * expo-audio metering callbacks. When provided the bars render these
   * levels directly instead of the staggered idle-loop animation.
   */
  levels?: number[];
}

export default function Waveform({ color = colors.accentPrimary, height = 32, levels }: WaveformProps) {
  // When real metering levels are supplied (P3), render controlled bars driven
  // by amplitude; otherwise fall back to the staggered idle-loop animation
  // (also the graceful fallback when metering is unavailable on a platform).
  const controlled = Array.isArray(levels) && levels.length > 0;
  return (
    <View style={[styles.row, { height }]}>
      {Array.from({ length: BAR_COUNT }).map((_, i) =>
        controlled ? (
          <LevelBar key={i} level={levels![i % levels!.length] ?? 0} color={color} maxHeight={height} />
        ) : (
          <Bar key={i} index={i} color={color} maxHeight={height} />
        )
      )}
    </View>
  );
}

/** Bar whose height tracks a live 0..1 metering level, smoothed briefly. */
function LevelBar({ level, color, maxHeight }: { level: number; color: string; maxHeight: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, level));
    Animated.timing(progress, {
      toValue: clamped,
      duration: 90,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [level, progress]);

  const barHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MIN_HEIGHT, maxHeight],
  });

  return (
    <Animated.View style={[styles.bar, { backgroundColor: color, height: barHeight }]} />
  );
}

function Bar({ index, color, maxHeight }: { index: number; color: string; maxHeight: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  const barHeight = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [MIN_HEIGHT, maxHeight],
      }),
    [progress, maxHeight]
  );

  useEffect(() => {
    const delay = index * 80;
    // Mirrors @keyframes waveBar: 0%,100% { height: 4px } 50% { height: 100% }
    // over 0.8s, staggered by 0.08s per bar — ease-in-out, infinite.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 400,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, index]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: color,
          height: barHeight,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
