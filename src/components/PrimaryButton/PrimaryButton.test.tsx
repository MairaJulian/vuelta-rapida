import { fireEvent, render, screen } from '@testing-library/react-native';

import { PrimaryButton } from './PrimaryButton';
import { COLORS, DISABLED_OPACITY } from './PrimaryButton.styles';

describe('PrimaryButton', () => {
  it('muestra el texto y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Seguir" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Seguir' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('usa el azul del handoff y el alto pedido', async () => {
    await render(<PrimaryButton label="Listo" onPress={jest.fn()} height={56} />);
    expect(screen.getByRole('button')).toHaveStyle({
      backgroundColor: COLORS.background,
      height: 56,
    });
  });

  it('deshabilitado no responde y se ve atenuado', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Seguir" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveStyle({ opacity: DISABLED_OPACITY });
  });
});
