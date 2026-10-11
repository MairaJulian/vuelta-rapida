import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuButton } from '@/components/MenuButton';
import { MenuHeader } from '@/components/MenuHeader';
import { OptionChips } from '@/components/OptionChips';
import { TrackCard } from '@/components/TrackCard';
import { CIRCUITS } from '@/core/Circuits';
import type { GhostSource } from '@/core/Ghost';
import { getGhostAvailability } from '@/core/GhostChoice';
import { DEFAULT_RACE_CONFIG } from '@/core/RaceFlow';
import { getTrackRecord, LAP_TABLE } from '@/core/Ranking';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';
import { useProfiles } from '@/hooks/useProfiles';
import { useSelectedTrack } from '@/hooks/useSelectedTrack';

import { PADDING, styles } from './TrackSelectScreen.styles';
import type { TrackSelectScreenProps } from './TrackSelectScreen.types';

/** Los tres fantasmas que se pueden elegir, con su texto. */
const GHOST_OPTIONS: readonly { value: GhostSource; label: string }[] = [
  { value: 'mine', label: 'Mi mejor vuelta' },
  { value: 'record', label: 'Récord de la pista' },
  { value: 'none', label: 'Sin fantasma' },
];

/** Qué hace falta para que exista el fantasma elegido (cuando todavía no existe). */
const GHOST_HINTS: Record<GhostSource, string> = {
  mine: 'Todavía no tenés tu mejor vuelta grabada en esta pista: se graba al batir tu récord.',
  record: 'El récord de esta pista todavía no tiene fantasma: se graba cuando alguien lo supera.',
  none: '',
};

/**
 * Selección de pista (pantalla 05 del handoff): una tarjeta por circuito con su
 * trazado, su largo, sus curvas, su dificultad y el récord de la pista con el nombre y
 * el color de quien lo tiene. Debajo, el fantasma contra el que se corre: la mejor
 * vuelta del jugador, el récord de la pista o ninguno. La pista elegida se comparte con
 * la carrera y el ranking. "Largar" abre la carrera en la pista elegida.
 */
export function TrackSelectScreen(_props: TrackSelectScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useProfiles();
  const { preferences, updatePreferences } = usePlayerPreferences();
  const { circuitId: selectedId, select } = useSelectedTrack();
  const laps = DEFAULT_RACE_CONFIG.totalLaps;

  // Un fantasma sin grabación todavía se muestra desactivado.
  const availability = getGhostAvailability(state, state.activeProfileId, selectedId);
  const ghostOptions = GHOST_OPTIONS.map((option) => ({
    ...option,
    disabled: !availability[option.value],
  }));
  const ghostHint = availability[preferences.ghostSource]
    ? ''
    : GHOST_HINTS[preferences.ghostSource];

  const start = () => router.push({ pathname: '/pista', params: { circuito: selectedId } });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/inicio'));

  return (
    <View
      testID="track-select-screen"
      style={[
        styles.container,
        {
          paddingTop: PADDING.top + insets.top,
          paddingBottom: PADDING.bottom + insets.bottom,
          paddingLeft: PADDING.horizontal + insets.left,
          paddingRight: PADDING.horizontal + insets.right,
        },
      ]}
    >
      <MenuHeader
        title="Elegí la pista"
        subtitle={`Contrarreloj · ${laps} vueltas`}
        onBack={back}
        action={
          <MenuButton label="Largar" variant="primary" icon="flagCheckered" onPress={start} />
        }
      />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
        >
          {CIRCUITS.map((circuit) => (
            <TrackCard
              key={circuit.id}
              circuit={circuit}
              selected={circuit.id === selectedId}
              record={getTrackRecord(state, circuit.id, LAP_TABLE)}
              onPress={() => select(circuit.id)}
            />
          ))}
        </ScrollView>
        <View style={styles.ghost} testID="ghost-choice">
          <Text style={styles.ghostLabel}>Fantasma</Text>
          <OptionChips
            options={ghostOptions}
            value={preferences.ghostSource}
            onChange={(ghostSource) => updatePreferences({ ghostSource })}
            label="Fantasma"
          />
        </View>
        {ghostHint ? (
          <Text style={styles.ghostHint} testID="ghost-hint">
            {ghostHint}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
