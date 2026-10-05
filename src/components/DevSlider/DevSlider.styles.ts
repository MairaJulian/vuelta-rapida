import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** ink */
  label: '#14171F',
  /** muted */
  value: '#5D6472',
  /** soft */
  track: '#ECEEF2',
  /** blue */
  fill: '#2F6BDD',
  thumb: '#FFFFFF',
} as const;

export const THUMB_SIZE = 22;
/** Alto del área táctil: mínimo de 48 dp del handoff para objetivos táctiles. */
const TOUCH_HEIGHT = 48;

export const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    color: COLORS.label,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: COLORS.value,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  touchArea: {
    height: TOUCH_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.track,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.fill,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLORS.thumb,
    borderWidth: 2,
    borderColor: COLORS.fill,
    top: (TOUCH_HEIGHT - THUMB_SIZE) / 2,
  },
});
