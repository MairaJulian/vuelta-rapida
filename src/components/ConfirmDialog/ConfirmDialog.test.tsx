import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmDialog } from './ConfirmDialog';
import type { ConfirmDialogProps } from './ConfirmDialog.types';

async function renderDialog(props: Partial<ConfirmDialogProps> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(
    <ConfirmDialog
      visible
      title="¿Borrar a MALE?"
      message="También se borran sus récords."
      confirmLabel="Borrar"
      confirmIcon="trash"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('muestra la pregunta, el mensaje y los dos botones', async () => {
    await renderDialog();
    expect(screen.getByRole('header')).toHaveTextContent('¿Borrar a MALE?');
    expect(screen.getByText('También se borran sus récords.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Cancelar' }).length).toBeGreaterThan(0);
  });

  it('oculto no muestra nada', async () => {
    await renderDialog({ visible: false });
    expect(screen.queryByText('¿Borrar a MALE?')).toBeNull();
  });

  it('confirmar llama a onConfirm', async () => {
    const { onConfirm, onCancel } = await renderDialog();
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('Cancelar y tocar el velo cancelan', async () => {
    const { onConfirm, onCancel } = await renderDialog();
    await fireEvent.press(screen.getByText('Cancelar'));
    // El velo no lo ve el lector de pantalla (el panel es modal), pero se puede tocar.
    await fireEvent.press(screen.getByTestId('confirm-backdrop', { includeHiddenElements: true }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('el botón Atrás de Android cancela', async () => {
    const { onCancel } = await renderDialog();
    const [modal] = screen.container.queryAll((node) => Boolean(node.props.onRequestClose));
    modal.props.onRequestClose();
    expect(onCancel).toHaveBeenCalled();
  });

  it('acepta otro texto para cancelar', async () => {
    await renderDialog({ cancelLabel: 'No' });
    expect(screen.getByText('No')).toBeTruthy();
  });
});
