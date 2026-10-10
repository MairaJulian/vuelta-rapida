import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
} as const;

/** Padding de los menús (encabezado 22/36); se suma a los insets del área segura. */
export const PADDING = { vertical: 22, horizontal: 36 } as const;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
    marginTop: 18,
    // La fila llega hasta los bordes de la pantalla al desplazarse.
    marginHorizontal: -PADDING.horizontal,
  },
  // Margen para que no se corten las sombras de las tarjetas.
  listContent: {
    gap: 16,
    paddingHorizontal: PADDING.horizontal,
    paddingVertical: 4,
  },
});
