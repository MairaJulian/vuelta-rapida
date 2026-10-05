import { render, screen } from '@testing-library/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useFrameCallback } from 'react-native-reanimated';

import { LoopTestScreen } from './LoopTestScreen';

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

describe('LoopTestScreen', () => {
  it('renderiza el contenedor con el lienzo', async () => {
    await render(<LoopTestScreen />);
    expect(screen.getByTestId('loop-test-screen')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain('RoundedRect');
  });

  it('mantiene la pantalla encendida mientras se mide', async () => {
    await render(<LoopTestScreen />);
    expect(useKeepAwake).toHaveBeenCalled();
  });

  it('arranca el loop por cuadro', async () => {
    await render(<LoopTestScreen />);
    expect(useFrameCallback).toHaveBeenCalled();
  });
});
