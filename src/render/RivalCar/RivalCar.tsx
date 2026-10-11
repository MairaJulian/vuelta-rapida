import type { Transforms3d } from '@shopify/react-native-skia';
import { memo } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { GhostCar } from '@/render/GhostCar';

import { RIVAL_LABEL_OFFSET } from './RivalCar.styles';
import type { RivalCarProps } from './RivalCar.types';

const HIDDEN: Transforms3d = [{ translateX: 0 }, { translateY: 0 }];

/**
 * Auto rival: el monoplaza con el color del rival, sin número, y su nombre en chico encima.
 * Es el dibujo del fantasma (`GhostCar`) pero opaco. Es solo dibujo: no choca con el jugador.
 * Va dentro del grupo de la cámara, en coordenadas del mundo.
 */
export const RivalCar = memo(function RivalCar({
  cars,
  index,
  cameraView,
  color,
  name,
}: RivalCarProps) {
  const transform = useDerivedValue<Transforms3d>(() => {
    const car = cars.get()[index];
    return car ? [{ translateX: car.x }, { translateY: car.z }, { rotate: car.heading }] : HIDDEN;
  });
  const labelTransform = useDerivedValue<Transforms3d>(() => {
    const car = cars.get()[index];
    if (!car) {
      return HIDDEN;
    }
    return [
      { translateX: car.x },
      { translateY: car.z },
      // Contra el giro de la cámara, para que el nombre quede derecho en la pantalla.
      { rotate: cameraView.get().rotation },
      { translateY: -RIVAL_LABEL_OFFSET },
    ];
  });
  const opacity = useSharedValue(1);
  return (
    <GhostCar
      transform={transform}
      labelTransform={labelTransform}
      opacity={opacity}
      color={color}
      name={name}
    />
  );
});
