import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuButton } from '@/components/MenuButton';

import { COLORS, LAYOUT, styles } from './PauseMenu.styles';
import type { PauseMenuProps } from './PauseMenu.types';

/** Chip "Sí" / "No" de los interruptores. */
function StateChip({ on }: { on: boolean }) {
  return (
    <View style={[styles.chip, { backgroundColor: on ? COLORS.onChip : COLORS.offChip }]}>
      <Text style={[styles.chipText, { color: on ? COLORS.blue : COLORS.muted }]}>
        {on ? 'Sí' : 'No'}
      </Text>
    </View>
  );
}

/**
 * Menú de pausa (pantalla 08 del handoff): velo sobre la carrera, panel a la
 * izquierda con Continuar, Reiniciar y Salir al menú, y el tiempo de la vuelta a
 * la derecha. Abajo a la derecha, los interruptores de sonido y vibración.
 * Recalibrar y Cambiar control no están: la inclinación está desactivada.
 */
export function PauseMenu({
  lap,
  totalLaps,
  circuitName,
  lapTime,
  soundEnabled,
  vibrationEnabled,
  onResume,
  onRestart,
  onToggleSound,
  onToggleVibration,
  onExit,
}: PauseMenuProps) {
  const insets = useSafeAreaInsets();
  const left = LAYOUT.inset + insets.left;
  return (
    <View testID="pause-menu" style={styles.overlay} accessibilityViewIsModal>
      <View
        style={[
          styles.panel,
          { left, top: LAYOUT.inset + insets.top, bottom: LAYOUT.inset + insets.bottom },
        ]}
      >
        <Text style={styles.title} accessibilityRole="header">
          PAUSA
        </Text>
        <Text style={styles.subtitle}>
          Vuelta {lap} de {totalLaps} · {circuitName}
        </Text>
        <View style={styles.actions}>
          <MenuButton
            label="Continuar"
            variant="primary"
            circleIcon="play"
            height={56}
            onPress={onResume}
          />
          <MenuButton label="Reiniciar" variant="secondary" icon="restart" onPress={onRestart} />
          <MenuButton
            label="Salir al menú"
            variant="danger"
            icon="signOut"
            onPress={onExit}
            style={styles.exit}
          />
        </View>
      </View>

      <View
        style={[
          styles.current,
          {
            left: left + LAYOUT.panelWidth + LAYOUT.currentGap,
            top: LAYOUT.currentTop + insets.top,
          },
        ]}
        accessible
        accessibilityLabel={`Vuelta actual ${lapTime}`}
      >
        <Text style={styles.currentLabel}>Vuelta actual</Text>
        <Text style={styles.currentTime} testID="pause-lap-time">
          {lapTime}
        </Text>
      </View>

      <View
        style={[
          styles.toggles,
          {
            right: LAYOUT.togglesRight + insets.right,
            bottom: LAYOUT.togglesBottom + insets.bottom,
          },
        ]}
      >
        <MenuButton
          label="Sonido"
          variant="secondary"
          icon={soundEnabled ? 'speakerHigh' : 'speakerSlash'}
          selected={soundEnabled}
          trailing={<StateChip on={soundEnabled} />}
          onPress={onToggleSound}
          style={styles.toggle}
        />
        <MenuButton
          label="Vibración"
          variant="secondary"
          icon="vibrate"
          selected={vibrationEnabled}
          trailing={<StateChip on={vibrationEnabled} />}
          onPress={onToggleVibration}
          style={styles.toggle}
        />
      </View>
    </View>
  );
}
