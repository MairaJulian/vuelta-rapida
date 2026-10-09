import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ICON_PATHS } from '@/components/Icon';

import { MenuButton } from './MenuButton';
import { CIRCLE, COLORS, VARIANTS } from './MenuButton.styles';

/** Colores de los íconos dibujados, en orden. */
const iconColors = () =>
  screen.container
    .queryAll((node) => node.type === 'Path')
    .map((path) => ({ path: path.props.path, color: path.props.color }));

describe('MenuButton', () => {
  it('es un botón con su texto y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<MenuButton label="Reiniciar" variant="secondary" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('cada variante tiene su fondo y su alto', async () => {
    for (const variant of ['primary', 'secondary', 'danger', 'run'] as const) {
      await render(<MenuButton label={variant} variant={variant} onPress={jest.fn()} />);
      expect(screen.getByRole('button', { name: variant })).toHaveStyle({
        backgroundColor: VARIANTS[variant].background,
        height: VARIANTS[variant].height,
      });
    }
  });

  it('el ícono de adelante usa el color de la variante', async () => {
    await render(<MenuButton label="Salir" variant="danger" icon="signOut" onPress={jest.fn()} />);
    expect(iconColors()).toEqual([{ path: ICON_PATHS.signOut, color: COLORS.danger }]);
  });

  it('Continuar: círculo blanco con el ícono azul al final', async () => {
    await render(
      <MenuButton label="Continuar" variant="primary" circleIcon="play" onPress={jest.fn()} />,
    );
    expect(iconColors()).toEqual([{ path: ICON_PATHS.play, color: CIRCLE.primary.icon }]);
  });

  it('Correr: círculo lima con el ícono tinta', async () => {
    await render(<MenuButton label="Correr" variant="run" circleIcon="play" onPress={jest.fn()} />);
    expect(iconColors()).toEqual([{ path: ICON_PATHS.play, color: CIRCLE.run.icon }]);
  });

  it('muestra algo a la derecha', async () => {
    await render(
      <MenuButton
        label="Sonido"
        variant="secondary"
        onPress={jest.fn()}
        trailing={<Text>Sí</Text>}
      />,
    );
    expect(screen.getByText('Sí')).toBeTruthy();
  });

  it('como interruptor informa si está prendido', async () => {
    await render(
      <MenuButton label="Sonido" variant="secondary" selected={false} onPress={jest.fn()} />,
    );
    expect(screen.getByRole('switch', { name: 'Sonido' })).not.toBeChecked();
    await render(<MenuButton label="Vibración" variant="secondary" selected onPress={jest.fn()} />);
    expect(screen.getByRole('switch', { name: 'Vibración' })).toBeChecked();
  });

  it('deshabilitado no responde', async () => {
    const onPress = jest.fn();
    await render(<MenuButton label="Listo" variant="primary" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
