import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { createRandomState, nextRandom } from '@/core/SeededRandom';

import {
  CONFETTI_COLORS,
  CONFETTI_SEED,
  DEFAULT_DURATION_MS,
  DEFAULT_PIECES,
  PIECE,
  styles,
} from './Confetti.styles';
import type { ConfettiPiece, ConfettiProps } from './Confetti.types';

/** Papelitos con una semilla fija: la misma lluvia cada vez. */
export function createConfettiPieces(count: number, seed = CONFETTI_SEED): ConfettiPiece[] {
  let state = createRandomState(seed);
  const next = () => {
    const result = nextRandom(state);
    state = result.state;
    return result.value;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: next(),
    delay: next() * 0.35,
    spins: (next() * 2 - 1) * 3,
    sway: 10 + next() * 20,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
}

function Piece({
  piece,
  progress,
  width,
  height,
}: {
  piece: ConfettiPiece;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    // Cada papelito usa su tramo del avance general: arranca con su demora.
    const t = Math.min(Math.max((progress.get() - piece.delay) / (1 - piece.delay), 0), 1);
    return {
      opacity: t > 0 && t < 1 ? 1 : 0,
      transform: [
        { translateX: piece.x * (width - PIECE.width) + Math.sin(t * Math.PI * 4) * piece.sway },
        { translateY: -PIECE.height + t * (height + PIECE.height * 2) },
        { rotate: `${piece.spins * 360 * t}deg` },
      ],
    };
  });
  return <Animated.View style={[styles.piece, { backgroundColor: piece.color }, style]} />;
}

/**
 * Lluvia de papelitos para celebrar un récord. Cae una vez, en el hilo de UI
 * (Reanimated), y no recibe toques ni la lee el lector de pantalla.
 */
export function Confetti({
  width,
  height,
  pieces = DEFAULT_PIECES,
  durationMs = DEFAULT_DURATION_MS,
}: ConfettiProps) {
  const progress = useSharedValue(0);
  const list = useMemo(() => createConfettiPieces(pieces), [pieces]);

  useEffect(() => {
    progress.set(withTiming(1, { duration: durationMs, easing: Easing.in(Easing.quad) }));
  }, [durationMs, progress]);

  return (
    <View
      testID="confetti"
      style={styles.overlay}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {list.map((piece, i) => (
        <Piece key={i} piece={piece} progress={progress} width={width} height={height} />
      ))}
    </View>
  );
}
