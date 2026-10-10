import { Redirect, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DriverBadge } from '@/components/DriverBadge';
import { IconButton } from '@/components/IconButton';
import { MenuButton } from '@/components/MenuButton';
import { getCarColor } from '@/core/CarPalette';
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { DEFAULT_RACE_CONFIG } from '@/core/RaceFlow';
import { formatLapTime } from '@/core/LapTimer';
import { getBestLap } from '@/core/Profiles';
import { useProfiles } from '@/hooks/useProfiles';
import { CarPreview } from '@/render/CarPreview';

import { COLORS, LAYOUT, styles } from './HomeScreen.styles';
import type { HomeScreenProps } from './HomeScreen.types';

/**
 * Inicio (pantalla 01 del handoff) del jugador activo: el logo, Correr (a la selección
 * de pista), el Garage, el Ranking y su récord, con el panel azul de su auto y su
 * número a la derecha. La píldora del piloto, abajo en el panel, vuelve a "¿Quién juega?".
 */
export function HomeScreen(_props: HomeScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, activeProfile } = useProfiles();
  const laps = DEFAULT_RACE_CONFIG.totalLaps;

  // Sin jugador elegido (se borró o se llegó directo): primero, quién juega.
  if (!activeProfile) {
    return <Redirect href="/jugadores" />;
  }

  const recordMs = getBestLap(state, activeProfile.id, DEFAULT_CIRCUIT.id);
  const name = activeProfile.name.toUpperCase();
  // Sobre el panel azul, el auto azul se muestra blanco (handoff).
  const carColor =
    activeProfile.colorId === 'blue' ? COLORS.carOnBlue : getCarColor(activeProfile.colorId).hex;

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
      >
        <View
          style={styles.panelArt}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Text
            style={[styles.number, activeProfile.number >= 10 && styles.numberTwoDigits]}
            numberOfLines={1}
            testID="home-number"
          >
            {activeProfile.number}
          </Text>
          <CarPreview
            testID="home-car"
            bodyColor={carColor}
            number={activeProfile.number}
            carWidth={LAYOUT.carWidth}
            rotation={LAYOUT.carRotation}
            width={LAYOUT.carCanvas.width}
            height={LAYOUT.carCanvas.height}
          />
        </View>
        <Pressable
          style={styles.driver}
          onPress={() => router.dismissTo('/jugadores')}
          accessibilityRole="button"
          accessibilityLabel={`${name}, número ${activeProfile.number}. Cambiar piloto`}
          testID="home-driver"
        >
          {({ pressed }) => (
            <DriverBadge
              name={name}
              number={activeProfile.number}
              colorId={activeProfile.colorId}
              style={[styles.driverBadge, pressed && styles.driverBadgePressed]}
              trailing={<Text style={styles.change}>Cambiar</Text>}
            />
          )}
        </Pressable>
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
        <View style={styles.actions}>
          <MenuButton
            label="Correr"
            variant="run"
            circleIcon="play"
            onPress={() => router.push('/pistas')}
          />
          <IconButton
            icon="wrench"
            label="Garage: editar tu monoplaza"
            size={56}
            onPress={() => router.push({ pathname: '/piloto', params: { id: activeProfile.id } })}
            testID="home-garage"
          />
          <IconButton
            icon="trophy"
            label="Ranking"
            size={56}
            onPress={() => router.push('/ranking')}
            testID="home-ranking"
          />
        </View>
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
