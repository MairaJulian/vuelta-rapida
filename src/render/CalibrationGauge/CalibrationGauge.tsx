import { Canvas, Circle, Group, Path } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { clamp } from '@/core/MathUtils';
import { getFullTurnAngle } from '@/core/TiltSteering';
import type { TiltConfig } from '@/core/TiltSteering';

import { COLORS, DEGREES_INTERVAL_MS, GAUGE, styles } from './CalibrationGauge.styles';
import type { CalibrationGaugeProps, GaugeMarks, GaugePoint } from './CalibrationGauge.types';

const DEG = Math.PI / 180;

/**
 * Ángulo sobre el arco, en grados desde arriba, para una inclinación en radianes.
 * Escala fija: `GAUGE.scaleDegrees` de inclinación llegan a `GAUGE.span`, con
 * cualquier sensibilidad y zona muerta.
 */
export function gaugeAngle(relativeAngle: number): number {
  'worklet';
  return clamp(relativeAngle / (GAUGE.scaleDegrees * DEG), -1, 1) * GAUGE.span;
}

/**
 * Dónde caen sobre el arco el borde de la zona muerta y el giro completo, en grados
 * desde arriba. La zona muerta solo depende de sí misma; al subir la sensibilidad,
 * el giro completo se acerca al centro.
 */
export function getGaugeMarks(config: TiltConfig): GaugeMarks {
  return {
    deadZone: gaugeAngle(config.deadZone),
    fullTurn: gaugeAngle(getFullTurnAngle(config.deadZone, config.sensitivity)),
  };
}

/** Punto a `radius` del centro y `degrees` grados de arriba (positivo, a la derecha). */
function polarPoint(degrees: number, radius: number): GaugePoint {
  'worklet';
  const angle = (degrees - 90) * DEG;
  return {
    x: GAUGE.centerX + radius * Math.cos(angle),
    y: GAUGE.centerY + radius * Math.sin(angle),
  };
}

/** Punto del arco a `degrees` grados de arriba (positivo, a la derecha). */
export function arcPoint(degrees: number): GaugePoint {
  'worklet';
  return polarPoint(degrees, GAUGE.radius);
}

/** Marca que cruza el arco a `degrees` grados de arriba, como path SVG. */
export function tickPath(degrees: number): string {
  const inner = polarPoint(degrees, GAUGE.radius - GAUGE.tickLength / 2);
  const outer = polarPoint(degrees, GAUGE.radius + GAUGE.tickLength / 2);
  return `M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`;
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
 * Medidor de la calibración (pantalla 03 del handoff): un arco en escala fija de
 * grados con la zona muerta al centro, las marcas de giro completo, un marcador que
 * sigue la inclinación y la silueta del teléfono que gira con el ángulo y muestra
 * los grados. El arco y el marcador son Skia; la silueta, una vista animada. Todo
 * se mueve en el hilo de UI; solo el texto de los grados pasa por React, unas 10
 * veces por segundo.
 */
export function CalibrationGauge({ output, config }: CalibrationGaugeProps) {
  const marks = getGaugeMarks(config);
  const [degrees, setDegrees] = useState(() => formatSignedDegrees(output.get().relativeAngle));

  const markerX = useDerivedValue(() => arcPoint(gaugeAngle(output.get().relativeAngle)).x);
  const markerY = useDerivedValue(() => arcPoint(gaugeAngle(output.get().relativeAngle)).y);

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
          path={arcPath(-marks.deadZone, marks.deadZone)}
          style="stroke"
          strokeWidth={GAUGE.stroke}
          strokeCap="round"
          color={COLORS.deadZone}
        />
        {[-marks.fullTurn, marks.fullTurn].map((angle) => (
          <Path
            key={angle}
            path={tickPath(angle)}
            style="stroke"
            strokeWidth={GAUGE.tickWidth}
            strokeCap="round"
            color={COLORS.fullTurn}
          />
        ))}
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
