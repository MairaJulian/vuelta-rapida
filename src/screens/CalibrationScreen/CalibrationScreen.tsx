import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevSlider } from '@/components/DevSlider';
import { MenuHeader } from '@/components/MenuHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DEAD_ZONE_LEVELS, deadZoneFromLevel, deadZoneToLevel } from '@/core/PlayerPreferences';
import { DEFAULT_TILT_CONFIG } from '@/core/TiltSteering';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';
import { useTiltSteering } from '@/hooks/useTiltSteering';
import { CalibrationGauge } from '@/render/CalibrationGauge';

import { PADDING, styles } from './CalibrationScreen.styles';
import type { CalibrationScreenProps } from './CalibrationScreen.types';

/**
 * Calibración de la inclinación (pantalla 03 del handoff). El jugador sostiene el
 * celular como va a jugar, elige la sensibilidad y la zona muerta, y toca Listo:
 * esa posición pasa a ser "derecho". Se guarda y sigue a la pista.
 */
export function CalibrationScreen(_props: CalibrationScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences } = usePlayerPreferences();
  const [sensitivity, setSensitivity] = useState(preferences.tiltSensitivity);
  // En radianes, como se guarda; el slider muestra el nivel (1 a 5).
  const [deadZone, setDeadZone] = useState(preferences.tiltDeadZone);

  // Mientras calibra, el ángulo se mide desde el celular nivelado (sin calibración previa).
  const previewConfig = useMemo(
    () => ({ ...DEFAULT_TILT_CONFIG, neutralAngle: 0, sensitivity, deadZone }),
    [sensitivity, deadZone],
  );
  const tilt = useTiltSteering({ config: previewConfig });

  const done = () => {
    updatePreferences({
      controlMode: 'tilt',
      tiltNeutralAngle: tilt.calibrate(previewConfig).neutralAngle,
      tiltSensitivity: sensitivity,
      tiltDeadZone: deadZone,
    });
    router.replace('/pista');
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/control'));

  return (
    <View
      testID="calibration-screen"
      style={[
        styles.container,
        {
          paddingTop: PADDING.vertical + insets.top,
          paddingBottom: PADDING.vertical + insets.bottom,
          paddingLeft: PADDING.horizontal + insets.left,
          paddingRight: PADDING.horizontal + insets.right,
        },
      ]}
    >
      <MenuHeader title="Calibrá el volante" subtitle="Paso 2 de 2" onBack={back} />
      <View style={styles.body}>
        <Text style={styles.instructions}>
          Sostené el celular como vas a jugar y tocá <Text style={styles.bold}>Listo</Text>.
        </Text>
        <View style={styles.center}>
          <CalibrationGauge output={tilt.output} config={previewConfig} />
          <Text style={styles.caption}>
            En la zona azul el auto va derecho. En las marcas, dobla a fondo.
          </Text>
        </View>
        <View style={styles.card}>
          <DevSlider
            testID="slider-sensitivity"
            label="Sensibilidad"
            value={sensitivity}
            min={1}
            max={10}
            step={1}
            onChange={setSensitivity}
          />
          <View style={styles.scale}>
            <Text style={styles.scaleLabel}>Suave</Text>
            <Text style={styles.scaleLabel}>Rápida</Text>
          </View>
          <DevSlider
            testID="slider-dead-zone"
            label="Zona muerta"
            value={Math.round(deadZoneToLevel(deadZone))}
            min={1}
            max={DEAD_ZONE_LEVELS}
            step={1}
            onChange={(level) => setDeadZone(deadZoneFromLevel(level))}
          />
          <View style={styles.scale}>
            <Text style={styles.scaleLabel}>Chica</Text>
            <Text style={styles.scaleLabel}>Grande</Text>
          </View>
          <PrimaryButton label="Listo" height={56} onPress={done} />
        </View>
      </View>
    </View>
  );
}
