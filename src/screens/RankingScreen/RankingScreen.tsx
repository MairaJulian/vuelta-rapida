import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuHeader } from '@/components/MenuHeader';
import { OptionChips } from '@/components/OptionChips';
import { TimingRow } from '@/components/TimingRow';
import { CIRCUITS, getCircuit } from '@/core/Circuits';
import { DEFAULT_RACE_CONFIG } from '@/core/RaceFlow';
import { getRaceLapCounts, getRanking, getTableLabel, LAP_TABLE, raceTable } from '@/core/Ranking';
import type { RankingTable } from '@/core/Ranking';
import { useProfiles } from '@/hooks/useProfiles';

import { PADDING, styles } from './RankingScreen.styles';
import type { RankingScreenProps, TableOption } from './RankingScreen.types';

/** La tabla de una opción del selector. */
export function toTable(option: TableOption): RankingTable {
  return option === 'lap' ? LAP_TABLE : raceTable(Number(option.slice('race-'.length)));
}

/**
 * Opciones de tabla de una pista: la mejor vuelta y una carrera por cada cantidad de
 * vueltas con tiempos. La de las vueltas por defecto está siempre, aunque esté vacía.
 */
export function getTableOptions(laps: readonly number[]): { value: TableOption; label: string }[] {
  const counts = [...new Set([...laps, DEFAULT_RACE_CONFIG.totalLaps])].sort((a, b) => a - b);
  return [
    { value: 'lap', label: getTableLabel(LAP_TABLE) },
    ...counts.map((count) => ({
      value: `race-${count}` as TableOption,
      label: getTableLabel(raceTable(count)),
    })),
  ];
}

/**
 * Ranking por pista: a la izquierda, la pista y la tabla (mejor vuelta o carrera
 * completa, por cantidad de vueltas); a la derecha, la torre de tiempos con el
 * jugador activo resaltado. Se abre desde Inicio.
 */
export function RankingScreen(_props: RankingScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { circuito } = useLocalSearchParams<{ circuito?: string }>();
  const { state, activeProfile } = useProfiles();
  const [circuitId, setCircuitId] = useState(() => getCircuit(circuito).id);
  const [option, setOption] = useState<TableOption>('lap');

  const circuit = getCircuit(circuitId);
  const table = toTable(option);
  const rows = getRanking(state, circuitId, table);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/inicio'));

  return (
    <View
      testID="ranking-screen"
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
        title="Ranking"
        subtitle={`${circuit.name} · ${getTableLabel(table)}`}
        onBack={back}
      />
      <View style={styles.body}>
        <View style={styles.sidebar}>
          <Text style={styles.label}>Pista</Text>
          <OptionChips
            label="Pista"
            testID="ranking-circuit"
            options={CIRCUITS.map((item) => ({ value: item.id, label: item.name }))}
            value={circuitId}
            onChange={setCircuitId}
          />
          <Text style={styles.label}>Tabla</Text>
          <OptionChips
            label="Tabla"
            testID="ranking-table"
            options={getTableOptions(getRaceLapCounts(state, circuitId))}
            value={option}
            onChange={setOption}
          />
        </View>
        <ScrollView style={styles.tower} contentContainerStyle={styles.towerContent}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>Todavía no hay tiempos en esta tabla.</Text>
          ) : (
            rows.map((row) => (
              <TimingRow
                key={row.profile.id}
                row={row}
                active={row.profile.id === activeProfile?.id}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}
