import { Group, Path } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { SKID_MARK_WIDTH } from '@/core/Scenery';
import type { TrackPoint } from '@/core/Track';

import { COLORS } from './AsphaltDetails.styles';
import type { AsphaltDetailsProps } from './AsphaltDetails.types';

/** Varias líneas en un solo path SVG; cerradas si `closed`. */
function toPath(lines: TrackPoint[][], closed: boolean): string {
  return lines
    .map(
      (points) =>
        points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.z}`).join(' ') +
        (closed ? ' Z' : ''),
    )
    .join(' ');
}

/**
 * Detalles sobre el asfalto, en coordenadas del mundo: parches un poco más claros y
 * más oscuros, y marcas de frenada antes de las curvas cerradas. Va encima de la pista
 * y debajo de los autos. Es estático.
 */
export const AsphaltDetails = memo(function AsphaltDetails({ scenery }: AsphaltDetailsProps) {
  const paths = useMemo(
    () => ({
      light: toPath(
        scenery.patches.filter((patch) => patch.tone === 'light').map((patch) => patch.points),
        true,
      ),
      dark: toPath(
        scenery.patches.filter((patch) => patch.tone === 'dark').map((patch) => patch.points),
        true,
      ),
      skid: toPath(scenery.skidMarks, false),
    }),
    [scenery],
  );
  // Un path vacío no se dibuja: Skia no acepta un texto SVG vacío.
  return (
    <Group>
      {paths.light ? <Path path={paths.light} color={COLORS.patchLight} /> : null}
      {paths.dark ? <Path path={paths.dark} color={COLORS.patchDark} /> : null}
      {paths.skid ? (
        <Path
          path={paths.skid}
          style="stroke"
          strokeWidth={SKID_MARK_WIDTH}
          strokeCap="round"
          strokeJoin="round"
          color={COLORS.skid}
        />
      ) : null}
    </Group>
  );
});
