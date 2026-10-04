import { useKeepAwake } from 'expo-keep-awake';
import { useWindowDimensions, View } from 'react-native';

import { useBoxLoop } from '@/hooks/useBoxLoop';
import { LOOP_TEST_BOX, LoopTestCanvas } from '@/render/LoopTestCanvas';

import { LOOP_SPEED_PX_PER_SEC, styles } from './LoopTestScreen.styles';
import type { LoopTestScreenProps } from './LoopTestScreen.types';

/**
 * Pantalla de diagnóstico del hito 1: valida que el loop de Reanimated + Skia corre
 * fluido en el celular. No es jugabilidad.
 */
export function LoopTestScreen(_props: LoopTestScreenProps) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const { x, fpsText } = useBoxLoop({
    areaWidth: width,
    boxWidth: LOOP_TEST_BOX.width,
    speed: LOOP_SPEED_PX_PER_SEC,
  });

  return (
    <View style={styles.container} testID="loop-test-screen">
      <LoopTestCanvas x={x} fpsText={fpsText} height={height} />
    </View>
  );
}
