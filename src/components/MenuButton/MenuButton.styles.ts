import { StyleSheet } from 'react-native';

import type { MenuButtonVariant } from './MenuButton.types';

/** Tokens del handoff (README §Tokens y §Componentes). */
export const COLORS = {
  blue: '#2F6BDD',
  bluePressed: '#1F55BC',
  card: '#FFFFFF',
  soft: '#ECEEF2',
  ink: '#14171F',
  inkPressed: '#2A2F3A',
  lime: '#C6EB4C',
  /** coral-text */
  danger: '#B83126',
  /** oklch(0.95 0.03 28) */
  dangerPressed: '#FBE8E5',
} as const;

/** Colores de cada variante: fondo, presionado, texto e ícono. */
export const VARIANTS: Record<
  MenuButtonVariant,
  { background: string; pressed: string; text: string; icon: string; height: number }
> = {
  primary: {
    background: COLORS.blue,
    pressed: COLORS.bluePressed,
    text: COLORS.card,
    icon: COLORS.card,
    height: 52,
  },
  secondary: {
    background: COLORS.card,
    pressed: COLORS.soft,
    text: COLORS.ink,
    icon: COLORS.blue,
    height: 50,
  },
  danger: {
    background: 'transparent',
    pressed: COLORS.dangerPressed,
    text: COLORS.danger,
    icon: COLORS.danger,
    height: 50,
  },
  run: {
    background: COLORS.ink,
    pressed: COLORS.inkPressed,
    text: COLORS.card,
    icon: COLORS.ink,
    height: 64,
  },
};

/** Círculo del final: blanco con ícono azul (Continuar) o lima con ícono tinta (Correr). */
export const CIRCLE = {
  primary: { size: 44, background: COLORS.card, icon: COLORS.blue },
  run: { size: 46, background: COLORS.lime, icon: COLORS.ink },
} as const;

/** Opacidad de un botón deshabilitado. */
export const DISABLED_OPACITY = 0.5;

const SHADOW_SM = '0 1px 3px rgba(20, 23, 31, 0.12)';

export const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    paddingHorizontal: 22,
  },
  secondary: {
    boxShadow: SHADOW_SM,
  },
  // Con círculo al final, el texto va a la izquierda y el círculo pegado al borde.
  withCircle: {
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  run: {
    paddingLeft: 32,
    paddingRight: 10,
    gap: 18,
  },
  centered: {
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
  },
  primaryLabel: {
    fontSize: 21,
  },
  runLabel: {
    fontSize: 26,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  trailing: {
    marginLeft: 'auto',
  },
});
