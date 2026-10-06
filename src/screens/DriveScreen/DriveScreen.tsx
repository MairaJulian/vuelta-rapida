import { useKeepAwake } from 'expo-keep-awake';
import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import type { DevPanel as DevPanelComponent } from '@/components/DevPanel';
import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import { withTiltPreferences } from '@/core/PlayerPreferences';
import { DEFAULT_TILT_CONFIG, withTiltSteering } from '@/core/TiltSteering';
import { DEFAULT_TRACK } from '@/core/Track';
import { useDrivingLoop } from '@/hooks/useDrivingLoop';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';
import { useTiltOutput } from '@/hooks/useTiltSteering';
import { ButtonControls } from '@/input/ButtonControls';
import { useDrivingInput } from '@/input/InputControls';
import { TiltControls } from '@/input/TiltControls';
import { DriveCanvas } from '@/render/DriveCanvas';

import { styles } from './DriveScreen.styles';
import type { DriveScreenProps } from './DriveScreen.types';

// Solo en desarrollo: en producción Metro reemplaza __DEV__ por false, pliega la
// condición y descarta el require, así que el panel no entra en el bundle.
const DevPanel: typeof DevPanelComponent | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/DevPanel').DevPanel
  : null;

/**
 * Pantalla de manejo libre: la pista, el auto, la cámara y el modo de control
 * (botones o inclinación), más el panel de ajuste en desarrollo. Compone piezas;
 * no calcula nada.
 */
export function DriveScreen(_props: DriveScreenProps) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const viewport = useMemo(() => ({ width, height }), [width, height]);
  const { preferences } = usePlayerPreferences();
  const [drivingConfig, setDrivingConfig] = useState(DEFAULT_DRIVING_CONFIG);
  const [cameraConfig, setCameraConfig] = useState(DEFAULT_CAMERA_CONFIG);
  const [track, setTrack] = useState(DEFAULT_TRACK);
  // Zona muerta, filtro y rampa son ajustes de desarrollo; calibración y sensibilidad, del jugador.
  const [tuning] = useState(DEFAULT_TILT_CONFIG);
  const input = useDrivingInput();
  const tiltOutput = useTiltOutput();

  const controlMode = preferences.controlMode ?? 'buttons';
  const tiltConfig = useMemo(() => withTiltPreferences(tuning, preferences), [tuning, preferences]);

  // Con inclinación la señal ya llega continua y filtrada: la rampa del modelo se acorta.
  const activeDrivingConfig = useMemo(
    () => (controlMode === 'tilt' ? withTiltSteering(drivingConfig, tiltConfig) : drivingConfig),
    [controlMode, drivingConfig, tiltConfig],
  );

  const loop = useDrivingLoop({
    input,
    track,
    viewport,
    drivingConfig: activeDrivingConfig,
    cameraConfig,
  });

  return (
    <View style={styles.container} testID="drive-screen">
      <DriveCanvas
        track={track}
        cameraTransform={loop.cameraTransform}
        carTransform={loop.carTransform}
      />
      {controlMode === 'tilt' ? (
        <TiltControls input={input} config={tiltConfig} output={tiltOutput} />
      ) : (
        <ButtonControls input={input} />
      )}
      {DevPanel ? (
        <DevPanel
          drivingConfig={drivingConfig}
          onDrivingConfigChange={setDrivingConfig}
          cameraConfig={cameraConfig}
          onCameraConfigChange={setCameraConfig}
          track={track}
          onTrackChange={setTrack}
          car={loop.car}
          fps={loop.fps}
          onResetCar={loop.reset}
        />
      ) : null}
    </View>
  );
}
