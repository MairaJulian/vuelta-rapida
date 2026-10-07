import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  card: '#FFFFFF',
  /** ink */
  text: '#14171F',
  /** muted */
  muted: '#5D6472',
  /** soft */
  soft: '#ECEEF2',
  /** blue */
  primary: '#2F6BDD',
  primaryText: '#FFFFFF',
} as const;

/** Distancia a los bordes; se suma a los insets del área segura. */
export const OFFSETS = {
  left: 28,
  /** Debajo de la píldora "Vuelta" del HUD (14 dp del borde + unos 56 de alto). */
  top: 80,
  /** Deja libres los botones de dirección (76 dp + 18 de margen + aire). */
  bottomClearance: 112,
} as const;

/** Ancho relativo de cada lectura en la fila, para que "180 km/h" no se parta. */
export const READING_FLEX = { speed: 1.5, heading: 1, drift: 1.3, fps: 0.8 } as const;

/** Cada cuánto se refrescan las lecturas, en ms. */
export const READINGS_INTERVAL_MS = 200;

const PANEL_WIDTH = 340;

export const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    pointerEvents: 'box-none',
  },
  toggle: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    // Sombra md del handoff (HUD).
    boxShadow: '0 2px 6px rgba(20, 23, 31, 0.14)',
  },
  toggleText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  panel: {
    flex: 1,
    width: PANEL_WIDTH,
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    boxShadow: '0 2px 6px rgba(20, 23, 31, 0.14)',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 16,
  },
  // Una sola fila compacta: deja la mayor parte del alto para los sliders.
  readings: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  reading: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.soft,
  },
  readingLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  readingValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  action: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.soft,
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  // Selector de modo de control: dos opciones en una píldora.
  segmented: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 999,
    backgroundColor: COLORS.soft,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: COLORS.primaryText,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  switchLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  actionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  actionTextPrimary: {
    color: COLORS.primaryText,
  },
});
