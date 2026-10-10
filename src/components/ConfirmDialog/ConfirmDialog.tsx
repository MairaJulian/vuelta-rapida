import { Modal, Pressable, Text, View } from 'react-native';

import { MenuButton } from '@/components/MenuButton';

import { styles } from './ConfirmDialog.styles';
import type { ConfirmDialogProps } from './ConfirmDialog.types';

/**
 * Pregunta antes de algo que no se puede deshacer, como borrar un perfil: velo sobre la
 * pantalla y un panel con la pregunta, Cancelar y el botón de peligro que confirma.
 * Cancelan también tocar el velo y el botón Atrás de Android.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  confirmIcon,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay} testID="confirm-dialog">
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessible={false}
          testID="confirm-backdrop"
        />
        <View style={styles.panel} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <MenuButton label={cancelLabel} variant="secondary" onPress={onCancel} />
            <MenuButton
              label={confirmLabel}
              variant="danger"
              icon={confirmIcon}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
