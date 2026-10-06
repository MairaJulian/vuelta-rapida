import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  card: '#FFFFFF',
  /** ink */
  title: '#14171F',
  /** muted */
  subtitle: '#5D6472',
} as const;

const BACK_SIZE = 48;

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  back: {
    width: BACK_SIZE,
    height: BACK_SIZE,
    borderRadius: BACK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    // Sombra sm del handoff.
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.12)',
  },
  backArrow: {
    color: COLORS.title,
    fontSize: 24,
    fontWeight: '800',
    marginTop: -2,
  },
  titles: {
    flex: 1,
  },
  title: {
    color: COLORS.title,
    fontSize: 32,
    fontWeight: '900',
    textTransform: 'uppercase',
    lineHeight: 34,
  },
  subtitle: {
    color: COLORS.subtitle,
    fontSize: 13,
  },
});
