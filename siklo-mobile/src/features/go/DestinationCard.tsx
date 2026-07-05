import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import Waveform from '../../components/Waveform';
import { colors, type } from '../../theme/tokens';
import type { GoLang, Poi } from './GoHome';

export interface DestinationCardProps {
  destination: Poi;
  initialLang?: GoLang;
  onBack: () => void;
}

// Slightly darker than cardText (#1A1208) for the solid button's tactile edge.
const DARK_EDGE = '#0A0602';
const PLAY_DURATION_MS = 2000;

export default function DestinationCard({ destination, initialLang = 'yue', onBack }: DestinationCardProps) {
  const [lang, setLang] = useState<GoLang>(initialLang);
  const [isPlaying, setIsPlaying] = useState<GoLang | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const playTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCantonese = lang === 'yue';
  const chars = isCantonese ? destination.name_yue : destination.name_cmn;
  const landmark = isCantonese ? destination.landmark_yue : destination.landmark_cmn;

  const playAudio = (audioLang: GoLang) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playTimeout.current) clearTimeout(playTimeout.current);
    setIsPlaying(audioLang);
    // P4: replace with expo-audio playback of the cached/streamed TTS clip;
    // this timer simulates "speaking" for the static P2 port only.
    playTimeout.current = setTimeout(() => setIsPlaying(null), PLAY_DURATION_MS);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Destination</Text>

        <View style={styles.toggleRow}>
          <Chip label="粵 Cantonese" active={lang === 'yue'} onPress={() => setLang('yue')} tone="card" />
          <Chip label="普 Mandarin" active={lang === 'cmn'} onPress={() => setLang('cmn')} tone="card" />
        </View>

        <Text style={styles.chars}>{chars}</Text>
        <Text style={styles.english}>{destination.name_en}</Text>

        <View style={styles.divider} />

        <View style={styles.landmarkBlock}>
          <Text style={styles.landmark}>{landmark}</Text>
          <Text style={styles.landmarkEn}>{destination.landmark_en}</Text>
        </View>

        {note.length > 0 && (
          <View style={styles.noteBubble}>
            <Text style={styles.noteBubbleText}>{note}</Text>
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
            {isPlaying === 'yue' ? (
              <Waveform color={colors.cardBg} height={24} />
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
            {isPlaying === 'cmn' ? (
              <Waveform color={colors.cardText} height={24} />
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
            <Text style={styles.addNoteText}>+ Add note for driver</Text>
          </Pressable>
        ) : (
          <View style={styles.noteInputRow}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Stop near the red building"
              placeholderTextColor={colors.cardTextMuted}
              autoFocus
              style={styles.noteInput}
            />
            <Pressable onPress={() => setShowNote(false)} hitSlop={8}>
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
    </View>
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
  },
  noteBubbleText: {
    fontSize: 14,
    fontFamily: type.fontFamily,
    color: colors.cardTextSecondary,
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
