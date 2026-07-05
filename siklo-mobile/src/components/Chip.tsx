import React from 'react';
import { Insets, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, type } from '../theme/tokens';

// Default hitSlop keeps the tap target >=48px even when the visual pill
// (e.g. the compact 粵/普 toggle in Talk's bottom-half header row) is drawn
// smaller than that for layout reasons — design rule: every touch target
// must be reachable at 48px regardless of the chip's rendered size.
const DEFAULT_HIT_SLOP: Insets = { top: 12, bottom: 12, left: 8, right: 8 };

export interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * 'dark' — default toggle pill on the dark theme (GoHome 粵/普 toggle,
   * Talk bottom-half script toggle).
   * 'card' — inverted-cream variant used on DestinationCard.
   */
  tone?: 'dark' | 'card';
  hitSlop?: Insets;
}

export default function Chip({ label, active, onPress, style, tone = 'dark', hitSlop = DEFAULT_HIT_SLOP }: ChipProps) {
  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  if (tone === 'card') {
    return (
      <Pressable
        onPress={handlePress}
        hitSlop={hitSlop}
        style={[
          styles.base,
          {
            backgroundColor: active ? colors.cardText : 'transparent',
            borderWidth: active ? 0 : 1,
            borderColor: colors.cardBorder,
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.label,
            { color: active ? colors.cardBg : colors.cardTextMuted },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={hitSlop}
      style={[
        styles.base,
        {
          backgroundColor: active ? colors.accentMuted : colors.bgSurface,
          borderWidth: 1,
          borderColor: active ? colors.borderActive : colors.borderSubtle,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: active ? colors.accentPrimary : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: type.size.small,
    fontFamily: type.fontFamilyMedium,
  },
});
