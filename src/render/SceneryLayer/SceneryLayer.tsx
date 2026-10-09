import { Atlas, Group, matchFont } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import type { AtlasSprites } from '@/hooks/useSceneryView';
import { Grandstand } from '@/render/Grandstand';
import { BOARD_FONT_SIZE, SceneryBoard } from '@/render/SceneryBoard';

import { BOARD_FONT } from './SceneryLayer.styles';
import type { SceneryLayerProps } from './SceneryLayer.types';

/** Fuente de los carteles, de 1 m: cada cartel la escala. */
const boardFont = () => matchFont({ ...BOARD_FONT, fontSize: BOARD_FONT_SIZE });

/** Una capa del atlas: solo los dibujos visibles, que elige `useSceneryView`. */
function AtlasLayer({ image, sprites }: { image: SkImage | null; sprites: AtlasSprites }) {
  return image ? (
    <Atlas image={image} sprites={sprites.sprites} transforms={sprites.transforms} />
  ) : null;
}

/**
 * Escenografía del circuito en coordenadas del mundo. Va dos veces dentro del grupo de
 * la cámara: el suelo debajo de los autos y lo elevado encima, cada altura en su capa
 * con paralaje. Solo dibuja lo que le pasan: qué árboles se ven y cuánto se corre cada
 * capa lo calcula `useSceneryView`.
 */
export const SceneryLayer = memo(function SceneryLayer({
  scenery,
  atlas,
  view,
  level,
}: SceneryLayerProps) {
  const boards = useMemo(
    () =>
      scenery.objects.filter(
        (object) => object.kind === 'distanceBoard' || object.kind === 'billboard',
      ),
    [scenery.objects],
  );
  const stands = useMemo(
    () => scenery.objects.filter((object) => object.kind === 'grandstand'),
    [scenery.objects],
  );
  const font = useMemo(() => boardFont(), []);

  if (level === 'ground') {
    return (
      <Group>
        <AtlasLayer image={atlas} sprites={view.atlas.shadows} />
        <AtlasLayer image={atlas} sprites={view.atlas.tyres} />
      </Group>
    );
  }

  // De lo más bajo a lo más alto: lo alto tapa a lo bajo, como se ve desde arriba.
  return (
    <Group>
      <Group transform={view.levels.bushes}>
        <AtlasLayer image={atlas} sprites={view.atlas.bushes} />
      </Group>
      <Group transform={view.levels.signs}>
        {stands.map((stand) => (
          <Grandstand key={`${stand.x},${stand.z}`} stand={stand} part="stands" />
        ))}
        {boards.map((board) => (
          <SceneryBoard key={`${board.x},${board.z}`} board={board} font={font} />
        ))}
      </Group>
      <Group transform={view.levels.treesSmall}>
        <AtlasLayer image={atlas} sprites={view.atlas.treesSmall} />
      </Group>
      <Group transform={view.levels.treesLarge}>
        <AtlasLayer image={atlas} sprites={view.atlas.treesLarge} />
        {stands.map((stand) => (
          <Grandstand key={`${stand.x},${stand.z}`} stand={stand} part="roof" />
        ))}
      </Group>
    </Group>
  );
});
