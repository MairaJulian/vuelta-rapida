import { fireEvent, render, screen } from '@testing-library/react-native';

import { PauseMenu } from './PauseMenu';
import { COLORS } from './PauseMenu.styles';
import type { PauseMenuProps } from './PauseMenu.types';

function props(overrides: Partial<PauseMenuProps> = {}): PauseMenuProps {
  return {
    lap: 2,
    totalLaps: 3,
    circuitName: 'Autódromo del Lago',
    lapTime: '1:04.318',
    soundEnabled: true,
    vibrationEnabled: false,
    onResume: jest.fn(),
    onRestart: jest.fn(),
    onToggleSound: jest.fn(),
    onToggleVibration: jest.fn(),
    onExit: jest.fn(),
    ...overrides,
  };
}

describe('PauseMenu', () => {
  it('muestra el título, la vuelta, el circuito y el tiempo de la vuelta', async () => {
    await render(<PauseMenu {...props()} />);
    expect(screen.getByRole('header', { name: 'PAUSA' })).toBeTruthy();
    expect(screen.getByText('Vuelta 2 de 3 · Autódromo del Lago')).toBeTruthy();
    expect(screen.getByTestId('pause-lap-time')).toHaveTextContent('1:04.318');
    expect(screen.getByLabelText('Vuelta actual 1:04.318')).toBeTruthy();
  });

  it('el velo cubre la carrera', async () => {
    await render(<PauseMenu {...props()} />);
    expect(screen.getByTestId('pause-menu')).toHaveStyle({ backgroundColor: COLORS.backdrop });
  });

  it('cada botón llama a su acción', async () => {
    const all = props();
    await render(<PauseMenu {...all} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reiniciar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salir al menú' }));
    expect(all.onResume).toHaveBeenCalledTimes(1);
    expect(all.onRestart).toHaveBeenCalledTimes(1);
    expect(all.onExit).toHaveBeenCalledTimes(1);
  });

  it('los interruptores muestran su estado y avisan el cambio', async () => {
    const all = props();
    await render(<PauseMenu {...all} />);
    const sound = screen.getByRole('switch', { name: 'Sonido' });
    const vibration = screen.getByRole('switch', { name: 'Vibración' });
    expect(sound).toBeChecked();
    expect(vibration).not.toBeChecked();
    expect(screen.getByText('Sí')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
    await fireEvent.press(sound);
    await fireEvent.press(vibration);
    expect(all.onToggleSound).toHaveBeenCalledTimes(1);
    expect(all.onToggleVibration).toHaveBeenCalledTimes(1);
  });

  it('sin sonido muestra el parlante tachado', async () => {
    await render(<PauseMenu {...props({ soundEnabled: false })} />);
    expect(screen.getByRole('switch', { name: 'Sonido' })).not.toBeChecked();
  });

  it('no ofrece Recalibrar ni Cambiar control: la inclinación está desactivada', async () => {
    await render(<PauseMenu {...props()} />);
    expect(screen.queryByText('Recalibrar')).toBeNull();
    expect(screen.queryByText('Cambiar control')).toBeNull();
  });
});
