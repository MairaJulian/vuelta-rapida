import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/Confetti';
import { Icon } from '@/components/Icon';
import { MenuButton } from '@/components/MenuButton';
import { formatGapSeconds, formatLapDelta, formatLapTime, ticksToMs } from '@/core/LapTimer';
import type { RaceResults as RaceResultsData } from '@/core/RaceFlow';
import { getTableLabel } from '@/core/Ranking';
import type { RaceRanking, RankingOutcome } from '@/core/Ranking';

import { COLORS, LAYOUT, styles } from './RaceResults.styles';
import type { RaceResultsProps, RaceResultsTexts, RankingTexts } from './RaceResults.types';

/** "¡Pasaste a TOMI!", "¡Pasaste a TOMI y a LULI!" o "¡Pasaste a 3 pilotos!". */
function overtakeTitle(names: string[]): string {
  if (names.length === 1) {
    return `¡Pasaste a ${names[0]}!`;
  }
  if (names.length === 2) {
    return `¡Pasaste a ${names[0]} y a ${names[1]}!`;
  }
  return `¡Pasaste a ${names.length} pilotos!`;
}

/** Lo que le falta al jugador en una tabla, o "¡Primero!". */
function rankingDetail(outcome: RankingOutcome): string {
  if (!outcome.above || outcome.gapToAboveMs === null) {
    return '¡Primero!';
  }
  const name = outcome.above.profile.name.toUpperCase();
  if (outcome.gapToAboveMs <= 0) {
    return `Empate con ${name}, que lo logró antes`;
  }
  return `Te faltan ${formatGapSeconds(outcome.gapToAboveMs)} s para alcanzar a ${name}`;
}

/**
 * Textos del ranking: el título según la celebración más grande, y el puesto de cada
 * tabla con cuánto le falta para alcanzar al de arriba.
 */
export function getRankingTexts(ranking: RaceRanking): RankingTexts {
  const overtaken = [...ranking.lap.overtaken, ...ranking.race.overtaken];
  const names = [...new Map(overtaken.map((profile) => [profile.id, profile])).values()].map(
    (profile) => profile.name.toUpperCase(),
  );
  const titles = {
    trackRecord: '¡Récord de la pista!',
    overtake: overtakeTitle(names),
    personalBest: '¡Nuevo récord personal!',
  };
  const tables = (['lap', 'race'] as const).flatMap((key) => {
    const outcome = ranking[key];
    return outcome.position === null
      ? []
      : [
          {
            key,
            label: getTableLabel(outcome.table),
            position: `${outcome.position}.º de ${outcome.total}`,
            detail: rankingDetail(outcome),
          },
        ];
  });
  return {
    title: ranking.celebration ? titles[ranking.celebration] : 'Tu tiempo',
    tables,
  };
}

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
export function RaceResults({
  results,
  stepHz,
  circuitName,
  driver = null,
  ranking = null,
  onRetry,
  onExit,
}: RaceResultsProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const texts = getRaceResultsTexts(results, stepHz, circuitName);
  const rankingTexts = ranking ? getRankingTexts(ranking) : null;
  // Con ranking, celebra lo que dice el ranking; sin perfil, solo el récord de vuelta.
  const celebrate = ranking ? ranking.celebration !== null : results.newRecord;
  const confetti = ranking ? ranking.celebration === 'trackRecord' : results.newRecord;
  const top = LAYOUT.inset + insets.top;
  const bottom = LAYOUT.inset + insets.bottom;
  const left = LAYOUT.inset + insets.left;
  // El delta compara la mejor vuelta con el récord personal: su color sigue a esa vuelta.
  const deltaColors = results.newRecord
    ? { background: COLORS.ink, figure: COLORS.lime, caption: COLORS.card }
    : { background: COLORS.slowerSoft, figure: COLORS.slowerText, caption: COLORS.slowerText };

  return (
    <View testID="race-results" style={styles.screen} accessibilityViewIsModal>
      <View
        testID="results-card"
        style={[
          styles.card,
          !celebrate && styles.cardPlain,
          { left, top, bottom, backgroundColor: celebrate ? COLORS.lime : COLORS.card },
        ]}
      >
        {celebrate ? <Checker /> : null}
        <View style={styles.titleRow}>
          {celebrate ? <Icon name="trophy" color={COLORS.ink} size={24} /> : null}
          <Text
            style={styles.title}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {rankingTexts?.title ?? texts.title}
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
        <Text style={styles.columnHeader} testID="results-driver" numberOfLines={1}>
          {driver ? `${driver.name.toUpperCase()} · #${driver.number}` : 'Tus vueltas'}
        </Text>
        {rankingTexts && rankingTexts.tables.length > 0 ? (
          <View style={styles.ranking} testID="results-ranking">
            {rankingTexts.tables.map((table) => (
              <View
                key={table.key}
                style={styles.rankingTile}
                accessible
                accessibilityLabel={`${table.label}: ${table.position}. ${table.detail}`}
                testID={`results-ranking-${table.key}`}
              >
                <Text style={styles.rankingLabel} numberOfLines={1}>
                  {table.label}
                </Text>
                <Text style={styles.rankingPosition}>{table.position}</Text>
                <Text style={styles.rankingDetail} numberOfLines={2}>
                  {table.detail}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
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

      {confetti ? <Confetti width={width} height={height} /> : null}
    </View>
  );
}
