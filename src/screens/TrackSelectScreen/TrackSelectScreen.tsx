import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import {
  BODY_GAP,
  BODY_PADDING_BOTTOM,
  BODY_PADDING_TOP,
  PADDING,
  PEEK_HEIGHT,
  styles,
  THUMB_INSET,
  THUMB_MIN_HEIGHT,
} from './TrackSelectScreen.styles';
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
 * rivales: cuántos (o ninguno: contrarreloj), su dificultad, la dificultad dinámica y si
 * los autos chocan entre sí. La
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

  // Alto de la ventana, de la lista de pistas (sin estirar) y de las opciones: si todo no
  // entra, la lista se estira para que sobre solo `PEEK_HEIGHT` y asome la primera fila.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [optionsHeight, setOptionsHeight] = useState(0);
  const overflows =
    viewportHeight > 0 &&
    BODY_PADDING_TOP + listHeight + BODY_GAP + optionsHeight + BODY_PADDING_BOTTOM > viewportHeight;
  const listMinHeight = overflows ? viewportHeight - BODY_PADDING_TOP - BODY_GAP - PEEK_HEIGHT : 0;

  // Indicador de desplazamiento propio: alto proporcional a lo que se ve y posición según
  // lo que se bajó. Solo si hay algo que deslizar.
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const scrollable = viewportHeight > 0 && contentHeight > viewportHeight + 1;
  const trackHeight = viewportHeight - 2 * THUMB_INSET;
  const thumbHeight = scrollable
    ? Math.min(
        trackHeight,
        Math.max(THUMB_MIN_HEIGHT, (trackHeight * viewportHeight) / contentHeight),
      )
    : 0;
  const maxScroll = Math.max(contentHeight - viewportHeight, 1);
  const thumbTop = scrollable
    ? THUMB_INSET +
      (Math.min(Math.max(scrollY, 0), maxScroll) / maxScroll) * (trackHeight - thumbHeight)
    : 0;

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
      <View style={styles.bodyFrame}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          onContentSizeChange={(_width, height) => setContentHeight(height)}
          onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          // La barra del sistema es fina y se pierde: se dibuja la propia (`scrollThumb`).
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            style={[styles.list, listMinHeight > 0 ? { minHeight: listMinHeight } : null]}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={(_width, height) => setListHeight(height)}
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
          <View
            style={styles.options}
            onLayout={(event) => setOptionsHeight(event.nativeEvent.layout.height)}
          >
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
              <Text style={styles.optionLabel}>Choques</Text>
              <OptionChips
                options={DYNAMIC_OPTIONS.map((option) => ({ ...option, disabled: !hasRivals }))}
                value={preferences.collisionsEnabled ? 'on' : 'off'}
                onChange={(value) => updatePreferences({ collisionsEnabled: value === 'on' })}
                label="Choques entre autos"
                testID="rival-collisions-choice"
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
          </View>
        </ScrollView>
        {scrollable ? (
          <View
            testID="scroll-thumb"
            pointerEvents="none"
            style={[styles.scrollThumb, { top: thumbTop, height: thumbHeight }]}
          />
        ) : null}
      </View>
    </View>
  );
}
