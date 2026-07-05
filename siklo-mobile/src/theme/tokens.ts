/**
 * Design tokens ported 1:1 from siklo/src/index.css (:root vars) and
 * siklo/src/App.css layout constants. Keep in sync with the web prototype —
 * do not invent new colors here; if a value is missing, go find it in the
 * prototype rather than guessing.
 */

export const colors = {
  bgBase: '#1A1208',
  bgSurface: '#241A0E',
  bgElevated: '#2E2218',

  accentPrimary: '#E8873A',
  accentHover: '#F59B4E',
  accentMuted: 'rgba(232, 135, 58, 0.13)',
  accentJade: '#7EC8A4',
  accentJadeMuted: 'rgba(126, 200, 164, 0.12)',

  textPrimary: '#F2EDE6',
  textSecondary: '#A89880',
  textCantonese: '#F2EDE6',
  textEnglish: '#D4C9BC',

  statusUnderstood: '#7EC8A4',
  statusConfused: '#E8873A',
  statusImportant: '#E85D3A',
  statusLove: '#E87A9A',

  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderActive: 'rgba(232, 135, 58, 0.25)',

  // Tactile button edges (Duolingo layer, plan §6.1)
  amberFace: '#E8873A',
  amberEdge: '#B05E1F',
  jadeFace: '#7EC8A4',
  jadeEdge: '#4C8F6C',

  // Inverted cream scheme — Go DestinationCard only (hardcoded in the
  // prototype's DestinationCard.jsx, not a CSS var, ported verbatim).
  cardBg: '#F5ECD8',
  cardText: '#1A1208',
  cardTextSecondary: '#5A4D3C',
  cardTextMuted: '#8B7D6B',
  cardBorder: '#C4B8A4',
  cardDivider: '#D4C9B8',
} as const;

export const type = {
  fontFamily: 'PlusJakartaSans_400Regular',
  fontFamilyMedium: 'PlusJakartaSans_500Medium',
  fontFamilySemiBold: 'PlusJakartaSans_600SemiBold',
  fontFamilyBold: 'PlusJakartaSans_700Bold',

  // Named scale, mapped to the sizes actually used across the prototype.
  size: {
    micro: 10, // wordmark-zh
    label: 11, // nav-label / half-label
    caption: 12, // status/uppercase labels, timer
    small: 13, // secondary text, chips
    body: 14, // secondary streamed text
    base: 15, // default body / prototype `body` font-size
    englishStream: 18, // English half streamed text
    title: 17, // header context-title
    cantoneseStream: 20, // Cantonese half streamed text (2-4px larger than English, per PRD)
    cardChar: 52, // DestinationCard main characters
  },

  lineHeight: {
    tight: 1.3,
    base: 1.5,
    relaxed: 1.6, // Cantonese/Chinese text always uses relaxed line-height
  },
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 20,
} as const;

export const layout = {
  headerHeight: 52,
  bottomNavHeight: 64,
  navIndicatorWidth: 32,
  audioButtonHeight: 56,
  maxContentWidth: 430,
} as const;

export const motion = {
  fast: 200,
  base: 250,
  slow: 300,
  cursorFade: 400,
} as const;
