import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuButton } from '@/components/MenuButton';
import { MenuHeader } from '@/components/MenuHeader';
import { TrackCard } from '@/components/TrackCard';
import { CIRCUITS } from '@/core/Circuits';
import { DEFAULT_RACE_CONFIG } from '@/core/RaceFlow';
import { getTrackRecord, LAP_TABLE } from '@/core/Ranking';
import { useProfiles } from '@/hooks/useProfiles';

import { PADDING, styles } from './TrackSelectScreen.styles';
import type { TrackSelectScreenProps } from './TrackSelectScreen.types';

/**
 * Selección de pista (pantalla 05 del handoff): una tarjeta por circuito con su
 * trazado, su largo, sus curvas y el récord de la pista con el nombre y el color de
 * quien lo tiene. "Largar" abre la carrera en la pista elegida.
 */
export function TrackSelectScreen(_props: TrackSelectScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useProfiles();
  const [selectedId, setSelectedId] = useState(CIRCUITS[0].id);
  const laps = DEFAULT_RACE_CONFIG.totalLaps;

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
            onPress={() => setSelectedId(circuit.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
