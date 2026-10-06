import { fireEvent, render, screen } from '@testing-library/react-native';

import { ControlModeCard } from './ControlModeCard';
import { COLORS } from './ControlModeCard.styles';

async function renderCard(selected: boolean, onPress = jest.fn()) {
  await render(
    <ControlModeCard
      mode="tilt"
      title="Inclinación"
      description="Girá el celular como un volante."
      chip="Más real"
      selected={selected}
      onPress={onPress}
    />,
  );
  return onPress;
}

describe('ControlModeCard', () => {
  it('muestra título, descripción y chip', async () => {
    await renderCard(false);
    expect(screen.getByText('Inclinación')).toBeTruthy();
    expect(screen.getByText('Girá el celular como un volante.')).toBeTruthy();
    expect(screen.getByText('Más real')).toBeTruthy();
  });

  it('es una opción accesible que indica si está elegida', async () => {
    await renderCard(true);
    expect(screen.getByRole('radio', { checked: true })).toBeTruthy();
  });

  it('la elegida lleva borde azul', async () => {
    await renderCard(true);
    expect(screen.getByTestId('control-card-tilt')).toHaveStyle({ borderColor: COLORS.blue });
  });

  it('la no elegida no lleva borde visible', async () => {
    await renderCard(false);
    expect(screen.getByTestId('control-card-tilt')).toHaveStyle({ borderColor: 'transparent' });
  });

  it('al tocarla avisa', async () => {
    const onPress = await renderCard(false);
    await fireEvent.press(screen.getByRole('radio'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
