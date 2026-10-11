import { Canvas, Group } from '@shopify/react-native-skia';

import { DEFAULT_SCENERY_DISPLAY } from '@/core/SceneryView';
import { AsphaltDetails } from '@/render/AsphaltDetails';
import { CarShape } from '@/render/CarShape';
import { GhostCar } from '@/render/GhostCar';
import { GrassLayer } from '@/render/GrassLayer';
import { ParticleLayer } from '@/render/ParticleLayer';
import { SceneryLayer } from '@/render/SceneryLayer';
import { TrackLayer } from '@/render/TrackLayer';

import { DEFAULT_STRIPE_ANGLE, styles } from './DriveCanvas.styles';
import type { DriveCanvasProps } from './DriveCanvas.types';

/**
 * Escena de manejo: dentro del grupo de la cámara, en coordenadas del mundo, el pasto,
 * la pista, la escenografía del suelo, las partículas, el auto fantasma, el auto del
 * jugador y, encima, la escenografía con altura. Solo aplica transformaciones; no calcula nada.
 */
export function DriveCanvas({
  track,
  cameraTransform,
  carTransform,
  sceneryView,
  atlas = null,
  particles,
  display = DEFAULT_SCENERY_DISPLAY,
  carColor,
  carNumber = null,
  ghost = null,
}: DriveCanvasProps) {
  const { scenery } = track;
  const shown = display.visible && scenery && sceneryView ? { scenery, view: sceneryView } : null;
  return (
    <Canvas style={styles.canvas}>
      <Group transform={cameraTransform}>
        <GrassLayer
          angle={scenery?.grassStripeAngle ?? DEFAULT_STRIPE_ANGLE}
          contrast={display.grassContrast}
        />
        <TrackLayer track={track} />
        {shown ? (
          <>
            <AsphaltDetails scenery={shown.scenery} />
            <SceneryLayer scenery={shown.scenery} atlas={atlas} view={shown.view} level="ground" />
          </>
        ) : null}
        {display.particles && particles ? (
          <ParticleLayer particles={particles} image={atlas} />
        ) : null}
        {ghost ? (
          <GhostCar
            transform={ghost.transform}
            labelTransform={ghost.labelTransform}
            opacity={ghost.opacity}
            color={ghost.color}
            name={ghost.name}
          />
        ) : null}
        <CarShape transform={carTransform} bodyColor={carColor} number={carNumber} />
        {shown ? (
          <SceneryLayer scenery={shown.scenery} atlas={atlas} view={shown.view} level="raised" />
        ) : null}
      </Group>
    </Canvas>
  );
}
