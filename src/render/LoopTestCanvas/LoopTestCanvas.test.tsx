import { render } from '@testing-library/react-native';

import { LoopTestCanvas } from './LoopTestCanvas';
import { BOX, COLORS } from './LoopTestCanvas.styles';

const shared = <Value,>(value: Value) => ({ value }) as never;

describe('LoopTestCanvas', () => {
  it('renderiza sin errores', async () => {
    await render(<LoopTestCanvas x={shared(0)} fpsText={shared('0 FPS')} height={400} />);
  });

  it('pasa los valores compartidos al rectángulo y al texto sin leerlos', async () => {
    const x = shared(12);
    const fpsText = shared('60 FPS');
    const screen = await render(<LoopTestCanvas x={x} fpsText={fpsText} height={400} />);
    const tree = JSON.stringify(screen.toJSON());

    expect(tree).toContain('RoundedRect');
    expect(tree).toContain('SkiaText');
    expect(tree).toContain(COLORS.box);
    expect(tree).toContain(COLORS.text);
  });

  it('centra el rectángulo verticalmente', async () => {
    const screen = await render(<LoopTestCanvas x={shared(0)} fpsText={shared('')} height={400} />);
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).toContain(`"y":${(400 - BOX.height) / 2}`);
  });
});
