import { useKeepAwake } from 'expo-keep-awake';
import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import { DEFAULT_TRACK } from '@/core/Track';
import { useDrivingLoop } from '@/hooks/useDrivingLoop';
import { ButtonControls } from '@/input/ButtonControls';
import { useDrivingInput } from '@/input/InputControls';
import { DriveCanvas } from '@/render/DriveCanvas';

import { styles } from './DriveScreen.styles';
import type { DriveScreenProps } from './DriveScreen.types';

/**
 * Pantalla de manejo libre del hito 2: el óvalo, el auto, la cámara y los botones.
 * Compone piezas; no calcula nada.
 */
export function DriveScreen(_props: DriveScreenProps) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const viewport = useMemo(() => ({ width, height }), [width, height]);
  const input = useDrivingInput();
  const loop = useDrivingLoop({
    input,
    track: DEFAULT_TRACK,
    viewport,
    drivingConfig: DEFAULT_DRIVING_CONFIG,
    cameraConfig: DEFAULT_CAMERA_CONFIG,
  });

  return (
    <View style={styles.container} testID="drive-screen">
      <DriveCanvas
        track={DEFAULT_TRACK}
        cameraTransform={loop.cameraTransform}
        carTransform={loop.carTransform}
      />
      <ButtonControls input={input} />
    </View>
  );
}
