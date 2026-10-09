import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens), los mismos del panel de desarrollo. */
export const COLORS = {
  /** ink */
  text: '#14171F',
  /** soft */
  soft: '#ECEEF2',
  /** blue */
  primary: '#2F6BDD',
  primaryText: '#FFFFFF',
} as const;

export const styles = StyleSheet.create({
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
  segmentCompact: {
    paddingHorizontal: 2,
  },
  segmentSelected: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextCompact: {
    fontSize: 11,
  },
  segmentTextSelected: {
    color: COLORS.primaryText,
  },
});
