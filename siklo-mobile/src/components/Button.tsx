import React, { useRef } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, type } from '../theme/tokens';

export type ButtonVariant = 'primary' | 'jade' | 'ghost';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Full-bleed width buttons (Go's 56px audio buttons). Default true. */
  fullWidth?: boolean;
  height?: number;
  haptics?: boolean;
  /** Override the variant's face/edge/text colors (e.g. DestinationCard's inverted cream scheme). */
  faceColor?: string;
  edgeColor?: string;
  textColor?: string;
  borderColor?: string;
}

const EDGE_HEIGHT = 4;
const PRESS_COMPRESS = 2;

/**
 * Duolingo-tactile chunky button (plan §6.1): a solid face sits above a
 * darker "edge" strip. On press the face compresses down by 2px, leaving a
 * 2px edge reveal instead of 4px — never a bounce, just a firm 120ms press.
 */
export default function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
  height = 52,
  haptics = true,
  faceColor: faceColorOverride,
  edgeColor: edgeColorOverride,
  textColor,
  borderColor,
}: ButtonProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const isGhost = variant === 'ghost';
  const faceColor = faceColorOverride ?? (variant === 'jade' ? colors.jadeFace : colors.amberFace);
  const edgeColor = edgeColorOverride ?? (variant === 'jade' ? colors.jadeEdge : colors.amberEdge);

  const press = (toValue: number) => {
    Animated.timing(translateY, {
      toValue,
      duration: 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = () => {
    if (disabled) return;
    press(PRESS_COMPRESS);
  };

  const handlePressOut = () => {
    if (disabled) return;
    press(0);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  if (isGhost) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.ghost,
          {
            height,
            opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
            borderColor: borderColor ?? colors.borderSubtle,
          },
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        {typeof children === 'string' ? (
          <Text style={[styles.ghostText, textColor && { color: textColor }, textStyle]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }

  return (
    <Animated.View
      style={[
        styles.wrap,
        fullWidth && styles.fullWidth,
        {
          height: height + EDGE_HEIGHT,
          backgroundColor: edgeColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={styles.pressableFill}
      >
        <Animated.View
          style={[
            styles.face,
            {
              height,
              backgroundColor: faceColor,
              transform: [{ translateY }],
            },
          ]}
        >
          {typeof children === 'string' ? (
            <Text style={[styles.text, textColor && { color: textColor }, textStyle]}>
              {children}
            </Text>
          ) : (
            children
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  pressableFill: {
    flex: 1,
  },
  face: {
    width: '100%',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  text: {
    color: colors.bgBase,
    fontFamily: type.fontFamilySemiBold,
    fontSize: type.size.base,
  },
  ghost: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghostText: {
    color: colors.textPrimary,
    fontFamily: type.fontFamilyMedium,
    fontSize: type.size.base,
  },
});
