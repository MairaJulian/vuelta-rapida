import { render } from '@testing-library/react-native';

import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { generateScenery, SKID_MARK_WIDTH } from '@/core/Scenery';
import type { Scenery } from '@/core/Scenery';

import { AsphaltDetails } from './AsphaltDetails';
import { COLORS } from './AsphaltDetails.styles';

const scenery = generateScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 0 });

async function renderDetails(data: Scenery = scenery) {
  const screen = await render(<AsphaltDetails scenery={data} />);
  const paths = screen.container.queryAll((node) => node.type === 'Path');
  const byColor = (color: string) => paths.find((node) => node.props.color === color)!;
  return { paths, byColor };
}

describe('AsphaltDetails', () => {
  it('dibuja todo en tres trazos: parches claros, oscuros y marcas de frenada', async () => {
    const { paths } = await renderDetails();
    expect(paths.map((node) => node.props.color)).toEqual([
      COLORS.patchLight,
      COLORS.patchDark,
      COLORS.skid,
    ]);
  });

  it('cada parche es un polígono cerrado', async () => {
    const { byColor } = await renderDetails();
    const light = scenery.patches.filter((patch) => patch.tone === 'light');
    const path: string = byColor(COLORS.patchLight).props.path;
    expect(path.match(/M /g)).toHaveLength(light.length);
    expect(path.match(/Z/g)).toHaveLength(light.length);
    expect(path.startsWith(`M ${light[0].points[0].x} ${light[0].points[0].z}`)).toBe(true);
  });

  it('las marcas de frenada son líneas abiertas del ancho de una goma', async () => {
    const { byColor } = await renderDetails();
    const skid = byColor(COLORS.skid);
    expect(skid.props).toMatchObject({
      style: 'stroke',
      strokeWidth: SKID_MARK_WIDTH,
      strokeCap: 'round',
    });
    expect(skid.props.path.match(/M /g)).toHaveLength(scenery.skidMarks.length);
    expect(skid.props.path).not.toContain('Z');
  });

  it('sin detalles no dibuja nada (Skia no acepta un path vacío)', async () => {
    const { paths } = await renderDetails({ ...scenery, patches: [], skidMarks: [] });
    expect(paths).toEqual([]);
  });
});
