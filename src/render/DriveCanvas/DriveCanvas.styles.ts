import { StyleSheet } from 'react-native';

export const COLORS = {
  /** Césped liso fuera de la zona con franjas; mismo tono que TrackLayer. */
  background: '#C8E8CD',
} as const;

export const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});
