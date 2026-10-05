import { render } from '@testing-library/react-native';

import { DEFAULT_TRACK } from '@/core/Track';

import { DriveCanvas } from './DriveCanvas';
import { COLORS } from './DriveCanvas.styles';

const shared = <Value,>(value: Value) => ({ value }) as never;

async function renderCanvas() {
  const cameraTransform = shared([{ scale: 14 }]);
  const carTransform = shared([{ translateX: 1 }]);
  const screen = await render(
    <DriveCanvas
      track={DEFAULT_TRACK}
      cameraTransform={cameraTransform}
      carTransform={carTransform}
    />,
  );
  const groups = screen.container.queryAll((node) => node.type === 'Group');
  return { screen, groups, cameraTransform, carTransform };
}

describe('DriveCanvas', () => {
  it('pinta el fondo de césped', async () => {
    const { screen } = await renderCanvas();
    const fill = screen.container.queryAll((node) => node.type === 'Fill')[0];
    expect(fill.props.color).toBe(COLORS.background);
  });

  it('el grupo de la cámara envuelve la pista y el auto', async () => {
    const { groups, cameraTransform, carTransform } = await renderCanvas();
    const camera = groups.find((node) => node.props.transform === cameraTransform)!;
    expect(camera).toBeDefined();
    const car = camera.queryAll(
      (node) => node.type === 'Group' && node.props.transform === carTransform,
    );
    expect(car).toHaveLength(1);
    expect(camera.queryAll((node) => node.type === 'RoundedRect').length).toBeGreaterThan(0);
  });
});
