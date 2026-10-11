import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
  /** muted */
  muted: '#5D6472',
} as const;

/** Padding de los menús (22/36, y 26 abajo en la pantalla 05); se suma al área segura. */
export const PADDING = { top: 22, bottom: 26, horizontal: 36 } as const;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Las tarjetas y el fantasma van en un desplazamiento vertical: en un celular bajo, todo
  // entra con solo deslizar. El margen negativo deja las tarjetas llegar al borde.
  body: {
    flex: 1,
    marginHorizontal: -PADDING.horizontal,
  },
  bodyContent: {
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
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
  // Fantasma: rótulo y las tres opciones.
  ghost: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: PADDING.horizontal,
  },
  ghostLabel: {
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
