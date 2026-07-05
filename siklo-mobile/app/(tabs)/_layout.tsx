import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps, BottomTabHeaderProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, type } from '../../src/theme/tokens';

const TAB_META: Record<string, { label: string; icon: string; title: string }> = {
  index: { label: 'Talk', icon: '💬', title: 'Talk' },
  go: { label: 'Go', icon: '📍', title: 'Go' },
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        header: props => <Header {...props} />,
      }}
      tabBar={props => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Talk' }} />
      <Tabs.Screen name="go" options={{ title: 'Go' }} />
    </Tabs>
  );
}

// Header per PRD: 52px, "Siklo" wordmark 15/700 top-left with 識路 10px
// below, centered context title 17/600 (ported from siklo/src/App.css
// .app-header).
function Header({ route }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const meta = TAB_META[route.name];
  return (
    <View style={[styles.header, { paddingTop: insets.top, height: layout.headerHeight + insets.top }]}>
      <View style={styles.wordmark}>
        <Text style={styles.wordmarkEn}>Siklo</Text>
        <Text style={styles.wordmarkZh}>識路</Text>
      </View>
      <Text style={styles.contextTitle} numberOfLines={1}>
        {meta?.title ?? ''}
      </Text>
    </View>
  );
}

// Bottom nav per PRD: 64px height, amber active state with a 2px top
// indicator, 11px/500 labels, bg-base with a subtle top border (ported from
// siklo/src/App.css .bottom-nav / .nav-tab).
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.tabBar,
        { height: layout.bottomNavHeight + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem} hitSlop={8}>
            {focused && <View style={styles.indicator} />}
            <Text style={styles.tabIcon}>{meta?.icon}</Text>
            <Text style={[styles.tabLabel, { color: focused ? colors.accentPrimary : colors.textSecondary }]}>
              {meta?.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.bgBase,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  wordmark: {
    flexDirection: 'column',
  },
  wordmarkEn: {
    fontSize: 15,
    fontFamily: type.fontFamilyBold,
    color: colors.textPrimary,
    lineHeight: 15,
  },
  wordmarkZh: {
    fontSize: type.size.micro,
    color: colors.textSecondary,
    marginTop: 1,
    fontFamily: type.fontFamily,
  },
  contextTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: type.size.title,
    fontFamily: type.fontFamilySemiBold,
    color: colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 64,
    minHeight: 48,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: layout.navIndicatorWidth,
    height: 2,
    backgroundColor: colors.accentPrimary,
    borderRadius: 2,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: type.size.label,
    fontFamily: type.fontFamilyMedium,
  },
});
