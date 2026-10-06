import { useKeepAwake } from 'expo-keep-awake';
import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import type { DevPanel as DevPanelComponent } from '@/components/DevPanel';
import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import { DEFAULT_TRACK } from '@/core/Track';
import { useDrivingLoop } from '@/hooks/useDrivingLoop';
import { ButtonControls } from '@/input/ButtonControls';
import { useDrivingInput } from '@/input/InputControls';
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
 * Pantalla de manejo libre: la pista, el auto, la cámara y los botones,
 * más el panel de ajuste en desarrollo. Compone piezas; no calcula nada.
 */
export function DriveScreen(_props: DriveScreenProps) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const viewport = useMemo(() => ({ width, height }), [width, height]);
  const [drivingConfig, setDrivingConfig] = useState(DEFAULT_DRIVING_CONFIG);
  const [cameraConfig, setCameraConfig] = useState(DEFAULT_CAMERA_CONFIG);
  const [track, setTrack] = useState(DEFAULT_TRACK);
  const input = useDrivingInput();
  const loop = useDrivingLoop({
    input,
    track,
    viewport,
    drivingConfig,
    cameraConfig,
  });

  return (
    <View style={styles.container} testID="drive-screen">
      <DriveCanvas
        track={track}
        cameraTransform={loop.cameraTransform}
        carTransform={loop.carTransform}
      />
      <ButtonControls input={input} />
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
