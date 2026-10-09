import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/Confetti';
import { Icon } from '@/components/Icon';
import { MenuButton } from '@/components/MenuButton';
import { formatLapDelta, formatLapTime, ticksToMs } from '@/core/LapTimer';
import type { RaceResults as RaceResultsData } from '@/core/RaceFlow';

import { COLORS, LAYOUT, styles } from './RaceResults.styles';
import type { RaceResultsProps, RaceResultsTexts } from './RaceResults.types';

/**
 * Textos de los resultados. El tiempo grande es la mejor vuelta (lo que se
 * compara con el récord); el delta es contra el récord que había al empezar.
 */
export function getRaceResultsTexts(
  results: RaceResultsData,
  stepHz: number,
  circuitName: string,
): RaceResultsTexts {
  const ms = (ticks: number) => ticksToMs(ticks, stepHz);
  const bestMs = ms(results.bestLapTicks);
  const previous = results.previousRecordTicks;
  let deltaCaption = 'vs. tu récord';
  if (previous === null) {
    deltaCaption = 'Primer récord';
  } else if (results.newRecord) {
    deltaCaption = 'vs. récord anterior';
  }
  return {
    title: results.newRecord ? '¡Nuevo récord!' : 'Tu tiempo',
    subtitle: `${circuitName} · ${results.lapTicks.length} ${results.lapTicks.length === 1 ? 'vuelta' : 'vueltas'}`,
    best: formatLapTime(bestMs),
    total: formatLapTime(ms(results.totalTicks)),
    delta: previous === null ? null : formatLapDelta(bestMs - ms(previous)),
    deltaCaption,
    laps: results.lapTicks.map((ticks, i) => {
      const best = i === results.bestLapIndex;
      return {
        label: `Vuelta ${i + 1}`,
        time: formatLapTime(ms(ticks)),
        chip: best ? 'Mejor' : formatLapDelta(ms(ticks) - bestMs),
        best,
      };
    }),
  };
}

/** Recorte a cuadros de la esquina de la tarjeta: tinta sobre el fondo, en escalera. */
function Checker() {
  const squares: { left: number; top: number; key: string }[] = [];
  for (let row = 0; row < LAYOUT.checkerRows; row += 1) {
    for (let column = 0; column < LAYOUT.checkerColumns; column += 1) {
      // Solo la parte de arriba a la derecha de la diagonal, en damero.
      if ((row + column) % 2 === 0 && column >= row * 2) {
        squares.push({
          left: column * LAYOUT.checkerSquare,
          top: row * LAYOUT.checkerSquare,
          key: `${row}-${column}`,
        });
      }
    }
  }
  return (
    <View style={styles.checker} testID="results-checker">
      {squares.map(({ key, ...position }) => (
        <View key={key} style={[styles.checkerSquare, position]} />
      ))}
    </View>
  );
}

/**
 * Resultados de la carrera (pantalla 09 del handoff): a la izquierda, la tarjeta
 * con la mejor vuelta, el total y el delta contra el récord (lima y con papelitos
 * si hubo récord nuevo); a la derecha, cada vuelta con su tiempo, y "Otra vez" y
 * "Salir".
 */
export function RaceResults({ results, stepHz, circuitName, onRetry, onExit }: RaceResultsProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const texts = getRaceResultsTexts(results, stepHz, circuitName);
  const record = results.newRecord;
  const top = LAYOUT.inset + insets.top;
  const bottom = LAYOUT.inset + insets.bottom;
  const left = LAYOUT.inset + insets.left;
  const deltaColors = record
    ? { background: COLORS.ink, figure: COLORS.lime, caption: COLORS.card }
    : { background: COLORS.slowerSoft, figure: COLORS.slowerText, caption: COLORS.slowerText };

  return (
    <View testID="race-results" style={styles.screen} accessibilityViewIsModal>
      <View
        testID="results-card"
        style={[
          styles.card,
          !record && styles.cardPlain,
          { left, top, bottom, backgroundColor: record ? COLORS.lime : COLORS.card },
        ]}
      >
        {record ? <Checker /> : null}
        <View style={styles.titleRow}>
          {record ? <Icon name="trophy" color={COLORS.ink} size={24} /> : null}
          <Text style={styles.title} accessibilityRole="header">
            {texts.title}
          </Text>
        </View>
        <Text style={styles.subtitle}>{texts.subtitle}</Text>
        <Text style={styles.bestLabel}>Mejor vuelta</Text>
        <Text style={styles.bestTime} testID="results-best" numberOfLines={1} adjustsFontSizeToFit>
          {texts.best}
        </Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total de la carrera</Text>
          <Text style={styles.totalValue} testID="results-total">
            {texts.total}
          </Text>
        </View>
        <View
          style={[styles.deltaPill, { backgroundColor: deltaColors.background }]}
          testID="results-delta"
        >
          {texts.delta === null ? (
            <Text style={[styles.deltaValue, { color: COLORS.lime }]}>{texts.deltaCaption}</Text>
          ) : (
            <>
              <Text style={[styles.deltaValue, { color: deltaColors.figure }]}>{texts.delta}</Text>
              <Text style={[styles.deltaCaption, { color: deltaColors.caption }]}>
                {texts.deltaCaption}
              </Text>
            </>
          )}
        </View>
      </View>

      <View
        style={[
          styles.column,
          {
            left: left + LAYOUT.cardWidth + LAYOUT.columnGap,
            right: LAYOUT.columnRight + insets.right,
            top: top + 12,
            bottom,
          },
        ]}
      >
        <Text style={styles.columnHeader}>Tus vueltas</Text>
        <ScrollView style={styles.laps} contentContainerStyle={styles.lapsContent}>
          {texts.laps.map((lap) => (
            <View
              key={lap.label}
              testID={lap.best ? 'results-lap-best' : undefined}
              style={[styles.lapRow, { backgroundColor: lap.best ? COLORS.blueSoft : COLORS.card }]}
              accessible
              accessibilityLabel={`${lap.label}: ${lap.time}${lap.best ? ', la mejor' : `, ${lap.chip}`}`}
            >
              <Text style={styles.lapLabel}>{lap.label}</Text>
              <Text style={styles.lapTime}>{lap.time}</Text>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: lap.best ? COLORS.blue : COLORS.slowerSoft },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: lap.best ? COLORS.card : COLORS.slowerText }]}
                >
                  {lap.chip}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.buttons}>
          <MenuButton
            label="Otra vez"
            variant="primary"
            icon="restart"
            onPress={onRetry}
            style={styles.button}
          />
          <MenuButton label="Salir" variant="secondary" onPress={onExit} style={styles.button} />
        </View>
      </View>

      {record ? <Confetti width={width} height={height} /> : null}
    </View>
  );
}
