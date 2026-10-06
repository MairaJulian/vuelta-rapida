import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevSlider } from '@/components/DevSlider';
import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_DRIVING_CONFIG, getDriftSpeed, getSpeed } from '@/core/DrivingModel';
import type { CarState, DrivingConfig } from '@/core/DrivingModel';

import { OFFSETS, READING_FLEX, READINGS_INTERVAL_MS, styles } from './DevPanel.styles';
import type { DevPanelProps, DevReadings, NumericCameraKey, SliderSpec } from './DevPanel.types';

const MS_TO_KMH = 3.6;
const percent = (value: number) => `${Math.round(value * 100)} %`;
const seconds = (value: number) => `${value.toFixed(2)} s`;
const metersPerSecond = (value: number) => `${value} m/s · ${Math.round(value * MS_TO_KMH)} km/h`;

/** Parámetros del manejo sin slider: salen de las medidas del auto, no se ajustan a mano. */
export const FIXED_DRIVING_KEYS: (keyof DrivingConfig)[] = ['wheelbase', 'collisionRadius'];

/** Sliders del modelo de manejo. Los rangos contienen los valores por defecto. */
export const DRIVING_SLIDERS: SliderSpec<keyof DrivingConfig>[] = [
  {
    key: 'maxSpeed',
    label: 'Velocidad máxima',
    min: 10,
    max: 90,
    step: 1,
    format: metersPerSecond,
  },
  {
    key: 'acceleration',
    label: 'Aceleración',
    min: 2,
    max: 50,
    step: 0.5,
    format: (v) => `${v} m/s²`,
  },
  {
    key: 'drag',
    label: 'Resistencia',
    min: 0,
    max: 1.5,
    step: 0.05,
    format: (v) => `${v.toFixed(2)} /s`,
  },
  {
    key: 'brakeDeceleration',
    label: 'Frenado',
    min: 5,
    max: 60,
    step: 1,
    format: (v) => `${v} m/s²`,
  },
  {
    key: 'maxSteerAngle',
    label: 'Ángulo de giro máximo',
    min: 0.1,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round((v * 180) / Math.PI)}°`,
  },
  {
    key: 'highSpeedSteerFactor',
    label: 'Giro a velocidad máxima',
    min: 0.02,
    max: 1,
    step: 0.01,
    format: percent,
  },
  {
    key: 'steerFalloff',
    label: 'Curva del giro (exponente)',
    min: 0.2,
    max: 3,
    step: 0.05,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'steerInTime',
    label: 'Tiempo de giro',
    min: 0,
    max: 1,
    step: 0.01,
    format: seconds,
  },
  {
    key: 'steerReturnTime',
    label: 'Tiempo de vuelta al centro',
    min: 0,
    max: 1,
    step: 0.01,
    format: seconds,
  },
  {
    key: 'lateralGrip',
    label: 'Agarre lateral',
    min: 1,
    max: 20,
    step: 0.5,
    format: (v) => `${v} /s`,
  },
  {
    key: 'reverseDelay',
    label: 'Pausa antes de la reversa',
    min: 0,
    max: 1.5,
    step: 0.05,
    format: seconds,
  },
  {
    key: 'maxReverseSpeed',
    label: 'Velocidad de reversa',
    min: 1,
    max: 20,
    step: 0.5,
    format: metersPerSecond,
  },
  {
    key: 'wallFriction',
    label: 'Pérdida contra el borde',
    min: 0,
    max: 5,
    step: 0.1,
    format: (v) => `${v.toFixed(1)} /s`,
  },
];

/** Sliders de la cámara. `rotateWithCar` queda fuera: se prueba en el hito 3. */
export const CAMERA_SLIDERS: SliderSpec<NumericCameraKey>[] = [
  { key: 'pixelsPerMeter', label: 'Zoom', min: 4, max: 30, step: 0.5, format: (v) => `${v} dp/m` },
  {
    key: 'speedZoomOut',
    label: 'Alejar con la velocidad',
    min: 0,
    max: 0.8,
    step: 0.05,
    format: percent,
  },
  {
    key: 'lookAheadSeconds',
    label: 'Mirar adelante',
    min: 0,
    max: 1.5,
    step: 0.05,
    format: (v) => `${v.toFixed(2)} s`,
  },
  {
    key: 'maxLookAheadFraction',
    label: 'Tope de mirar adelante',
    min: 0,
    max: 0.45,
    step: 0.05,
    format: percent,
  },
];

const READING_LABELS: [keyof DevReadings, string][] = [
  ['speed', 'Velocidad'],
  ['heading', 'Rumbo'],
  ['drift', 'Deriva'],
  ['fps', 'FPS'],
];

/** Lecturas para mostrar: velocidad en km/h, rumbo en grados (0 = arriba, sentido horario), deriva y fps. */
export function formatReadings(car: CarState, fps: number): DevReadings {
  const degrees = ((((car.heading * 180) / Math.PI) % 360) + 360) % 360;
  // Redondea antes de formatear para que -0.04 no se muestre como "-0.0".
  const drift = Math.round(getDriftSpeed(car) * 10) / 10 || 0;
  return {
    speed: `${Math.round(getSpeed(car) * MS_TO_KMH)} km/h`,
    heading: `${Math.round(degrees) % 360}°`,
    drift: `${drift.toFixed(1)} m/s`,
    fps: `${Math.round(fps)}`,
  };
}

/**
 * Panel desplegable para ajustar el manejo y la cámara en caliente, con lecturas en
 * vivo. Solo para desarrollo: la pantalla lo carga detrás de `__DEV__`, así que no
 * entra en el bundle de producción.
 */
export function DevPanel({
  drivingConfig,
  onDrivingConfigChange,
  cameraConfig,
  onCameraConfigChange,
  car,
  fps,
  onResetCar,
}: DevPanelProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [readings, setReadings] = useState<DevReadings>(() => formatReadings(car.get(), fps.get()));

  // Las lecturas se toman unas 5 veces por segundo y solo con el panel abierto:
  // re-renderizar React en cada cuadro competiría con el juego.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const refresh = () => setReadings(formatReadings(car.get(), fps.get()));
    refresh();
    const timer = setInterval(refresh, READINGS_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [open, car, fps]);

  const restoreDefaults = () => {
    onDrivingConfigChange(DEFAULT_DRIVING_CONFIG);
    onCameraConfigChange(DEFAULT_CAMERA_CONFIG);
  };

  return (
    <View
      testID="dev-panel"
      style={[
        styles.root,
        {
          left: OFFSETS.left + insets.left,
          top: OFFSETS.top + insets.top,
          bottom: open ? OFFSETS.bottomClearance + insets.bottom : undefined,
        },
      ]}
    >
      <Pressable
        style={styles.toggle}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Cerrar el panel de ajuste' : 'Abrir el panel de ajuste'}
      >
        <Text style={styles.toggleText}>{open ? 'Cerrar' : 'Ajustes'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.panel}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.readings}>
              {READING_LABELS.map(([key, label]) => (
                <View key={key} style={[styles.reading, { flex: READING_FLEX[key] }]}>
                  <Text style={styles.readingLabel}>{label}</Text>
                  <Text style={styles.readingValue} testID={`reading-${key}`}>
                    {readings[key]}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Manejo</Text>
            {DRIVING_SLIDERS.map((spec) => (
              <DevSlider
                key={spec.key}
                testID={`slider-${spec.key}`}
                label={spec.label}
                value={drivingConfig[spec.key]}
                min={spec.min}
                max={spec.max}
                step={spec.step}
                formatValue={spec.format}
                onChange={(value) => onDrivingConfigChange({ ...drivingConfig, [spec.key]: value })}
              />
            ))}

            <Text style={styles.sectionTitle}>Cámara</Text>
            {CAMERA_SLIDERS.map((spec) => (
              <DevSlider
                key={spec.key}
                testID={`slider-${spec.key}`}
                label={spec.label}
                value={cameraConfig[spec.key]}
                min={spec.min}
                max={spec.max}
                step={spec.step}
                formatValue={spec.format}
                onChange={(value) => onCameraConfigChange({ ...cameraConfig, [spec.key]: value })}
              />
            ))}

            <View style={styles.actions}>
              <Pressable style={styles.action} onPress={restoreDefaults} accessibilityRole="button">
                <Text style={styles.actionText}>Restablecer</Text>
              </Pressable>
              <Pressable
                style={[styles.action, styles.actionPrimary]}
                onPress={onResetCar}
                accessibilityRole="button"
              >
                <Text style={[styles.actionText, styles.actionTextPrimary]}>Reiniciar auto</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
