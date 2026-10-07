import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatLapTime, getCurrentLap, getCurrentLapTicks, ticksToMs } from '@/core/LapTimer';
import type { LapState } from '@/core/LapTimer';

import { HUD_INTERVAL_MS, NO_RECORD, OFFSETS, styles } from './LapHud.styles';
import type { LapHudProps, LapHudTexts } from './LapHud.types';

/**
 * Textos del HUD: la vuelta en curso (1 antes de cruzar la meta, para no mostrar
 * "Vuelta 0"), su tiempo y el récord.
 */
export function getLapHudTexts(
  laps: LapState,
  recordMs: number | null,
  stepHz: number,
): LapHudTexts {
  return {
    lap: String(Math.max(getCurrentLap(laps), 1)),
    time: formatLapTime(ticksToMs(getCurrentLapTicks(laps), stepHz)),
    best: recordMs === null ? NO_RECORD : formatLapTime(recordMs),
  };
}

/**
 * HUD mínimo provisorio de la carrera (pantalla 07 del handoff, sin minimapa, delta
 * ni pausa): "Vuelta" arriba a la izquierda, el tiempo de la vuelta al centro y
 * "Mejor" arriba a la derecha. Lee las vueltas de la simulación unas 20 veces por
 * segundo; la simulación no espera a React. Deja pasar los toques.
 */
export function LapHud({ laps, recordMs, stepHz, style }: LapHudProps) {
  const insets = useSafeAreaInsets();
  const [texts, setTexts] = useState(() => getLapHudTexts(laps.get(), recordMs, stepHz));

  useEffect(() => {
    const refresh = () => {
      const next = getLapHudTexts(laps.get(), recordMs, stepHz);
      // Mismo contenido, mismo objeto: React no vuelve a dibujar.
      setTexts((current) =>
        current.lap === next.lap && current.time === next.time && current.best === next.best
          ? current
          : next,
      );
    };
    refresh();
    const timer = setInterval(refresh, HUD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [laps, recordMs, stepHz]);

  return (
    <View testID="lap-hud" style={[styles.container, { top: OFFSETS.top + insets.top }, style]}>
      <View
        style={[styles.sidePill, { left: OFFSETS.side + insets.left }]}
        accessible
        accessibilityLabel={`Vuelta ${texts.lap}`}
      >
        <Text style={styles.label}>Vuelta</Text>
        <Text style={styles.lapValue} testID="lap-hud-lap">
          {texts.lap}
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
        style={[styles.sidePill, { right: OFFSETS.side + insets.right }]}
        accessible
        accessibilityLabel={recordMs === null ? 'Sin mejor vuelta' : `Mejor vuelta ${texts.best}`}
      >
        <Text style={styles.label}>Mejor</Text>
        <Text style={styles.bestValue} testID="lap-hud-best">
          {texts.best}
        </Text>
      </View>
    </View>
  );
}
