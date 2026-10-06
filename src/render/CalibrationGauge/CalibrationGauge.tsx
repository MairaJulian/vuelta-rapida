import { Canvas, Circle, Group, Path } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { clamp } from '@/core/MathUtils';
import { getFullTurnAngle } from '@/core/TiltSteering';

import { COLORS, DEGREES_INTERVAL_MS, GAUGE, styles } from './CalibrationGauge.styles';
import type { CalibrationGaugeProps, GaugePoint } from './CalibrationGauge.types';

const DEG = Math.PI / 180;

/**
 * Ángulo del marcador sobre el arco, en grados desde arriba: a giro completo llega
 * a `GAUGE.span`. Así el arco muestra lo que hace el auto con la sensibilidad elegida.
 */
export function gaugeAngle(relativeAngle: number, fullTurnAngle: number): number {
  'worklet';
  const ratio = fullTurnAngle > 0 ? clamp(relativeAngle / fullTurnAngle, -1, 1) : 0;
  return ratio * GAUGE.span;
}

/** Punto del arco a `degrees` grados de arriba (positivo, a la derecha). */
export function arcPoint(degrees: number): GaugePoint {
  'worklet';
  const angle = (degrees - 90) * DEG;
  return {
    x: GAUGE.centerX + GAUGE.radius * Math.cos(angle),
    y: GAUGE.centerY + GAUGE.radius * Math.sin(angle),
  };
}

/** Tramo del arco de `from` a `to` grados desde arriba, como path SVG. */
export function arcPath(from: number, to: number): string {
  const start = arcPoint(from);
  const end = arcPoint(to);
  const largeArc = to - from > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${GAUGE.radius} ${GAUGE.radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Grados con signo, redondeados: "+14°", "−12°" (signo menos tipográfico) o "0°". */
export function formatSignedDegrees(radians: number): string {
  const degrees = Math.round(radians / DEG);
  if (degrees === 0) {
    return '0°';
  }
  return `${degrees > 0 ? '+' : '−'}${Math.abs(degrees)}°`;
}

/**
 * Medidor de la calibración (pantalla 03 del handoff): un arco con la zona muerta
 * al centro, un marcador que sigue la dirección y la silueta del teléfono que gira
 * con el ángulo y muestra los grados. El arco y el marcador son Skia; la silueta,
 * una vista animada. Todo se mueve en el hilo de UI; solo el texto de los grados
 * pasa por React, unas 10 veces por segundo.
 */
export function CalibrationGauge({ output, config }: CalibrationGaugeProps) {
  const fullTurnAngle = getFullTurnAngle(config.sensitivity);
  const deadZoneSpan = gaugeAngle(config.deadZone, fullTurnAngle);
  const [degrees, setDegrees] = useState(() => formatSignedDegrees(output.get().relativeAngle));

  const markerX = useDerivedValue(
    () => arcPoint(gaugeAngle(output.get().relativeAngle, fullTurnAngle)).x,
  );
  const markerY = useDerivedValue(
    () => arcPoint(gaugeAngle(output.get().relativeAngle, fullTurnAngle)).y,
  );

  const phoneStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${output.get().relativeAngle}rad` }],
  }));

  useEffect(() => {
    const timer = setInterval(
      () => setDegrees(formatSignedDegrees(output.get().relativeAngle)),
      DEGREES_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [output]);

  return (
    <View style={styles.container} testID="calibration-gauge">
      <Canvas style={styles.canvas}>
        <Path
          path={arcPath(-90, 90)}
          style="stroke"
          strokeWidth={GAUGE.stroke}
          strokeCap="round"
          color={COLORS.track}
        />
        <Path
          path={arcPath(-deadZoneSpan, deadZoneSpan)}
          style="stroke"
          strokeWidth={GAUGE.stroke}
          strokeCap="round"
          color={COLORS.deadZone}
        />
        <Group>
          <Circle cx={markerX} cy={markerY} r={GAUGE.ringRadius} color={COLORS.ring} />
          <Circle cx={markerX} cy={markerY} r={GAUGE.markerRadius} color={COLORS.marker} />
        </Group>
      </Canvas>
      <Animated.View style={[styles.phone, phoneStyle]} testID="calibration-phone">
        <Text style={styles.degrees} accessibilityLabel={`Inclinación ${degrees}`}>
          {degrees}
        </Text>
      </Animated.View>
    </View>
  );
}
