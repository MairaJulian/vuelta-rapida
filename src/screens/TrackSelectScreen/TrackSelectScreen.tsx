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
import { MAX_RIVALS } from '@/core/RivalAI';
import type { AiLevelId } from '@/core/RivalAI';
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

/** Cuántos rivales: sin rivales (contrarreloj) o de 1 a `MAX_RIVALS`. */
const RIVAL_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '0', label: 'Sin rivales' },
  ...Array.from({ length: MAX_RIVALS }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
];

const LEVEL_OPTIONS: readonly { value: AiLevelId; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Medio' },
  { value: 'hard', label: 'Difícil' },
];

const DYNAMIC_OPTIONS: readonly { value: 'on' | 'off'; label: string }[] = [
  { value: 'on', label: 'Sí' },
  { value: 'off', label: 'No' },
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
 * vuelta del jugador, el récord de la pista o ninguno (por defecto, ninguno). Antes, los
 * rivales: cuántos (o ninguno: contrarreloj), su dificultad y la dificultad dinámica. La
 * pista elegida se comparte con
 * la carrera y el ranking. "Largar" abre la carrera en la pista elegida.
 */
export function TrackSelectScreen(_props: TrackSelectScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useProfiles();
  const { preferences, updatePreferences } = usePlayerPreferences();
  const { circuitId: selectedId, select } = useSelectedTrack();
  const laps = DEFAULT_RACE_CONFIG.totalLaps;
  const { rivalCount } = preferences;
  const hasRivals = rivalCount > 0;

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
        subtitle={`${hasRivals ? 'Carrera' : 'Contrarreloj'} · ${laps} vueltas`}
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
        <View style={styles.option} testID="rival-count-choice">
          <Text style={styles.optionLabel}>Rivales</Text>
          <OptionChips
            options={RIVAL_OPTIONS}
            value={String(rivalCount)}
            onChange={(value) => updatePreferences({ rivalCount: Number(value) })}
            label="Rivales"
          />
        </View>
        <View style={styles.option} testID="rival-level-choice">
          <Text style={styles.optionLabel}>Dificultad</Text>
          <OptionChips
            options={LEVEL_OPTIONS.map((option) => ({ ...option, disabled: !hasRivals }))}
            value={preferences.aiLevel}
            onChange={(aiLevel) => updatePreferences({ aiLevel })}
            label="Dificultad de los rivales"
          />
          <Text style={styles.optionLabel}>Ajuste dinámico</Text>
          <OptionChips
            options={DYNAMIC_OPTIONS.map((option) => ({ ...option, disabled: !hasRivals }))}
            value={preferences.dynamicDifficulty ? 'on' : 'off'}
            onChange={(value) => updatePreferences({ dynamicDifficulty: value === 'on' })}
            label="Dificultad dinámica"
            testID="rival-dynamic-choice"
          />
        </View>
        {hasRivals && preferences.dynamicDifficulty ? (
          <Text style={styles.ghostHint} testID="rival-dynamic-hint">
            Si vas muy atrás, los rivales aflojan un poco; si vas muy adelante, aprietan.
          </Text>
        ) : null}
        <View style={styles.option} testID="ghost-choice">
          <Text style={styles.optionLabel}>Fantasma</Text>
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
