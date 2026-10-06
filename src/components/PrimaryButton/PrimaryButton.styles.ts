import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens y §Componentes). */
export const COLORS = {
  /** blue */
  background: '#2F6BDD',
  /** blue-pressed */
  pressed: '#1F55BC',
  text: '#FFFFFF',
} as const;

export const DISABLED_OPACITY = 0.45;

export const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
