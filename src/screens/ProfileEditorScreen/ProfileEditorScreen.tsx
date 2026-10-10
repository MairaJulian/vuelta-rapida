import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorSwatches } from '@/components/ColorSwatches';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DriverBadge } from '@/components/DriverBadge';
import { MenuButton } from '@/components/MenuButton';
import { MenuHeader } from '@/components/MenuHeader';
import { NumberStepper } from '@/components/NumberStepper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getCarColor } from '@/core/CarPalette';
import { getProfile, MAX_NAME_LENGTH, suggestProfileDraft } from '@/core/Profiles';
import type { ProfileDraft, ProfileError } from '@/core/Profiles';
import { useProfiles } from '@/hooks/useProfiles';
import { CarPreview, SIDEWAYS } from '@/render/CarPreview';

import { COLORS, KERB_SQUARES, LAYOUT, PADDING, styles } from './ProfileEditorScreen.styles';
import type { ProfileEditorScreenProps } from './ProfileEditorScreen.types';

/** Qué ve el jugador por cada error de validación. */
export const PROFILE_ERROR_TEXTS: Record<ProfileError, string> = {
  'name-empty': 'Escribí tu nombre.',
  'name-too-long': `El nombre tiene que tener hasta ${MAX_NAME_LENGTH} letras.`,
  'name-taken': 'Ya hay un piloto con ese nombre.',
  'number-out-of-range': 'El número va de 1 a 99.',
  'color-unknown': 'Elegí un color.',
  'profile-missing': 'Ese piloto ya no existe.',
};

const HELP_TEXT = `Hasta ${MAX_NAME_LENGTH} letras. Aparece en tus récords.`;

/**
 * Personalización (pantalla 04 del handoff): nombre, color de la paleta y número, con
 * la vista previa del auto en tiempo real. En `/piloto` crea un perfil (que queda
 * activo) y sigue a Inicio; en `/piloto?id=…` edita uno y vuelve, y además permite
 * borrarlo después de confirmar.
 */
export function ProfileEditorScreen(_props: ProfileEditorScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, createProfile, updateProfile, deleteProfile } = useProfiles();
  // El modo se decide al abrir: después de borrar, la pantalla sigue montada un instante
  // sin el perfil y no tiene que cambiar ni redirigir.
  const [editing] = useState(() => (id ? getProfile(state, id) : null));
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    editing
      ? { name: editing.name, colorId: editing.colorId, number: editing.number }
      : suggestProfileDraft(state.profiles),
  );
  const [errors, setErrors] = useState<ProfileError[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Un id que no existe (un enlace viejo): a elegir jugador.
  if (id && !editing) {
    return <Redirect href="/jugadores" />;
  }

  const color = getCarColor(draft.colorId);
  const displayName = draft.name.trim().toUpperCase();

  const change = (changes: Partial<ProfileDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors([]);
  };

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/jugadores');
    }
  };

  const save = () => {
    const result = editing ? updateProfile(editing.id, draft) : createProfile(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (editing) {
      close();
    } else {
      // El perfil nuevo queda activo: a Inicio, con "¿Quién juega?" debajo en la pila.
      router.replace('/inicio');
    }
  };

  const confirmDelete = () => {
    setConfirmingDelete(false);
    if (editing) {
      deleteProfile(editing.id);
    }
    router.dismissTo('/jugadores');
  };

  return (
    <View
      testID="profile-editor-screen"
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
        title={editing ? 'Tu monoplaza' : 'Nuevo piloto'}
        subtitle={editing ? 'Cambiá lo que quieras' : 'Elegí nombre, color y número'}
        onBack={close}
        action={
          <View style={styles.actions}>
            {editing ? (
              <MenuButton
                label="Borrar"
                variant="danger"
                icon="trash"
                accessibilityLabel="Borrar piloto"
                onPress={() => setConfirmingDelete(true)}
              />
            ) : null}
            <PrimaryButton label="Guardar" onPress={save} />
          </View>
        }
      />

      <View style={styles.body}>
        <View style={styles.preview} testID="profile-preview">
          <View style={styles.kerb}>
            {Array.from({ length: KERB_SQUARES }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.kerbSquare,
                  { backgroundColor: i % 2 === 0 ? COLORS.kerb : COLORS.white },
                ]}
              />
            ))}
          </View>
          <View style={styles.car}>
            <CarPreview
              testID="profile-preview-car"
              bodyColor={color.hex}
              number={draft.number}
              carWidth={LAYOUT.car.width}
              rotation={SIDEWAYS}
              width={LAYOUT.car.canvasWidth}
              height={LAYOUT.car.canvasHeight}
            />
          </View>
          <DriverBadge
            name={displayName}
            number={draft.number}
            colorId={draft.colorId}
            style={styles.badge}
            testID="profile-preview-badge"
          />
        </View>

        <View style={styles.options}>
          <View style={styles.field}>
            <Text style={styles.label}>Color · {color.name}</Text>
            <ColorSwatches selected={draft.colorId} onSelect={(colorId) => change({ colorId })} />
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Número</Text>
              <NumberStepper value={draft.number} onChange={(number) => change({ number })} />
            </View>
            <View style={styles.nameField}>
              <Text style={styles.label}>Nombre del piloto</Text>
              <TextInput
                testID="name-input"
                accessibilityLabel="Nombre del piloto"
                value={draft.name}
                onChangeText={(name) => change({ name })}
                maxLength={MAX_NAME_LENGTH}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="done"
                placeholder="TU NOMBRE"
                placeholderTextColor={COLORS.muted}
                cursorColor={COLORS.blue}
                selectionColor={COLORS.blue}
                style={styles.input}
              />
            </View>
          </View>
          {errors.length > 0 ? (
            <Text style={styles.error} testID="profile-error" accessibilityLiveRegion="polite">
              {errors.map((error) => PROFILE_ERROR_TEXTS[error]).join(' ')}
            </Text>
          ) : (
            <Text style={styles.help}>{HELP_TEXT}</Text>
          )}
        </View>
      </View>

      <ConfirmDialog
        visible={confirmingDelete}
        title={`¿Borrar a ${editing?.name.toUpperCase() ?? ''}?`}
        message="También se borran sus récords. No se puede deshacer."
        confirmLabel="Borrar"
        confirmIcon="trash"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
}
