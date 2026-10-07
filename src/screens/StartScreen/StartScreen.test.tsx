import { act, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { FEATURE_FLAGS } from '@/core/FeatureFlags';
import {
  readPlayerPreferences,
  reloadPlayerPreferences,
  updatePlayerPreferences,
} from '@/hooks/usePlayerPreferences';

import { StartScreen } from './StartScreen';

jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText> };
});

const storage = Storage as unknown as { __reset: () => void };

describe('StartScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    await act(() => reloadPlayerPreferences());
  });

  describe('con la inclinación activada', () => {
    it('la primera vez va a elegir el control', async () => {
      await render(<StartScreen tiltEnabled />);
      expect(screen.getByText('redirect:/control')).toBeTruthy();
    });

    it('con inclinación sin calibrar va a la calibración', async () => {
      await act(() => updatePlayerPreferences({ controlMode: 'tilt' }));
      await render(<StartScreen tiltEnabled />);
      expect(screen.getByText('redirect:/calibracion')).toBeTruthy();
    });

    it('con todo elegido va directo a la pista', async () => {
      await act(() => updatePlayerPreferences({ controlMode: 'buttons' }));
      await render(<StartScreen tiltEnabled />);
      expect(screen.getByText('redirect:/pista')).toBeTruthy();
    });
  });

  describe('con la inclinación desactivada', () => {
    it('es lo que indica el interruptor por defecto', async () => {
      expect(FEATURE_FLAGS.tiltControl).toBe(false);
      await render(<StartScreen />);
      expect(screen.getByText('redirect:/pista')).toBeTruthy();
    });

    it('la primera vez va directo a la pista, sin elegir control', async () => {
      await render(<StartScreen tiltEnabled={false} />);
      expect(screen.getByText('redirect:/pista')).toBeTruthy();
    });

    it('con inclinación guardada sin calibrar no va a la calibración', async () => {
      await act(() => updatePlayerPreferences({ controlMode: 'tilt' }));
      await render(<StartScreen tiltEnabled={false} />);
      expect(screen.getByText('redirect:/pista')).toBeTruthy();
    });

    it('con inclinación guardada la cambia a botones y conserva la calibración', async () => {
      await act(() =>
        updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0.1, tiltSensitivity: 7 }),
      );
      await render(<StartScreen tiltEnabled={false} />);
      expect(screen.getByText('redirect:/pista')).toBeTruthy();
      expect(readPlayerPreferences()).toMatchObject({
        controlMode: 'buttons',
        tiltNeutralAngle: 0.1,
        tiltSensitivity: 7,
      });
    });

    it('con botones guardados no toca nada', async () => {
      await act(() => updatePlayerPreferences({ controlMode: 'buttons' }));
      const before = readPlayerPreferences();
      await render(<StartScreen tiltEnabled={false} />);
      expect(screen.getByText('redirect:/pista')).toBeTruthy();
      expect(readPlayerPreferences()).toBe(before);
    });
  });
});
