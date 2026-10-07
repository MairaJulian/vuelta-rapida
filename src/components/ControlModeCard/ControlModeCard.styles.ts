import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens y §Componentes). */
export const COLORS = {
  card: '#FFFFFF',
  /** blue: borde de la tarjeta elegida y fondo de su ilustración */
  blue: '#2F6BDD',
  /** blue-tint: fondo de la ilustración no elegida */
  blueTint: '#EEF2FB',
  /** coral: el freno en la ilustración de botones */
  coral: '#E04A3A',
  /** ink */
  title: '#14171F',
  /** ink-2 */
  text: '#3A404C',
  /** soft */
  chip: '#ECEEF2',
  white: '#FFFFFF',
} as const;

const STROKE = 4;

/** Altura de cada punto del arco de la ilustración de inclinación, de izquierda a derecha, en dp. */
export const TILT_DOT_RISE = [6, 2, 0, 2, 6] as const;

export const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2.5,
    backgroundColor: COLORS.card,
    // Sombra sm del handoff.
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.12)',
  },
  illustration: {
    width: 130,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 8,
    gap: 6,
  },
  title: {
    color: COLORS.title,
    fontSize: 26,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  description: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 19,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.chip,
  },
  chipText: {
    color: COLORS.title,
    fontSize: 12,
    fontWeight: '700',
  },
  // Ilustración de inclinación: un celular girado bajo un arco de puntos.
  tiltDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 6,
  },
  tiltDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tiltPhone: {
    width: 70,
    height: 36,
    borderRadius: 10,
    borderWidth: STROKE,
    transform: [{ rotate: '-12deg' }],
  },
  // Ilustración de botones: una pantalla con dos botones de dirección y el freno.
  buttonsScreen: {
    width: 92,
    height: 50,
    borderRadius: 10,
    borderWidth: STROKE,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 7,
    gap: 4,
  },
  steerDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  brakeDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    marginLeft: 'auto',
    backgroundColor: COLORS.coral,
  },
});
