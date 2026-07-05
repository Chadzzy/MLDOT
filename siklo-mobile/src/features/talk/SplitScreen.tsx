import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StreamingText from '../../components/StreamingText';
import Waveform from '../../components/Waveform';
import Chip from '../../components/Chip';
import { colors, spacing, type } from '../../theme/tokens';
import { useTalkPipeline, type Side } from './pipeline';
import { useTalkController, type BottomLang, type ExchangeLine } from './useTalkController';

const LANG_KEY = 'siklo.talkLang';
const STREAK_KEY = 'siklo.exchangesToday';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Live Talk split-screen (P3). Ports the SplitScreenView interaction and wires
 * it to the real record → STT → streamed translation → TTS pipeline behind the
 * `useTalkController` state machine. English content lives in the top column,
 * Chinese in the bottom column; each utterance streams its translation into the
 * opposite half (plan §4). Mock mode keeps it demoable with no server.
 */
export default function SplitScreen() {
  const [sessionTimer, setSessionTimer] = useState(0);
  const [bottomLang, setBottomLang] = useState<BottomLang>('yue');
  const [streak, setStreak] = useState(0);
  const [burst, setBurst] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const celebratedRef = useRef(false);

  const { pipeline, mockMode, toggleMock } = useTalkPipeline();

  const onExchangeComplete = useCallback(() => {
    // Streaks-lite: "N exchanges today" with date rollover (plan §6.7).
    setStreak((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(STREAK_KEY, JSON.stringify({ date: today(), count: next }));
      return next;
    });
    // One earned celebration per session (plan §6.4).
    if (!celebratedRef.current) {
      celebratedRef.current = true;
      setBurst((b) => b + 1);
    }
  }, []);

  const talk = useTalkController(pipeline, bottomLang, onExchangeComplete);

  // Persisted 粵/普 choice.
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (v === 'yue' || v === 'cmn') setBottomLang(v);
    });
  }, []);

  // Load today's streak.
  useEffect(() => {
    AsyncStorage.getItem(STREAK_KEY).then((v) => {
      if (!v) return;
      try {
        const { date, count } = JSON.parse(v);
        if (date === today() && typeof count === 'number') setStreak(count);
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTimer((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const setLang = (lang: BottomLang) => {
    setBottomLang(lang);
    AsyncStorage.setItem(LANG_KEY, lang);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const endSession = () => {
    talk.reset();
    setSessionTimer(0);
    celebratedRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSessionTimer((t) => t + 1), 1000);
  };

  const { active, transcript, status } = talk;

  // Split the transcript into the two language columns.
  const englishLines = transcript.map((e) => ({ id: e.id, text: e.english }));
  const chineseLines = transcript.map((e) => ({ id: e.id, text: e.chinese }));
  const latestChinese: ExchangeLine | undefined = transcript[transcript.length - 1];

  const topStreaming = active?.streamingSide === 'top';
  const bottomStreaming = active?.streamingSide === 'bottom';
  const topSource = active && active.sourceLang === 'en' ? active.sourceText : null;
  const bottomSource = active && active.sourceLang !== 'en' ? active.sourceText : null;

  const showWaveform = talk.isRecording && talk.meteringAvailable;
  const stageLabel =
    status === 'recording'
      ? 'Listening…'
      : status === 'transcribing' || status === 'translating'
      ? 'Translating…'
      : status === 'speaking'
      ? 'Speaking…'
      : null;

  return (
    <View style={styles.container}>
      {/* Mini header */}
      <View style={styles.miniHeader}>
        <Pressable onPress={endSession} hitSlop={8}>
          <Text style={styles.endText}>End</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.timerText}>{formatTime(sessionTimer)}</Text>
          {streak > 0 && (
            <Text style={styles.streakText}>
              · {streak} {streak === 1 ? 'exchange' : 'exchanges'} today
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={talk.toggleAutoPlay} hitSlop={8}>
            <Text style={styles.speakerToggle}>{talk.autoPlay ? '🔊' : '🔈'}</Text>
          </Pressable>
          <Pressable onLongPress={toggleMock} delayLongPress={500} style={styles.liveRow} hitSlop={8}>
            <LiveDot muted={mockMode} />
            <Text style={[styles.liveText, mockMode && styles.demoText]}>{mockMode ? 'DEMO' : 'LIVE'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Hint / error banner (never blank, never a wall) */}
      {talk.hint && !talk.errorMessage && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>{talk.hint}</Text>
        </View>
      )}
      {talk.errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{talk.errorMessage}</Text>
          <Chip label="↻ Try again" active onPress={talk.retry} style={styles.retryChip} />
        </View>
      )}
      {talk.permissionDenied && !talk.errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Microphone is off — enable it in Settings to talk.</Text>
        </View>
      )}
      {active?.lowConfidence && !talk.errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Not sure I caught that — here's my best guess.</Text>
          <Chip label="↻ Try again" active onPress={talk.retry} style={styles.retryChip} />
        </View>
      )}

      {/* Top half — English column */}
      <TalkHalf
        active={talk.recordingSide === 'top'}
        activeBg={colors.bgSurface}
        idleBg={colors.bgBase}
        glowColor={colors.accentMuted}
        onPressIn={() => talk.press('top')}
        onPressOut={talk.release}
      >
        <Text style={styles.topLabel}>English · Hold to speak</Text>
        <ColumnScroll>
          {englishLines.map((l, i) => (
            <Text
              key={l.id}
              style={[styles.topEnglish, i === englishLines.length - 1 && !active ? null : styles.historyLine]}
            >
              {l.text}
            </Text>
          ))}
          {topSource != null && <Text style={styles.topEnglish}>{topSource}</Text>}
          {topStreaming && (
            <StreamingText ref={talk.setStreamHandle} text="" autoStart={false} style={styles.topEnglish} />
          )}
          {englishLines.length === 0 && !topSource && !topStreaming && (
            <Text style={styles.placeholder}>
              {talk.recordingSide === 'top' ? '🎙️ Listening…' : 'Hold this half to speak English'}
            </Text>
          )}
        </ColumnScroll>
        {talk.recordingSide === 'top' && showWaveform && (
          <Waveform levels={talk.levels} color={colors.accentPrimary} />
        )}
        {talk.recordingSide === 'top' && !showWaveform && <Waveform color={colors.accentPrimary} />}
      </TalkHalf>

      {/* Divider — swap glyph idle, stage label while working */}
      <View style={styles.divider}>
        {stageLabel ? (
          <StagePill label={stageLabel} pulsing={status === 'speaking'} onPress={status === 'speaking' ? talk.stopSpeaking : undefined} />
        ) : (
          <View style={styles.swapPill}>
            <Text style={styles.swapGlyph}>⇅</Text>
          </View>
        )}
      </View>

      {/* Bottom half — Chinese column */}
      <TalkHalf
        active={talk.recordingSide === 'bottom'}
        activeBg={colors.bgElevated}
        idleBg={colors.bgSurface}
        glowColor={colors.accentJadeMuted}
        onPressIn={() => talk.press('bottom')}
        onPressOut={talk.release}
      >
        <View style={styles.bottomLabelRow}>
          <Text style={styles.bottomLabel}>{bottomLang === 'yue' ? '粵語 · 撳住講嘢' : '普通話 · 按住說話'}</Text>
          <View style={styles.bottomToggle}>
            <Chip label="粵" active={bottomLang === 'yue'} onPress={() => setLang('yue')} style={styles.bottomToggleChip} />
            <Chip label="普" active={bottomLang === 'cmn'} onPress={() => setLang('cmn')} style={styles.bottomToggleChip} />
          </View>
        </View>
        <ColumnScroll>
          {chineseLines.map((l, i) => (
            <Text
              key={l.id}
              style={[
                styles.bottomCantonese,
                i === chineseLines.length - 1 && !active ? null : styles.historyLine,
              ]}
            >
              {l.text}
            </Text>
          ))}
          {bottomSource != null && <Text style={styles.bottomCantonese}>{bottomSource}</Text>}
          {bottomStreaming && (
            <StreamingText ref={talk.setStreamHandle} text="" autoStart={false} isChinese style={styles.bottomCantonese} />
          )}
          {chineseLines.length === 0 && !bottomSource && !bottomStreaming && (
            <Text style={styles.placeholder}>
              {talk.recordingSide === 'bottom' ? '🎙️ 聆聽中…' : bottomLang === 'yue' ? '撳住用粵語講嘢' : '按住用普通話說話'}
            </Text>
          )}
        </ColumnScroll>
        {/* Replay / stop speaker for the latest translated line */}
        {latestChinese?.ttsUrl && !active && (
          <SpeakerButton pulsing={talk.isSpeaking} onPress={talk.replayLatest} />
        )}
        {talk.recordingSide === 'bottom' && showWaveform && (
          <Waveform levels={talk.levels} color={colors.accentJade} />
        )}
        {talk.recordingSide === 'bottom' && !showWaveform && <Waveform color={colors.accentJade} />}
      </TalkHalf>

      <JadeBurst trigger={burst} />
    </View>
  );
}

/** Scrollable column that keeps the newest content pinned into view. */
function ColumnScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={ref}
      style={styles.column}
      contentContainerStyle={styles.columnContent}
      onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

function StagePill({ label, pulsing, onPress }: { label: string; pulsing: boolean; onPress?: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulsing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, opacity]);

  const content = (
    <Animated.View style={[styles.stagePill, pulsing && { opacity }]}>
      <Text style={styles.stageText}>{pulsing ? `🔊 ${label}` : label}</Text>
    </Animated.View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

function SpeakerButton({ pulsing, onPress }: { pulsing: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulsing) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, scale]);

  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.speakerBtn}>
      <Animated.Text style={[styles.speakerGlyph, { transform: [{ scale }] }]}>{pulsing ? '🔊' : '🔈'}</Animated.Text>
    </Pressable>
  );
}

/** Damped jade particle burst — one earned celebration per session (≤400ms). */
function JadeBurst({ trigger }: { trigger: number }) {
  const [key, setKey] = useState(0);
  const anims = useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (trigger === 0) return;
    setKey((k) => k + 1);
    Animated.stagger(
      12,
      anims.map((v) => {
        v.setValue(0);
        return Animated.timing(v, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        });
      })
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (trigger === 0) return null;

  return (
    <View pointerEvents="none" style={styles.burstLayer} key={key}>
      {anims.map((v, i) => {
        const angle = (Math.PI * 2 * i) / anims.length;
        const dist = 46;
        const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] });
        const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist] });
        const opacity = v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] });
        const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
        return (
          <Animated.View
            key={i}
            style={[styles.burstDot, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}
          />
        );
      })}
    </View>
  );
}

function LiveDot({ muted }: { muted?: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (muted) {
      opacity.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, muted]);

  return <Animated.View style={[styles.liveDot, muted && styles.demoDot, { opacity }]} />;
}

function TalkHalf({
  active,
  activeBg,
  idleBg,
  glowColor,
  onPressIn,
  onPressOut,
  children,
}: {
  active: boolean;
  activeBg: string;
  idleBg: string;
  glowColor: string;
  onPressIn: () => void;
  onPressOut: () => void;
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
        Animated.timing(glowOpacity, { toValue: 0.08, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glowOpacity, { toValue: 0.03, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, glowOpacity]);

  const backgroundColor = bgProgress.interpolate({ inputRange: [0, 1], outputRange: [idleBg, activeBg] });

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} style={styles.halfPressable}>
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
  container: { flex: 1 },
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
  endText: { fontSize: type.size.small, fontFamily: type.fontFamilySemiBold, color: colors.statusImportant },
  headerCenter: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', gap: 4 },
  timerText: { fontSize: type.size.caption, fontFamily: type.fontFamily, color: colors.textSecondary },
  streakText: { fontSize: type.size.label, fontFamily: type.fontFamilyMedium, color: colors.accentJade },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  speakerToggle: { fontSize: 16 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.statusImportant },
  demoDot: { backgroundColor: colors.textSecondary },
  liveText: { fontSize: type.size.label, fontFamily: type.fontFamilySemiBold, color: colors.statusImportant },
  demoText: { color: colors.textSecondary },

  hintBanner: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentJadeMuted,
  },
  hintText: { fontSize: type.size.small, fontFamily: type.fontFamilyMedium, color: colors.accentJade, textAlign: 'center' },
  errorBanner: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  errorText: { flex: 1, fontSize: type.size.small, fontFamily: type.fontFamilyMedium, color: colors.accentPrimary },
  retryChip: { paddingVertical: 4, paddingHorizontal: 12, minHeight: 0 },

  halfPressable: { flex: 1 },
  half: { flex: 1, padding: spacing.md, justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  column: { flexGrow: 0, maxHeight: '80%' },
  columnContent: { justifyContent: 'flex-end', flexGrow: 1, gap: spacing.xs },

  topLabel: { fontSize: type.size.label, fontFamily: type.fontFamilyMedium, color: colors.accentPrimary, marginBottom: spacing.xs },
  bottomLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  bottomLabel: { fontSize: type.size.label, fontFamily: type.fontFamilyMedium, color: colors.accentJade },
  bottomToggle: { flexDirection: 'row', gap: 4 },
  bottomToggleChip: { paddingVertical: 4, paddingHorizontal: 10, minHeight: 0 },

  topEnglish: { fontSize: type.size.englishStream, fontFamily: type.fontFamilyMedium, color: colors.textPrimary },
  bottomCantonese: {
    fontSize: type.size.cantoneseStream,
    fontFamily: type.fontFamilyMedium,
    color: colors.textPrimary,
    lineHeight: type.size.cantoneseStream * type.lineHeight.relaxed,
  },
  historyLine: { fontSize: type.size.body, color: colors.textSecondary, opacity: 0.7, lineHeight: type.size.body * type.lineHeight.base },
  placeholder: { fontSize: type.size.base, fontFamily: type.fontFamily, color: colors.textSecondary, textAlign: 'center' },

  divider: { height: 1, backgroundColor: colors.borderActive, position: 'relative', justifyContent: 'center', zIndex: 2 },
  swapPill: { position: 'absolute', alignSelf: 'center', backgroundColor: colors.bgElevated, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  swapGlyph: { fontSize: type.size.body, color: colors.textSecondary },
  stagePill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.bgElevated,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  stageText: { fontSize: type.size.small, fontFamily: type.fontFamilySemiBold, color: colors.accentPrimary },

  speakerBtn: { position: 'absolute', right: spacing.md, bottom: spacing.md },
  speakerGlyph: { fontSize: 20 },

  burstLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentJade },
});
