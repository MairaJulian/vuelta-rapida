import { Canvas, Group } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuButton } from '@/components/MenuButton';
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { DEFAULT_RACE_CONFIG } from '@/core/RaceFlow';
import { formatLapTime } from '@/core/LapTimer';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';
import { CarShape } from '@/render/CarShape';
import { CAR_WIDTH_METERS } from '@/render/CarShape/CarShape.styles';

import { CAR_NUMBER, COLORS, LAYOUT, styles } from './HomeScreen.styles';
import type { HomeScreenProps } from './HomeScreen.types';

/** El auto en el panel: centrado, de 100 dp de ancho y girado −20°. */
const CAR_TRANSFORM = [
  { translateX: LAYOUT.carCanvas.width / 2 },
  { translateY: LAYOUT.carCanvas.height / 2 },
  { rotate: LAYOUT.carRotation },
  { scale: LAYOUT.carWidth / CAR_WIDTH_METERS },
];

/**
 * Inicio (pantalla 01 del handoff), en versión mínima: el logo, el botón Correr y
 * el récord del circuito, con el panel azul del auto a la derecha. Garage y
 * Ajustes llegan con sus pantallas.
 */
export function HomeScreen(_props: HomeScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences } = usePlayerPreferences();
  const recordMs = preferences.bestLapsMs[DEFAULT_CIRCUIT.id] ?? null;
  const laps = DEFAULT_RACE_CONFIG.totalLaps;

  return (
    <View style={styles.screen} testID="home-screen">
      <View
        style={[
          styles.panel,
          {
            right: LAYOUT.panelInset + insets.right,
            top: LAYOUT.panelInset + insets.top,
            bottom: LAYOUT.panelInset + insets.bottom,
          },
        ]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={styles.number}>{CAR_NUMBER}</Text>
        <Canvas style={styles.carCanvas} testID="home-car">
          <Group transform={CAR_TRANSFORM}>
            <CarShape transform={[]} bodyColor={COLORS.car} />
          </Group>
        </Canvas>
      </View>

      <View
        style={[
          styles.column,
          { left: LAYOUT.columnLeft + insets.left, top: LAYOUT.columnTop + insets.top },
        ]}
      >
        <View style={styles.chip}>
          <View style={styles.checker}>
            {[COLORS.ink, COLORS.card, COLORS.card, COLORS.ink].map((color, i) => (
              <View key={i} style={[styles.checkerSquare, { backgroundColor: color }]} />
            ))}
          </View>
          <Text style={styles.chipText}>Contrarreloj · {laps} vueltas</Text>
        </View>
        <Text style={styles.logo} accessibilityRole="header" accessibilityLabel="Vuelta Rápida">
          <Text style={{ color: COLORS.ink }}>VUELTA</Text>
          {'\n'}
          <Text style={{ color: COLORS.blue }}>RÁPIDA</Text>
        </Text>
        <MenuButton
          label="Correr"
          variant="run"
          circleIcon="play"
          onPress={() => router.push('/pista')}
          style={styles.run}
        />
      </View>

      <View
        style={[
          styles.record,
          { left: LAYOUT.columnLeft + insets.left, bottom: LAYOUT.recordBottom + insets.bottom },
        ]}
        accessible
        testID="home-record"
      >
        {recordMs === null ? (
          <Text style={styles.recordLabel}>Todavía sin récord en {DEFAULT_CIRCUIT.name}</Text>
        ) : (
          <>
            <Text style={styles.recordLabel}>Tu récord en {DEFAULT_CIRCUIT.name}</Text>
            <Text style={styles.recordValue}>{formatLapTime(recordMs)}</Text>
          </>
        )}
      </View>
    </View>
  );
}
