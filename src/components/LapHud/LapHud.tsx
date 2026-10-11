import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PositionTable } from '@/components/PositionTable';
import type { PositionRow, Racer } from '@/components/PositionTable';
import { formatLapDelta, formatLapTime, ticksToMs } from '@/core/LapTimer';
import { PLAYER_ID } from '@/core/RaceFlow';
import type { ClassificationEntry, RaceLapView } from '@/core/RaceFlow';

import {
  COLORS,
  DELTA_ICON_SIZE,
  HUD_INTERVAL_MS,
  NO_RECORD,
  OFFSETS,
  PAUSE_SIZE,
  styles,
} from './LapHud.styles';
import type { GhostDeltaChip, LapHudProps, LapHudTexts } from './LapHud.types';

/** Textos del HUD: la vuelta en curso con el total ("2" y "/3"), su tiempo y el récord. */
export function getLapHudTexts(
  view: RaceLapView,
  recordMs: number | null,
  stepHz: number,
): LapHudTexts {
  return {
    lap: String(view.lap),
    totalLaps: `/${view.totalLaps}`,
    time: formatLapTime(ticksToMs(view.lapTicks, stepHz)),
    best: recordMs === null ? NO_RECORD : formatLapTime(recordMs),
  };
}

/**
 * Filas de la tabla de posiciones, del primero al último. `[]` si corre un solo auto (sin
 * rivales no hay tabla) o si falta algún auto en `racers`.
 */
export function getPositionRows(
  entries: readonly ClassificationEntry[],
  racers: readonly Racer[],
): PositionRow[] {
  if (entries.length < 2) {
    return [];
  }
  const rows: PositionRow[] = [];
  for (const entry of entries) {
    const racer = racers.find((candidate) => candidate.id === entry.id);
    if (!racer) {
      return [];
    }
    rows.push({
      id: entry.id,
      place: entry.place,
      name: racer.name,
      color: racer.color,
      player: entry.id === PLAYER_ID,
    });
  }
  return rows;
}

function sameRows(a: readonly PositionRow[], b: readonly PositionRow[]): boolean {
  return a.length === b.length && a.every((row, i) => row.id === b[i].id);
}

/**
 * Chip de diferencia con el fantasma: el delta en segundos con milésimas y siempre con
 * signo ("−0.412" / "+0.236", para que no dependa del color). Cero cuenta como a favor.
 * `null` si no hay diferencia que mostrar.
 */
export function getGhostDeltaChip(deltaSeconds: number | null): GhostDeltaChip | null {
  if (deltaSeconds === null || !Number.isFinite(deltaSeconds)) {
    return null;
  }
  return { text: formatLapDelta(deltaSeconds * 1000), faster: deltaSeconds <= 0 };
}

/**
 * HUD de la carrera (pantalla 07 del handoff, sin minimapa): "Vuelta 2/3"
 * arriba a la izquierda, el tiempo de la vuelta al centro, y "Mejor" y el botón de
 * pausa arriba a la derecha. Lee la vuelta de la carrera unas 20 veces por
 * segundo; la simulación no espera a React. Con rivales, bajo la vuelta va la tabla de posiciones. Con un fantasma, debajo del cronómetro va el
 * chip de diferencia: verde si el jugador va más rápido, rojo si va más lento. Solo el
 * botón de pausa recibe toques.
 */
export function LapHud({
  lapView,
  recordMs,
  stepHz,
  ghostDelta,
  standings,
  racers,
  onPause,
  style,
}: LapHudProps) {
  const insets = useSafeAreaInsets();
  const [texts, setTexts] = useState(() => getLapHudTexts(lapView.get(), recordMs, stepHz));
  const [chip, setChip] = useState<GhostDeltaChip | null>(null);
  const [positionRows, setPositionRows] = useState<PositionRow[]>([]);

  useEffect(() => {
    const refresh = () => {
      const next = getLapHudTexts(lapView.get(), recordMs, stepHz);
      // Mismo contenido, mismo objeto: React no vuelve a dibujar.
      setTexts((current) =>
        current.lap === next.lap &&
        current.totalLaps === next.totalLaps &&
        current.time === next.time &&
        current.best === next.best
          ? current
          : next,
      );
    };
    const refreshChip = () => {
      const next = getGhostDeltaChip(ghostDelta ? ghostDelta.get() : null);
      setChip((current) =>
        current?.text === next?.text && current?.faster === next?.faster ? current : next,
      );
    };
    const refreshPositions = () => {
      const next = standings && racers ? getPositionRows(standings.get(), racers) : [];
      // El mismo orden de autos, la misma tabla: React no vuelve a dibujar.
      setPositionRows((current) => (sameRows(current, next) ? current : next));
    };
    refresh();
    refreshChip();
    refreshPositions();
    const timer = setInterval(() => {
      refresh();
      refreshChip();
      refreshPositions();
    }, HUD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [lapView, recordMs, stepHz, ghostDelta, standings, racers]);

  return (
    <View testID="lap-hud" style={[styles.container, { top: OFFSETS.top + insets.top }, style]}>
      <View
        style={[styles.sidePill, { left: OFFSETS.side + insets.left }]}
        accessible
        accessibilityLabel={`Vuelta ${texts.lap} de ${texts.totalLaps.slice(1)}`}
      >
        <Text style={styles.label}>Vuelta</Text>
        <Text style={styles.lapValue} testID="lap-hud-lap">
          {texts.lap}
          <Text style={styles.lapTotal}>{texts.totalLaps}</Text>
        </Text>
      </View>
      {positionRows.length > 0 ? (
        <View
          testID="lap-hud-positions"
          style={[styles.positions, { left: OFFSETS.side + insets.left }]}
        >
          <PositionTable rows={positionRows} />
        </View>
      ) : null}
      <View
        style={styles.timerPill}
        accessible
        accessibilityLabel={`Tiempo de vuelta ${texts.time}`}
      >
        <Text style={styles.timerValue} testID="lap-hud-time">
          {texts.time}
        </Text>
      </View>
      {chip ? (
        <View
          testID="lap-hud-delta"
          style={[
            styles.deltaChip,
            { backgroundColor: chip.faster ? COLORS.faster : COLORS.slower },
          ]}
          accessible
          accessibilityLabel={`${chip.faster ? 'Vas adelante' : 'Vas atrás'} del fantasma, ${chip.text} segundos`}
        >
          <Icon name="ghost" color={COLORS.white} size={DELTA_ICON_SIZE} />
          <Text style={styles.deltaText}>{chip.text}</Text>
        </View>
      ) : null}
      <View
        style={[
          styles.sidePill,
          { right: OFFSETS.side + insets.right + (onPause ? PAUSE_SIZE + OFFSETS.gap : 0) },
        ]}
        accessible
        accessibilityLabel={recordMs === null ? 'Sin mejor vuelta' : `Mejor vuelta ${texts.best}`}
      >
        <Text style={styles.label}>Mejor</Text>
        <Text style={styles.bestValue} testID="lap-hud-best">
          {texts.best}
        </Text>
      </View>
      {onPause ? (
        <Pressable
          onPress={onPause}
          accessibilityRole="button"
          accessibilityLabel="Pausa"
          style={({ pressed }) => [
            styles.pause,
            {
              right: OFFSETS.side + insets.right,
              backgroundColor: pressed ? COLORS.pressed : COLORS.pill,
            },
          ]}
        >
          <Icon name="pause" color={COLORS.value} size={22} />
        </Pressable>
      ) : null}
    </View>
  );
}
