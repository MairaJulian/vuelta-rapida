import { Group, matchFont, RoundedRect, Text } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { CarShape } from '@/render/CarShape';

import { LABEL } from './GhostCar.styles';
import type { GhostCarProps } from './GhostCar.types';

/**
 * Auto fantasma: el mismo monoplaza del jugador, translúcido y con el color de su dueño,
 * sin número, y su nombre en chico encima. Es solo dibujo: no choca con el auto del
 * jugador. Va dentro del grupo de la cámara, en coordenadas del mundo.
 */
export const GhostCar = memo(function GhostCar({
  transform,
  labelTransform,
  opacity,
  color,
  name,
}: GhostCarProps) {
  const font = useMemo(
    () =>
      matchFont({
        fontFamily: LABEL.fontFamily,
        fontSize: LABEL.fontSize,
        fontStyle: 'normal',
        fontWeight: 'bold',
      }),
    [],
  );
  // El nombre se lee mejor opaco: solo sigue al fantasma cuando se oculta.
  const labelOpacity = useDerivedValue<number>(() => (opacity.get() > 0 ? 1 : 0));
  const textWidth = font.measureText(name).width;
  const boxWidth = textWidth + 2 * LABEL.paddingX;
  const boxHeight = LABEL.fontSize + 2 * LABEL.paddingY;

  return (
    <>
      {/* El auto entero se compone aparte y se aclara junto: sus piezas no se traslucen entre sí. */}
      <Group opacity={opacity}>
        <CarShape transform={transform} bodyColor={color} number={null} />
      </Group>
      <Group transform={labelTransform} opacity={labelOpacity}>
        <RoundedRect
          x={-boxWidth / 2}
          y={-boxHeight / 2 - LABEL.fontSize * 0.3}
          width={boxWidth}
          height={boxHeight}
          r={boxHeight / 2}
          color={LABEL.background}
        />
        <Text x={-textWidth / 2} y={0} text={name} font={font} color={LABEL.text} />
      </Group>
    </>
  );
});
