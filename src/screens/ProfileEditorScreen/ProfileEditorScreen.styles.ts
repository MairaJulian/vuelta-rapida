import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens; pantalla 04). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
  card: '#FFFFFF',
  ink: '#14171F',
  muted: '#5D6472',
  blue: '#2F6BDD',
  /** coral-text: el error del nombre */
  error: '#B83126',
  /** Franja de piano: coral y blanco. */
  kerb: '#E04A3A',
  white: '#FFFFFF',
} as const;

/** Padding de los menús (encabezado 22/36); se suma a los insets del área segura. */
export const PADDING = { vertical: 22, horizontal: 36 } as const;

/** Medidas de la pantalla 04, en dp. */
export const LAYOUT = {
  previewWidth: 250,
  /** Auto de costado, de 74 dp de ancho (166 de largo), subido 14 dp. */
  car: { width: 74, canvasWidth: 230, canvasHeight: 110, lift: 14 },
  /** Franja de piano: casillas de 16 dp, de 10 de alto. */
  kerbSquare: 16,
  kerbHeight: 10,
} as const;

/** Casillas de la franja de piano, alternando coral y blanco. */
export const KERB_SQUARES = Math.ceil(LAYOUT.previewWidth / LAYOUT.kerbSquare);

const SHADOW_SM = '0 1px 3px rgba(20, 23, 31, 0.1)';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Vista previa (250) | opciones, con 28 de separación.
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 28,
    marginTop: 12,
  },
  preview: {
    width: LAYOUT.previewWidth,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    boxShadow: SHADOW_SM,
  },
  car: {
    marginTop: -LAYOUT.car.lift,
  },
  kerb: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: LAYOUT.kerbHeight,
    flexDirection: 'row',
  },
  kerbSquare: {
    width: LAYOUT.kerbSquare,
    height: LAYOUT.kerbHeight,
  },
  badge: {
    position: 'absolute',
    left: 14,
    bottom: 20,
    maxWidth: LAYOUT.previewWidth - 28,
  },
  options: {
    flex: 1,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 24,
  },
  nameField: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  // Campo de texto: píldora blanca de 56, texto 800 de 22.
  input: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 999,
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
    backgroundColor: COLORS.card,
    boxShadow: SHADOW_SM,
  },
  help: {
    color: COLORS.muted,
    fontSize: 12,
  },
  error: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '700',
  },
});
