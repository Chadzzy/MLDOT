import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Fuse from 'fuse.js';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Chip from '../../components/Chip';
import { colors, radius, spacing, type } from '../../theme/tokens';
import poiData from '../../data/hk_poi.json';
import { translateToBoth, TranslateError } from './goApi';
import { getRecents, type RecentEntry } from './recents';

export type GoLang = 'yue' | 'cmn';

export interface Poi {
  id: number;
  name_yue: string;
  name_cmn: string;
  name_en: string;
  area: string;
  landmark_yue: string;
  landmark_cmn: string;
  landmark_en: string;
  jyutping: string;
  pinyin: string;
  aliases: string[];
  /**
   * Driver note (as typed by the traveller, in English) plus its two
   * translations. Only ever set on recents / ad-hoc destinations — never
   * present in the bundled hk_poi.json seed.
   */
  note?: string;
  noteYue?: string;
  noteCmn?: string;
}

const POIS = poiData as Poi[];

// Tuned per P4 spec: "mongkok", "tst", "旺角", "queen mary hospital" must all
// hit their expected destination as the top result. Weighting name_en and
// aliases highest (that's where the abbreviations/misspellings live), area
// lowest (it's a tie-breaker, not a primary match field).
const fuse = new Fuse(POIS, {
  keys: [
    { name: 'name_en', weight: 0.35 },
    { name: 'aliases', weight: 0.35 },
    { name: 'name_yue', weight: 0.2 },
    { name: 'name_cmn', weight: 0.2 },
    { name: 'area', weight: 0.1 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 1,
});

type TranslateStage = 'idle' | 'translating' | 'error';

export default function GoHome() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<GoLang>('yue');
  const [recents, setRecents] = useState<RecentEntry[] | null>(null); // null = loading
  const [translateStage, setTranslateStage] = useState<TranslateStage>('idle');
  const [translateStaged, setTranslateStaged] = useState<{ yue: string; cmn: string }>({
    yue: '',
    cmn: '',
  });
  const [translateErrorMsg, setTranslateErrorMsg] = useState<string | null>(null);

  const loadRecents = useCallback(() => {
    getRecents().then(setRecents);
  }, []);

  // Recents change every time a card is viewed, so refresh whenever this
  // screen regains focus (coming back from a destination card).
  useFocusEffect(loadRecents);

  const showResults = query.trim().length > 0;

  const results = useMemo(() => {
    if (!showResults) return [];
    return fuse.search(query.trim()).map(r => r.item);
  }, [query, showResults]);

  const selectDestination = (dest: Poi) => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/go/card',
      params: { id: String(dest.id), lang, data: JSON.stringify(dest) },
    });
  };

  const nameFor = (dest: Poi) => (lang === 'cmn' ? dest.name_cmn : dest.name_yue);

  const runTranslateFallback = async () => {
    const text = query.trim();
    if (!text) return;
    setTranslateStage('translating');
    setTranslateErrorMsg(null);
    setTranslateStaged({ yue: '', cmn: '' });
    try {
      const both = await translateToBoth(text, (stage, partial) =>
        setTranslateStaged(prev => ({ ...prev, [stage]: partial })),
      );
      const adHoc: Poi = {
        id: -Date.now(),
        name_yue: both.yue.translation,
        name_cmn: both.cmn.translation,
        name_en: text,
        area: 'Custom destination',
        landmark_yue: '',
        landmark_cmn: '',
        landmark_en: '',
        jyutping: both.yue.romanization,
        pinyin: both.cmn.romanization,
        aliases: [],
      };
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTranslateStage('idle');
      setQuery('');
      selectDestination(adHoc);
    } catch (e) {
      setTranslateStage('error');
      setTranslateErrorMsg(e instanceof TranslateError ? e.message : 'Could not reach the translator.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={text => {
            setQuery(text);
            setTranslateStage('idle');
          }}
          placeholder="Where are you going?"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} style={styles.clearButton} hitSlop={12}>
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Language toggle */}
      <View style={styles.toggleRow}>
        <Chip label="粵 Cantonese" active={lang === 'yue'} onPress={() => setLang('yue')} />
        <Chip label="普 Mandarin" active={lang === 'cmn'} onPress={() => setLang('cmn')} />
      </View>

      {showResults ? (
        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {translateStage === 'idle' && (
                <>
                  <Text style={styles.emptyText}>
                    No match for &ldquo;{query}&rdquo; in the destination list yet.
                  </Text>
                  <Pressable style={styles.translateCta} onPress={runTranslateFallback} hitSlop={8}>
                    <Text style={styles.translateCtaText}>
                      Translate &ldquo;{query}&rdquo; as a destination →
                    </Text>
                  </Pressable>
                </>
              )}
              {translateStage === 'translating' && (
                <View style={styles.stagedWrap}>
                  <ActivityIndicator color={colors.accentPrimary} />
                  <Text style={styles.stagedLabel}>Translating…</Text>
                  {/* Never-blank staged progress: show partial tokens as they stream in. */}
                  {(translateStaged.yue.length > 0 || translateStaged.cmn.length > 0) && (
                    <View style={styles.stagedPreview}>
                      <Text style={styles.stagedPreviewText}>
                        粵 {translateStaged.yue || '…'}
                      </Text>
                      <Text style={styles.stagedPreviewText}>
                        普 {translateStaged.cmn || '…'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {translateStage === 'error' && (
                <View style={styles.stagedWrap}>
                  <Text style={styles.errorText}>{translateErrorMsg}</Text>
                  <Pressable style={styles.retryChip} onPress={runTranslateFallback} hitSlop={8}>
                    <Text style={styles.retryChipText}>↻ Try again</Text>
                  </Pressable>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => selectDestination(item)}>
              <Text style={styles.pin}>📍</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowPrimary}>
                  <Text style={styles.rowChars}>{nameFor(item)}</Text>
                  <Text style={styles.rowEnglish}>  {item.name_en}</Text>
                </Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <>
          <Text style={styles.sectionLabel}>Recent</Text>
          {recents === null ? (
            <ActivityIndicator color={colors.textSecondary} style={{ marginTop: spacing.lg }} />
          ) : recents.length === 0 ? (
            <Text style={styles.emptyText}>
              Destinations you look up will show up here for quick offline access.
            </Text>
          ) : (
            <FlatList
              data={recents}
              keyExtractor={item => String(item.id)}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => selectDestination(item)}>
                  <Text style={styles.pin}>📍</Text>
                  <View style={styles.rowText}>
                    <Text style={styles.recentChars}>{nameFor(item)}</Text>
                    <Text style={styles.rowSub}>
                      {item.name_en} · {item.area}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  searchWrap: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  searchInput: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    fontSize: type.size.base,
    fontFamily: type.fontFamily,
    color: colors.textPrimary,
    minHeight: 48,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: type.size.small,
    color: colors.textSecondary,
    fontFamily: type.fontFamily,
    marginBottom: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    minHeight: 48,
  },
  pin: {
    fontSize: 20,
  },
  rowText: {
    flex: 1,
  },
  rowPrimary: {
    fontSize: type.size.base,
    fontFamily: type.fontFamilyMedium,
  },
  rowChars: {
    color: colors.textPrimary,
    fontFamily: type.fontFamilyMedium,
    fontSize: type.size.base,
  },
  rowEnglish: {
    color: colors.textSecondary,
    fontSize: type.size.small,
    fontFamily: type.fontFamily,
  },
  recentChars: {
    fontSize: 17,
    fontFamily: type.fontFamilyMedium,
    color: colors.textPrimary,
    lineHeight: 17 * type.lineHeight.relaxed,
  },
  rowSub: {
    fontSize: type.size.small,
    color: colors.textSecondary,
    fontFamily: type.fontFamily,
  },
  emptyWrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: type.size.small,
    color: colors.textSecondary,
    fontFamily: type.fontFamily,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  translateCta: {
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  translateCtaText: {
    fontSize: type.size.small,
    fontFamily: type.fontFamilyMedium,
    color: colors.accentPrimary,
  },
  stagedWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  stagedLabel: {
    fontSize: type.size.small,
    fontFamily: type.fontFamilyMedium,
    color: colors.textSecondary,
  },
  stagedPreview: {
    marginTop: spacing.xs,
    gap: 4,
    alignItems: 'center',
  },
  stagedPreviewText: {
    fontSize: type.size.body,
    fontFamily: type.fontFamily,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: type.size.small,
    fontFamily: type.fontFamily,
    color: colors.statusConfused,
    textAlign: 'center',
  },
  retryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  retryChipText: {
    fontSize: type.size.small,
    fontFamily: type.fontFamilyMedium,
    color: colors.accentPrimary,
  },
});
