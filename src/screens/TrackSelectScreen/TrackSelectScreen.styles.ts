import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
  /** blue */
  blue: '#2F6BDD',
  /** muted */
  muted: '#5D6472',
} as const;

/** Padding de los menús (22/36, y 26 abajo en la pantalla 05); se suma al área segura. */
export const PADDING = { top: 22, bottom: 26, horizontal: 36 } as const;

/** Espacios del desplazamiento vertical, en dp (los usa `bodyContent` y el cálculo del asomo). */
export const BODY_PADDING_TOP = 16;
export const BODY_PADDING_BOTTOM = 4;
export const BODY_GAP = 12;
/** Cuánto de la primera fila de opciones asoma bajo las tarjetas cuando hay que deslizar. */
export const PEEK_HEIGHT = 28;
/** Indicador de desplazamiento: margen arriba y abajo, y alto mínimo, en dp. */
export const THUMB_INSET = 6;
export const THUMB_MIN_HEIGHT = 28;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Las tarjetas y el fantasma van en un desplazamiento vertical: en un celular bajo, todo
  // entra con solo deslizar. El margen negativo deja las tarjetas llegar al borde.
  bodyFrame: {
    flex: 1,
    marginHorizontal: -PADDING.horizontal,
  },
  body: {
    flex: 1,
  },
  // Pegado al borde derecho, grueso y azul para que se vea sobre el fondo claro.
  scrollThumb: {
    position: 'absolute',
    right: 4,
    width: 6,
    borderRadius: 3,
    backgroundColor: COLORS.blue,
    opacity: 0.7,
  },
  bodyContent: {
    paddingTop: BODY_PADDING_TOP,
    paddingBottom: BODY_PADDING_BOTTOM,
    gap: BODY_GAP,
  },
  // Todas las opciones juntas: se miden de una vez para saber si entran.
  options: {
    gap: BODY_GAP,
  },
  list: {
    flexGrow: 0,
  },
  // Margen para que no se corten las sombras de las tarjetas.
  listContent: {
    gap: 16,
    paddingHorizontal: PADDING.horizontal,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  // Una elección (rivales, dificultad, fantasma): rótulo y opciones.
  option: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: PADDING.horizontal,
  },
  optionLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ghostHint: {
    color: COLORS.muted,
    fontSize: 12,
    paddingHorizontal: PADDING.horizontal,
  },
});
