import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ControlModeCard } from '@/components/ControlModeCard';
import { MenuHeader } from '@/components/MenuHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { ControlMode } from '@/core/PlayerPreferences';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';

import { PADDING, styles } from './ControlChoiceScreen.styles';
import type { ControlChoiceScreenProps } from './ControlChoiceScreen.types';

/** Textos de las tarjetas, del handoff (pantalla 02). */
const OPTIONS: { mode: ControlMode; title: string; description: string; chip: string }[] = [
  {
    mode: 'tilt',
    title: 'Inclinación',
    description: 'Girá el celular como un volante. Frená con cualquier pulgar.',
    chip: 'Más real',
  },
  {
    mode: 'buttons',
    title: 'Botones',
    description: 'Izquierda y derecha con el pulgar izquierdo, freno con el derecho.',
    chip: 'Más preciso',
  },
];

/**
 * Elección de control (pantalla 02 del handoff): inclinación o botones. La primera
 * vez no hay ninguna marcada y Seguir espera la elección; después aparece la guardada.
 * Guarda la elección y sigue a la calibración si eligió inclinación y nunca calibró;
 * si no, directo a la pista.
 */
export function ControlChoiceScreen(_props: ControlChoiceScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences } = usePlayerPreferences();
  const [selected, setSelected] = useState<ControlMode | null>(preferences.controlMode);

  const next = () => {
    if (selected === null) {
      return;
    }
    updatePreferences({ controlMode: selected });
    if (selected === 'tilt' && preferences.tiltNeutralAngle === null) {
      router.push('/calibracion');
    } else {
      router.replace('/pista');
    }
  };

  return (
    <View
      testID="control-choice-screen"
      style={[
        styles.container,
        {
          paddingTop: PADDING.vertical + insets.top,
          paddingBottom: PADDING.vertical + insets.bottom,
          paddingLeft: PADDING.horizontal + insets.left,
          paddingRight: PADDING.horizontal + insets.right,
        },
      ]}
    >
      <MenuHeader
        title="¿Cómo querés manejar?"
        subtitle="Paso 1 de 2"
        onBack={router.canGoBack() ? router.back : undefined}
        action={<PrimaryButton label="Seguir" onPress={next} disabled={selected === null} />}
      />
      <View style={styles.cards} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => (
          <ControlModeCard
            key={option.mode}
            {...option}
            selected={selected === option.mode}
            onPress={() => setSelected(option.mode)}
          />
        ))}
      </View>
      <Text style={styles.footer}>
        En los dos modos el auto acelera solo. Podés cambiarlo después desde la pausa.
      </Text>
    </View>
  );
}
