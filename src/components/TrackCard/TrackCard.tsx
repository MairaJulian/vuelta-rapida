import { Canvas, Path, RoundedRect } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getCarColor } from '@/core/CarPalette';
import { getCircuitDifficulty, getCircuitSummary } from '@/core/Circuits';
import type { CircuitDifficulty } from '@/core/Circuits';
import { formatLapTime } from '@/core/LapTimer';
import { getTrackOutline } from '@/core/Track';

import { COLORS, ILLUSTRATION_WIDTH, LAYOUT, styles } from './TrackCard.styles';
import type { TrackCardProps } from './TrackCard.types';

/** Texto y cantidad de puntos llenos (de 3) de cada dificultad. */
const DIFFICULTY_LEVELS: Record<CircuitDifficulty, { label: string; dots: number }> = {
  facil: { label: 'Fácil', dots: 1 },
  media: { label: 'Media', dots: 2 },
  dificil: { label: 'Difícil', dots: 3 },
};

/**
 * Tarjeta de una pista en la selección (pantalla 05 del handoff): el trazado con la
 * marca de la meta, el nombre, el largo y las curvas, la dificultad (tres puntos y su
 * nombre) y el récord de la pista con el nombre y el color de quien lo tiene.
 */
export function TrackCard({ circuit, selected, record, onPress }: TrackCardProps) {
  const { illustration, finishMark } = LAYOUT;
  const outline = useMemo(
    () =>
      getTrackOutline(
        circuit.centerline,
        ILLUSTRATION_WIDTH,
        illustration.height,
        illustration.padding,
      ),
    [circuit.centerline, illustration.height, illustration.padding],
  );
  const difficulty = DIFFICULTY_LEVELS[getCircuitDifficulty(circuit)];
  const holder = record ? record.profile.name.toUpperCase() : null;
  const recordText = record ? `Récord ${formatLapTime(record.timeMs)}` : 'Sin récord todavía';

  return (
    <Pressable
      testID={`track-card-${circuit.id}`}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${circuit.name}. Dificultad ${difficulty.label.toLowerCase()}. ${recordText}${holder ? `, de ${holder}` : ''}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? COLORS.soft : COLORS.card,
          borderColor: selected ? COLORS.blue : 'transparent',
        },
      ]}
    >
      <View
        style={[styles.illustration, { backgroundColor: selected ? COLORS.blue : COLORS.blueTint }]}
      >
        <Canvas
          style={styles.canvas}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Path
            path={outline.path}
            style="stroke"
            strokeWidth={illustration.stroke}
            strokeJoin="round"
            color={selected ? COLORS.white : COLORS.blue}
          />
          <RoundedRect
            x={outline.start.x - finishMark.width / 2}
            y={outline.start.y - finishMark.height / 2}
            width={finishMark.width}
            height={finishMark.height}
            r={finishMark.r}
            color={COLORS.coral}
          />
        </Canvas>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
          {circuit.name}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summary}>{getCircuitSummary(circuit)}</Text>
          <View
            style={styles.difficulty}
            testID={`track-difficulty-${circuit.id}`}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            {[1, 2, 3].map((level) => (
              <View
                key={level}
                style={[
                  styles.difficultyDot,
                  { backgroundColor: level <= difficulty.dots ? COLORS.blue : COLORS.soft },
                ]}
              />
            ))}
            <Text style={styles.difficultyText}>{difficulty.label}</Text>
          </View>
        </View>
        <View
          style={[styles.chip, { backgroundColor: record ? COLORS.lime : COLORS.soft }]}
          testID={`track-record-${circuit.id}`}
        >
          <Text style={styles.chipText}>{recordText}</Text>
          {record && holder ? (
            <>
              <View
                style={[
                  styles.holderDot,
                  { backgroundColor: getCarColor(record.profile.colorId).hex },
                ]}
              />
              <Text style={styles.chipText}>{holder}</Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
