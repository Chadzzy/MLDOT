import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Fuse from 'fuse.js';
import { useRouter } from 'expo-router';
import Chip from '../../components/Chip';
import { colors, radius, spacing, type } from '../../theme/tokens';
import poiData from '../../data/hk_poi.json';

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
  recent?: boolean;
}

const POIS = poiData as Poi[];

const fuse = new Fuse(POIS, {
  keys: ['name_en', 'name_yue', 'name_cmn', 'aliases'],
  threshold: 0.35,
  ignoreLocation: true,
});

export default function GoHome() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<GoLang>('yue');

  const showResults = query.trim().length > 0;

  const results = useMemo(() => {
    if (!showResults) return [];
    return fuse.search(query.trim()).map(r => r.item);
  }, [query, showResults]);

  const recents = useMemo(() => POIS.filter(p => p.recent), []);

  const selectDestination = (dest: Poi) => {
    router.push({ pathname: '/go/card', params: { id: String(dest.id), lang } });
  };

  const nameFor = (dest: Poi) => (lang === 'cmn' ? dest.name_cmn : dest.name_yue);

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
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
            <Text style={styles.emptyText}>No match for &ldquo;{query}&rdquo; yet — free-text translate comes in P4.</Text>
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
  emptyText: {
    fontSize: type.size.small,
    color: colors.textSecondary,
    fontFamily: type.fontFamily,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
