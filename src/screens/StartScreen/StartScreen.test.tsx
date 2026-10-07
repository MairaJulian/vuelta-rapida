import { act, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { reloadPlayerPreferences, updatePlayerPreferences } from '@/hooks/usePlayerPreferences';

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

  it('la primera vez va a elegir el control', async () => {
    await render(<StartScreen />);
    expect(screen.getByText('redirect:/control')).toBeTruthy();
  });

  it('con inclinación sin calibrar va a la calibración', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt' }));
    await render(<StartScreen />);
    expect(screen.getByText('redirect:/calibracion')).toBeTruthy();
  });

  it('con todo elegido va directo a la pista', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'buttons' }));
    await render(<StartScreen />);
    expect(screen.getByText('redirect:/pista')).toBeTruthy();
  });
});
