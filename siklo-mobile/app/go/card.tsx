import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DestinationCard from '../../src/features/go/DestinationCard';
import type { GoLang, Poi } from '../../src/features/go/GoHome';
import poiData from '../../src/data/hk_poi.json';
import { colors, type } from '../../src/theme/tokens';

const POIS = poiData as Poi[];

export default function CardScreen() {
  const params = useLocalSearchParams<{ id?: string; lang?: string }>();

  const destination = useMemo(
    () => POIS.find(p => String(p.id) === String(params.id)),
    [params.id]
  );

  const initialLang: GoLang = params.lang === 'cmn' ? 'cmn' : 'yue';

  if (!destination) {
    // Never-blank state — this shouldn't happen from normal navigation, but
    // guard against a stale/bad id param instead of crashing.
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Destination not found.</Text>
        <Text style={styles.missingLink} onPress={() => router.back()}>
          ← Back
        </Text>
      </View>
    );
  }

  return (
    <DestinationCard
      destination={destination}
      initialLang={initialLang}
      onBack={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  missingText: {
    color: colors.textSecondary,
    fontFamily: type.fontFamily,
    fontSize: type.size.base,
  },
  missingLink: {
    color: colors.accentPrimary,
    fontFamily: type.fontFamilyMedium,
    fontSize: type.size.base,
  },
});
