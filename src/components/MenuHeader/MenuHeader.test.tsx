import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { MenuHeader } from './MenuHeader';

describe('MenuHeader', () => {
  it('muestra título, subtítulo y la acción', async () => {
    await render(
      <MenuHeader title="Calibrá el volante" subtitle="Paso 2 de 2" action={<Text>Acción</Text>} />,
    );
    expect(screen.getByRole('header')).toHaveTextContent('Calibrá el volante');
    expect(screen.getByText('Paso 2 de 2')).toBeTruthy();
    expect(screen.getByText('Acción')).toBeTruthy();
  });

  it('sin onBack no muestra Volver', async () => {
    await render(<MenuHeader title="Título" />);
    expect(screen.queryByLabelText('Volver')).toBeNull();
  });

  it('Volver llama a onBack', async () => {
    const onBack = jest.fn();
    await render(<MenuHeader title="Título" onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
