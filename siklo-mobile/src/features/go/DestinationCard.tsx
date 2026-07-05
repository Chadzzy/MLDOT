import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import Waveform from '../../components/Waveform';
import { colors, type } from '../../theme/tokens';
import type { GoLang, Poi } from './GoHome';
import { resolvePlaybackSource } from './audioCache';
import { translateOnce, TranslateError } from './goApi';
import { addRecent } from './recents';

export interface DestinationCardProps {
  destination: Poi;
  initialLang?: GoLang;
  onBack: () => void;
}

// Slightly darker than cardText (#1A1208) for the solid button's tactile edge.
const DARK_EDGE = '#0A0602';

/** name + landmark (+ note, if any) — the exact string spoken by the TTS clip. */
function buildTtsText(name: string, landmark: string, note?: string): string {
  return [name, landmark, note].filter(p => p && p.trim().length > 0).join('，');
}

export default function DestinationCard({ destination, initialLang = 'yue', onBack }: DestinationCardProps) {
  const [lang, setLang] = useState<GoLang>(initialLang);

  const [showNote, setShowNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(destination.note ?? '');
  const [noteEn, setNoteEn] = useState(destination.note ?? '');
  const [noteYue, setNoteYue] = useState(destination.noteYue ?? '');
  const [noteCmn, setNoteCmn] = useState(destination.noteCmn ?? '');
  const [noteTranslating, setNoteTranslating] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [activeLang, setActiveLang] = useState<GoLang | null>(null);
  const [audioError, setAudioError] = useState<GoLang | null>(null);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // Card entrance polish (plan §6): damped spring slide-up, <=4px overshoot,
  // done with core Animated — no Reanimated dependency needed, so this
  // doesn't need to wait for P5.
  const entranceY = useRef(new Animated.Value(24)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceY, {
        toValue: 0,
        damping: 18,
        mass: 0.5,
        stiffness: 260,
        useNativeDriver: true,
      }),
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceY, entranceOpacity]);

  // Mark as recently viewed on open. `destination` already carries any
  // previously-saved note/translations when opened from Recents, so this
  // never clobbers them.
  useEffect(() => {
    addRecent(destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination.name_en]);

  // Drive the waveform / button label off real player status instead of a
  // fake timer: stop on natural finish, surface a friendly retry on error.
  useEffect(() => {
    if (!activeLang) return;
    if (status.error) {
      setAudioError(activeLang);
      setActiveLang(null);
    } else if (status.didJustFinish) {
      setActiveLang(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish, status.error]);

  const isCantonese = lang === 'yue';
  const chars = isCantonese ? destination.name_yue : destination.name_cmn;
  const landmark = isCantonese ? destination.landmark_yue : destination.landmark_cmn;
  const hasLandmark = landmark.trim().length > 0;

  const playAudio = (audioLang: GoLang) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAudioError(null);

    // Tap the already-playing button again to stop.
    if (activeLang === audioLang) {
      player.pause();
      setActiveLang(null);
      return;
    }

    const name = audioLang === 'yue' ? destination.name_yue : destination.name_cmn;
    const lm = audioLang === 'yue' ? destination.landmark_yue : destination.landmark_cmn;
    const note = audioLang === 'yue' ? noteYue : noteCmn;
    const text = buildTtsText(name, lm, note);

    try {
      const { uri } = resolvePlaybackSource(text, audioLang);
      player.replace(uri);
      setActiveLang(audioLang);
      player.play();
    } catch {
      setAudioError(audioLang);
    }
  };

  const submitNote = async () => {
    setShowNote(false);
    const text = noteDraft.trim();
    if (!text || (text === noteEn && noteYue && noteCmn)) return;

    setNoteEn(text);
    setNoteTranslating(true);
    setNoteError(null);
    try {
      const [yue, cmn] = await Promise.all([
        translateOnce({ text, source: 'en', target: 'yue' }),
        translateOnce({ text, source: 'en', target: 'cmn' }),
      ]);
      setNoteYue(yue.translation);
      setNoteCmn(cmn.translation);
      await addRecent({
        ...destination,
        note: text,
        noteYue: yue.translation,
        noteCmn: cmn.translation,
      });
    } catch (e) {
      setNoteError(e instanceof TranslateError ? e.message : "Couldn't translate the note.");
    } finally {
      setNoteTranslating(false);
    }
  };

  return (
    <Animated.View
      style={[
        styles.screen,
        { opacity: entranceOpacity, transform: [{ translateY: entranceY }] },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Destination</Text>

        <View style={styles.toggleRow}>
          <Chip label="粵 Cantonese" active={lang === 'yue'} onPress={() => setLang('yue')} tone="card" />
          <Chip label="普 Mandarin" active={lang === 'cmn'} onPress={() => setLang('cmn')} tone="card" />
        </View>

        <Text style={styles.chars}>{chars}</Text>
        <Text style={styles.english}>{destination.name_en}</Text>

        <View style={styles.divider} />

        {hasLandmark && (
          <View style={styles.landmarkBlock}>
            <Text style={styles.landmark}>{landmark}</Text>
            <Text style={styles.landmarkEn}>{destination.landmark_en}</Text>
          </View>
        )}

        {noteTranslating && (
          <View style={styles.noteBubble}>
            <Text style={styles.noteBubbleText}>Translating note for the driver…</Text>
          </View>
        )}
        {!noteTranslating && noteError && (
          <View style={styles.noteBubbleError}>
            <Text style={styles.noteErrorText}>{noteError}</Text>
            <Pressable onPress={submitNote} hitSlop={8}>
              <Text style={styles.noteRetryText}>↻ Try again</Text>
            </Pressable>
          </View>
        )}
        {!noteTranslating && !noteError && (noteYue.length > 0 || noteCmn.length > 0) && (
          <View style={styles.noteBubble}>
            {noteYue.length > 0 && <Text style={styles.noteBubbleText}>粵 {noteYue}</Text>}
            {noteCmn.length > 0 && <Text style={styles.noteBubbleText}>普 {noteCmn}</Text>}
          </View>
        )}

        <View style={styles.audioButtons}>
          <Button
            onPress={() => playAudio('yue')}
            faceColor={colors.cardText}
            edgeColor={DARK_EDGE}
            textColor={colors.cardBg}
            height={56}
            haptics={false}
          >
            {activeLang === 'yue' ? (
              <Waveform color={colors.cardBg} height={24} />
            ) : audioError === 'yue' ? (
              <Text style={[styles.audioButtonText, { color: colors.statusConfused }]}>
                ↻ Couldn&rsquo;t play — tap to retry
              </Text>
            ) : (
              <Text style={styles.audioButtonText}>🔊 Play in Cantonese</Text>
            )}
          </Button>

          <Button
            onPress={() => playAudio('cmn')}
            variant="ghost"
            textColor={colors.cardText}
            height={56}
            haptics={false}
            style={{ borderWidth: 2, borderColor: colors.cardText }}
          >
            {activeLang === 'cmn' ? (
              <Waveform color={colors.cardText} height={24} />
            ) : audioError === 'cmn' ? (
              <Text style={[styles.audioButtonText, { color: colors.statusConfused }]}>
                ↻ Couldn&rsquo;t play — tap to retry
              </Text>
            ) : (
              <Text style={[styles.audioButtonText, { color: colors.cardText }]}>🔊 Play in Mandarin</Text>
            )}
          </Button>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.bottomBarText}>← Back</Text>
        </Pressable>

        {!showNote ? (
          <Pressable onPress={() => setShowNote(true)} hitSlop={8}>
            <Text style={styles.addNoteText}>
              {noteEn ? '✎ Edit note for driver' : '+ Add note for driver'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.noteInputRow}>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="e.g. Stop near the red building"
              placeholderTextColor={colors.cardTextMuted}
              autoFocus
              style={styles.noteInput}
            />
            <Pressable onPress={submitNote} hitSlop={8}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        )}

        {!showNote && (
          <Pressable hitSlop={8}>
            <Text style={styles.bottomBarText}>Share →</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cardBg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: type.fontFamilySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.cardTextMuted,
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  chars: {
    fontSize: type.size.cardChar,
    fontFamily: type.fontFamilyBold,
    lineHeight: type.size.cardChar * type.lineHeight.tight,
    marginBottom: 8,
    color: colors.cardText,
  },
  english: {
    fontSize: 18,
    fontFamily: type.fontFamilyMedium,
    color: colors.cardTextSecondary,
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardDivider,
    marginBottom: 24,
  },
  landmarkBlock: {
    marginBottom: 24,
  },
  landmark: {
    fontSize: 18,
    fontFamily: type.fontFamilyMedium,
    lineHeight: 18 * type.lineHeight.relaxed,
    color: colors.cardText,
    marginBottom: 4,
  },
  landmarkEn: {
    fontSize: 14,
    fontFamily: type.fontFamily,
    color: colors.cardTextMuted,
  },
  noteBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(26, 18, 8, 0.06)',
    borderRadius: 8,
    marginBottom: 16,
    gap: 2,
  },
  noteBubbleText: {
    fontSize: 14,
    fontFamily: type.fontFamily,
    color: colors.cardTextSecondary,
  },
  noteBubbleError: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(232, 135, 58, 0.12)',
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  noteErrorText: {
    fontSize: 13,
    fontFamily: type.fontFamily,
    color: colors.statusConfused,
    flex: 1,
  },
  noteRetryText: {
    fontSize: 13,
    fontFamily: type.fontFamilySemiBold,
    color: colors.statusConfused,
  },
  audioButtons: {
    gap: 10,
  },
  audioButtonText: {
    fontSize: 16,
    fontFamily: type.fontFamilyMedium,
    color: colors.cardBg,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardDivider,
    minHeight: 48,
  },
  bottomBarText: {
    fontSize: 15,
    fontFamily: type.fontFamilyMedium,
    color: colors.cardTextSecondary,
  },
  addNoteText: {
    fontSize: 13,
    fontFamily: type.fontFamily,
    color: colors.cardTextMuted,
  },
  noteInputRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginLeft: 16,
    alignItems: 'center',
  },
  noteInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    fontSize: 13,
    fontFamily: type.fontFamily,
    backgroundColor: 'rgba(26, 18, 8, 0.04)',
    color: colors.cardText,
  },
  doneText: {
    fontSize: 13,
    fontFamily: type.fontFamilySemiBold,
    color: colors.cardText,
    padding: 8,
  },
});
