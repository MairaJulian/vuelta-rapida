import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens; pantalla 08). */
export const COLORS = {
  /** backdrop: el único velo translúcido */
  backdrop: 'rgba(20, 23, 31, 0.55)',
  /** bg */
  panel: '#F6F7F9',
  ink: '#14171F',
  muted: '#5D6472',
  white: '#FFFFFF',
  blue: '#2F6BDD',
  /** blue-soft */
  onChip: '#E9EFFC',
  /** soft */
  offChip: '#ECEEF2',
} as const;

/** Medidas de la pantalla 08, en dp. */
export const LAYOUT = {
  /** Margen del panel a los bordes. */
  inset: 14,
  panelWidth: 340,
  /** "Vuelta actual": a la derecha del panel. */
  currentGap: 36,
  currentTop: 33,
  /** Interruptores de sonido y vibración, abajo a la derecha sobre el velo. */
  togglesRight: 28,
  togglesBottom: 22,
} as const;

export const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.backdrop,
  },
  // Panel: radio 24, padding 22/24.
  panel: {
    position: 'absolute',
    width: LAYOUT.panelWidth,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 24,
    backgroundColor: COLORS.panel,
  },
  title: {
    color: COLORS.ink,
    fontSize: 42,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 13,
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
  exit: {
    alignSelf: 'flex-start',
  },
  current: {
    position: 'absolute',
  },
  currentLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  currentTime: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  toggles: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 10,
  },
  toggle: {
    minWidth: 168,
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
