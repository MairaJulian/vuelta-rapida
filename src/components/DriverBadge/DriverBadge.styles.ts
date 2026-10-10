import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens; pantalla 04, píldora sobre la vista previa). */
export const COLORS = {
  ink: '#14171F',
  white: '#FFFFFF',
} as const;

const CIRCLE = 28;

export const styles = StyleSheet.create({
  // Píldora tinta: padding 4 12 4 4.
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: COLORS.ink,
  },
  // Círculo del número, del color del auto: 28 de alto y crece con dos cifras.
  circle: {
    minWidth: CIRCLE,
    height: CIRCLE,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  name: {
    flexShrink: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
