import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens). */
export const COLORS = {
  card: '#FFFFFF',
  /** blue-soft: la fila del jugador activo (como la mejor vuelta en Resultados) */
  blueSoft: '#E9EFFC',
  blue: '#2F6BDD',
  ink: '#14171F',
  muted: '#5D6472',
  /** lime: solo récords (el líder) */
  lime: '#C6EB4C',
  /** Borde de la barra, para que el blanco se vea sobre la fila. */
  barEdge: 'rgba(20, 23, 31, 0.2)',
} as const;

const LEADER = 30;

export const styles = StyleSheet.create({
  // Fila blanca de 48, radio 14 (como las vueltas de Resultados, más baja).
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.08)',
  },
  position: {
    width: LEADER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leader: {
    height: LEADER,
    borderRadius: LEADER / 2,
    backgroundColor: COLORS.lime,
  },
  positionText: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // Barra del color del auto, como en las torres de tiempos de la tele.
  bar: {
    width: 6,
    height: 28,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.barEdge,
  },
  name: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  number: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  time: {
    minWidth: 96,
    textAlign: 'right',
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
