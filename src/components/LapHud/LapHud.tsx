import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { formatLapTime, ticksToMs } from '@/core/LapTimer';
import type { RaceLapView } from '@/core/RaceFlow';

import { COLORS, HUD_INTERVAL_MS, NO_RECORD, OFFSETS, PAUSE_SIZE, styles } from './LapHud.styles';
import type { LapHudProps, LapHudTexts } from './LapHud.types';

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
 * HUD de la carrera (pantalla 07 del handoff, sin minimapa ni delta): "Vuelta 2/3"
 * arriba a la izquierda, el tiempo de la vuelta al centro, y "Mejor" y el botón de
 * pausa arriba a la derecha. Lee la vuelta de la carrera unas 20 veces por
 * segundo; la simulación no espera a React. Solo el botón de pausa recibe toques.
 */
export function LapHud({ lapView, recordMs, stepHz, onPause, style }: LapHudProps) {
  const insets = useSafeAreaInsets();
  const [texts, setTexts] = useState(() => getLapHudTexts(lapView.get(), recordMs, stepHz));

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
    refresh();
    const timer = setInterval(refresh, HUD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [lapView, recordMs, stepHz]);

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
      <View
        style={styles.timerPill}
        accessible
        accessibilityLabel={`Tiempo de vuelta ${texts.time}`}
      >
        <Text style={styles.timerValue} testID="lap-hud-time">
          {texts.time}
        </Text>
      </View>
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
