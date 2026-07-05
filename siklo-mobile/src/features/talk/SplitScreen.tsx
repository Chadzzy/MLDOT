import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import StreamingText from '../../components/StreamingText';
import Chip from '../../components/Chip';
import { colors, spacing, type } from '../../theme/tokens';
import { MOCK_TALK_EXCHANGES } from '../../data/mockTalk';

type Side = 'top' | 'bottom';
type BottomLang = 'yue' | 'cmn';

interface TalkMessage {
  side: Side;
  english: string;
  cantonese: string;
}

const SEND_DELAY_MS = 800;

/**
 * Pixel-faithful port of siklo/src/components/talk/SplitScreenView.jsx.
 *
 * Deviations from the web prototype (both scoped intentionally for P2 —
 * see the mobile handover doc):
 * 1. "End" resets the in-session transcript/timer locally instead of
 *    navigating to a lobby screen — the mobile Talk tab has no pre-session
 *    screen to return to (it's always mounted as `(tabs)/index.tsx`).
 * 2. The radial "breathe" glow is approximated with a flat animated-opacity
 *    tint (no radial-gradient primitive in core RN without adding
 *    react-native-svg/expo-linear-gradient, deliberately not pulled in for
 *    a static P2 port).
 * 3. NEW 粵/普 toggle for the bottom half (plan §4) is wired as local
 *    useState; MOCK_TALK_EXCHANGES only carries one Cantonese string per
 *    exchange (no separate Mandarin variant yet), so toggling script does
 *    not yet change the streamed mock text — P3/P4 feed the real
 *    per-language translation and this same toggle drives it.
 */
export default function SplitScreen() {
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [isRecordingTop, setIsRecordingTop] = useState(false);
  const [isRecordingBottom, setIsRecordingBottom] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [bottomLang, setBottomLang] = useState<BottomLang>('yue');
  const exchangeIdx = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const endSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMessages([]);
    setSessionTimer(0);
    setIsRecordingTop(false);
    setIsRecordingBottom(false);
    exchangeIdx.current = 0;
    timerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000);
  };

  const handleTopTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRecordingTop) {
      setIsRecordingTop(false);
      const exchange = MOCK_TALK_EXCHANGES[exchangeIdx.current % MOCK_TALK_EXCHANGES.length];
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { side: 'top', english: exchange.you.english, cantonese: exchange.you.cantonese },
        ]);
        exchangeIdx.current++;
      }, SEND_DELAY_MS);
    } else {
      setIsRecordingTop(true);
    }
  };

  const handleBottomTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRecordingBottom) {
      setIsRecordingBottom(false);
      const exchange = MOCK_TALK_EXCHANGES[exchangeIdx.current % MOCK_TALK_EXCHANGES.length];
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { side: 'bottom', english: exchange.partner.english, cantonese: exchange.partner.cantonese },
        ]);
        exchangeIdx.current++;
      }, SEND_DELAY_MS);
    } else {
      setIsRecordingBottom(true);
    }
  };

  const topMessages = messages.filter(m => m.side === 'top');
  const bottomMessages = messages.filter(m => m.side === 'bottom');

  return (
    <View style={styles.container}>
      {/* Mini header */}
      <View style={styles.miniHeader}>
        <Pressable onPress={endSession} hitSlop={8}>
          <Text style={styles.endText}>End</Text>
        </Pressable>
        <Text style={styles.timerText}>{formatTime(sessionTimer)}</Text>
        <View style={styles.liveRow}>
          <LiveDot />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Top half — English (your side) */}
      <TalkHalf
        active={isRecordingTop}
        activeBg={colors.bgSurface}
        idleBg={colors.bgBase}
        glowColor={colors.accentMuted}
        onPress={handleTopTap}
      >
        <Text style={styles.topLabel}>English · Tap to speak</Text>
        {topMessages.length > 0 ? (
          topMessages.map((msg, i) => (
            <View key={i} style={styles.messageBlock}>
              <StreamingText text={msg.english} style={styles.topEnglish} />
              <StreamingText text={msg.cantonese} isChinese delay={60} style={styles.topCantonese} />
            </View>
          ))
        ) : (
          <Text style={styles.placeholder}>{isRecordingTop ? '🎙️ Listening…' : 'Tap this half to speak English'}</Text>
        )}
      </TalkHalf>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.swapPill}>
          <Text style={styles.swapGlyph}>⇅</Text>
        </View>
      </View>

      {/* Bottom half — Cantonese/Mandarin (their side) */}
      <TalkHalf
        active={isRecordingBottom}
        activeBg={colors.bgElevated}
        idleBg={colors.bgSurface}
        glowColor={colors.accentJadeMuted}
        onPress={handleBottomTap}
      >
        <View style={styles.bottomLabelRow}>
          <Text style={styles.bottomLabel}>粵語 · 撳呢度講嘢</Text>
          <View style={styles.bottomToggle}>
            <Chip
              label="粵"
              active={bottomLang === 'yue'}
              onPress={() => setBottomLang('yue')}
              style={styles.bottomToggleChip}
            />
            <Chip
              label="普"
              active={bottomLang === 'cmn'}
              onPress={() => setBottomLang('cmn')}
              style={styles.bottomToggleChip}
            />
          </View>
        </View>
        {bottomMessages.length > 0 ? (
          bottomMessages.map((msg, i) => (
            <View key={i} style={styles.messageBlock}>
              <StreamingText text={msg.cantonese} isChinese delay={60} style={styles.bottomCantonese} />
              <StreamingText text={msg.english} style={styles.bottomEnglish} />
            </View>
          ))
        ) : (
          <Text style={styles.placeholder}>{isRecordingBottom ? '🎙️ 聆聽中…' : '撳呢度用粵語講嘢'}</Text>
        )}
      </TalkHalf>
    </View>
  );
}

function LiveDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.liveDot, { opacity }]} />;
}

function TalkHalf({
  active,
  activeBg,
  idleBg,
  glowColor,
  onPress,
  children,
}: {
  active: boolean;
  activeBg: string;
  idleBg: string;
  glowColor: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const bgProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const glowOpacity = useRef(new Animated.Value(0.03)).current;

  useEffect(() => {
    Animated.timing(bgProgress, {
      toValue: active ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [active, bgProgress]);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.08,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.03,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, glowOpacity]);

  const backgroundColor = bgProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [idleBg, activeBg],
  });

  return (
    <Pressable onPress={onPress} style={styles.halfPressable}>
      <Animated.View style={[styles.half, { backgroundColor }]}>
        {children}
        {active && (
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { backgroundColor: glowColor, opacity: glowOpacity }]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  miniHeader: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    minHeight: 40,
  },
  endText: {
    fontSize: type.size.small,
    fontFamily: type.fontFamilySemiBold,
    color: colors.statusImportant,
  },
  timerText: {
    fontSize: type.size.caption,
    fontFamily: type.fontFamily,
    color: colors.textSecondary,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.statusImportant,
  },
  liveText: {
    fontSize: type.size.label,
    fontFamily: type.fontFamilySemiBold,
    color: colors.statusImportant,
  },
  halfPressable: {
    flex: 1,
  },
  half: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topLabel: {
    fontSize: type.size.label,
    fontFamily: type.fontFamilyMedium,
    color: colors.accentPrimary,
    marginBottom: spacing.xs,
  },
  bottomLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  bottomLabel: {
    fontSize: type.size.label,
    fontFamily: type.fontFamilyMedium,
    color: colors.accentJade,
  },
  bottomToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  bottomToggleChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    minHeight: 0,
  },
  messageBlock: {
    marginBottom: spacing.xs,
  },
  topEnglish: {
    fontSize: type.size.englishStream,
    fontFamily: type.fontFamilyMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  topCantonese: {
    fontSize: type.size.body,
    fontFamily: type.fontFamily,
    color: colors.textSecondary,
  },
  bottomCantonese: {
    fontSize: type.size.cantoneseStream,
    fontFamily: type.fontFamilyMedium,
    color: colors.textPrimary,
    lineHeight: type.size.cantoneseStream * type.lineHeight.relaxed,
    marginBottom: 4,
  },
  bottomEnglish: {
    fontSize: type.size.body,
    fontFamily: type.fontFamily,
    color: colors.textSecondary,
  },
  placeholder: {
    fontSize: type.size.base,
    fontFamily: type.fontFamily,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderActive,
    position: 'relative',
    justifyContent: 'center',
  },
  swapPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.bgElevated,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  swapGlyph: {
    fontSize: type.size.body,
    color: colors.textSecondary,
  },
});
