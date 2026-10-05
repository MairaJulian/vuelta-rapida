import { render, screen } from '@testing-library/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useFrameCallback } from 'react-native-reanimated';

import { DriveScreen } from './DriveScreen';

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('DriveScreen', () => {
  it('muestra el lienzo y los botones', async () => {
    await render(<DriveScreen />);
    expect(screen.getByTestId('drive-screen')).toBeTruthy();
    expect(screen.container.queryAll((node) => node.type === 'Canvas')).toHaveLength(1);
    expect(screen.getByLabelText('Frenar')).toBeTruthy();
  });

  it('mantiene la pantalla encendida mientras se maneja', async () => {
    await render(<DriveScreen />);
    expect(useKeepAwake).toHaveBeenCalled();
  });

  it('arranca el loop de la simulación', async () => {
    jest.mocked(useFrameCallback).mockClear();
    await render(<DriveScreen />);
    expect(useFrameCallback).toHaveBeenCalled();
  });
});
