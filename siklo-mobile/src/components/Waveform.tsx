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

export default function Waveform({ color = colors.accentPrimary, height = 32 }: WaveformProps) {
  return (
    <View style={[styles.row, { height }]}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <Bar key={i} index={i} color={color} maxHeight={height} />
      ))}
    </View>
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
