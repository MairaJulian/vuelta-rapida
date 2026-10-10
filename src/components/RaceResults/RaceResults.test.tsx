import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Profile } from '@/core/Profiles';
import type { RaceResults as RaceResultsData } from '@/core/RaceFlow';
import { LAP_TABLE, raceTable } from '@/core/Ranking';
import type { RaceRanking, RankingOutcome, RankingRow } from '@/core/Ranking';

import { getRaceResultsTexts, getRankingTexts, RaceResults } from './RaceResults';
import { COLORS } from './RaceResults.styles';

const MINUS = '−';

/** Tres vueltas a 60 pasos por segundo: 1:13.214, 1:11.902 (la mejor) y 1:12.655. */
const LAPS = [4392.84, 4314.12, 4359.3];
const results = (overrides: Partial<RaceResultsData> = {}): RaceResultsData => ({
  totalTicks: LAPS[0] + LAPS[1] + LAPS[2],
  lapTicks: LAPS,
  bestLapTicks: LAPS[1],
  bestLapIndex: 1,
  newRecord: true,
  previousRecordTicks: LAPS[1] + 34.68,
  ...overrides,
});

describe('getRaceResultsTexts', () => {
  it('con récord nuevo: la mejor vuelta, el total y el delta contra el récord anterior', () => {
    const texts = getRaceResultsTexts(results(), 60, 'Autódromo del Lago');
    expect(texts.title).toBe('¡Nuevo récord!');
    expect(texts.subtitle).toBe('Autódromo del Lago · 3 vueltas');
    expect(texts.best).toBe('1:11.902');
    expect(texts.total).toBe('3:37.771');
    expect(texts.delta).toBe(`${MINUS}0.578`);
    expect(texts.deltaCaption).toBe('vs. récord anterior');
  });

  it('cada vuelta con su tiempo; la mejor dice "Mejor" y las demás cuánto perdieron', () => {
    const { laps } = getRaceResultsTexts(results(), 60, 'X');
    expect(laps).toEqual([
      { label: 'Vuelta 1', time: '1:13.214', chip: '+1.312', best: false },
      { label: 'Vuelta 2', time: '1:11.902', chip: 'Mejor', best: true },
      { label: 'Vuelta 3', time: '1:12.655', chip: '+0.753', best: false },
    ]);
  });

  it('sin récord: "Tu tiempo" y el delta en contra', () => {
    const texts = getRaceResultsTexts(
      results({ newRecord: false, previousRecordTicks: LAPS[1] - 14.16 }),
      60,
      'X',
    );
    expect(texts.title).toBe('Tu tiempo');
    expect(texts.delta).toBe('+0.236');
    expect(texts.deltaCaption).toBe('vs. tu récord');
  });

  it('la primera carrera en el circuito es el primer récord, sin delta', () => {
    const texts = getRaceResultsTexts(results({ previousRecordTicks: null }), 60, 'X');
    expect(texts.delta).toBeNull();
    expect(texts.deltaCaption).toBe('Primer récord');
  });

  it('una sola vuelta dice "1 vuelta"', () => {
    const one = results({
      lapTicks: [4000],
      totalTicks: 4000,
      bestLapTicks: 4000,
      bestLapIndex: 0,
    });
    expect(getRaceResultsTexts(one, 60, 'X').subtitle).toBe('X · 1 vuelta');
  });
});

describe('RaceResults', () => {
  const render9 = (data: RaceResultsData, onRetry = jest.fn(), onExit = jest.fn()) =>
    render(
      <RaceResults
        results={data}
        stepHz={60}
        circuitName="Autódromo del Lago"
        onRetry={onRetry}
        onExit={onExit}
      />,
    );

  it('con récord: tarjeta lima, trofeo, bandera a cuadros y papelitos', async () => {
    await render9(results());
    expect(screen.getByRole('header', { name: '¡Nuevo récord!' })).toBeTruthy();
    expect(screen.getByTestId('results-card')).toHaveStyle({ backgroundColor: COLORS.lime });
    expect(screen.getByTestId('results-checker')).toBeTruthy();
    expect(screen.getByTestId('confetti', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('results-best')).toHaveTextContent('1:11.902');
    expect(screen.getByTestId('results-total')).toHaveTextContent('3:37.771');
    expect(screen.getByTestId('results-delta')).toHaveTextContent(
      `${MINUS}0.578vs. récord anterior`,
    );
  });

  it('sin récord: tarjeta blanca, sin papelitos', async () => {
    await render9(results({ newRecord: false, previousRecordTicks: LAPS[1] - 14.16 }));
    expect(screen.getByRole('header', { name: 'Tu tiempo' })).toBeTruthy();
    expect(screen.getByTestId('results-card')).toHaveStyle({ backgroundColor: COLORS.card });
    expect(screen.queryByTestId('results-checker')).toBeNull();
    expect(screen.queryByTestId('confetti', { includeHiddenElements: true })).toBeNull();
  });

  it('marca la mejor vuelta y lista todas', async () => {
    await render9(results());
    expect(screen.getByTestId('results-lap-best')).toHaveStyle({
      backgroundColor: COLORS.blueSoft,
    });
    expect(screen.getByLabelText('Vuelta 2: 1:11.902, la mejor')).toBeTruthy();
    expect(screen.getByLabelText('Vuelta 1: 1:13.214, +1.312')).toBeTruthy();
    expect(screen.getByLabelText('Vuelta 3: 1:12.655, +0.753')).toBeTruthy();
  });

  it('encabeza las vueltas con el piloto: "NOMBRE · #NN"', async () => {
    await render(
      <RaceResults
        results={results()}
        stepHz={60}
        circuitName="Autódromo del Lago"
        driver={{ name: 'Male', number: 27 }}
        onRetry={jest.fn()}
        onExit={jest.fn()}
      />,
    );
    expect(screen.getByTestId('results-driver')).toHaveTextContent('MALE · #27');
  });

  it('sin piloto dice "Tus vueltas"', async () => {
    await render9(results());
    expect(screen.getByTestId('results-driver')).toHaveTextContent('Tus vueltas');
  });

  it('Otra vez y Salir llaman a sus acciones', async () => {
    const onRetry = jest.fn();
    const onExit = jest.fn();
    await render9(results(), onRetry, onExit);
    await fireEvent.press(screen.getByRole('button', { name: 'Otra vez' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salir' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

/** Perfiles de prueba para el ranking. */
const profile = (id: string, name: string): Profile => ({
  id,
  name,
  colorId: 'blue',
  number: 7,
  createdAt: 0,
});
const TOMI = profile('p2', 'Tomi');
const LULI = profile('p3', 'Luli');
const row = (position: number, who: Profile, gapToAboveMs = 0): RankingRow => ({
  position,
  profile: who,
  timeMs: 70000,
  setAt: 0,
  gapToLeaderMs: gapToAboveMs,
  gapToAboveMs,
});
const outcome = (overrides: Partial<RankingOutcome> = {}): RankingOutcome => ({
  table: LAP_TABLE,
  position: 1,
  previousPosition: 1,
  total: 3,
  personalBest: false,
  overtaken: [],
  trackRecord: false,
  above: null,
  gapToAboveMs: null,
  ...overrides,
});
const rankingOf = (
  lap: Partial<RankingOutcome>,
  race: Partial<RankingOutcome>,
  celebration: RaceRanking['celebration'],
): RaceRanking => ({
  lap: outcome(lap),
  race: outcome({ table: raceTable(3), ...race }),
  celebration,
});

describe('getRankingTexts', () => {
  it('el título sigue a la celebración más grande', () => {
    expect(getRankingTexts(rankingOf({}, {}, 'trackRecord')).title).toBe('¡Récord de la pista!');
    expect(getRankingTexts(rankingOf({}, {}, 'personalBest')).title).toBe(
      '¡Nuevo récord personal!',
    );
    expect(getRankingTexts(rankingOf({}, {}, null)).title).toBe('Tu tiempo');
  });

  it('al superar, nombra a quiénes (sin repetir entre tablas)', () => {
    const one = rankingOf({ overtaken: [TOMI] }, { overtaken: [TOMI] }, 'overtake');
    expect(getRankingTexts(one).title).toBe('¡Pasaste a TOMI!');
    const two = rankingOf({ overtaken: [TOMI] }, { overtaken: [LULI] }, 'overtake');
    expect(getRankingTexts(two).title).toBe('¡Pasaste a TOMI y a LULI!');
    const many = rankingOf(
      { overtaken: [TOMI, LULI] },
      { overtaken: [profile('p4', 'Juan')] },
      'overtake',
    );
    expect(getRankingTexts(many).title).toBe('¡Pasaste a 3 pilotos!');
  });

  it('el puesto en cada tabla y cuánto falta para el de arriba', () => {
    const texts = getRankingTexts(
      rankingOf(
        { position: 2, above: row(1, TOMI), gapToAboveMs: 420 },
        { position: 1, total: 1 },
        null,
      ),
    );
    expect(texts.tables).toEqual([
      {
        key: 'lap',
        label: 'Mejor vuelta',
        position: '2.º de 3',
        detail: 'Te faltan 0.42 s para alcanzar a TOMI',
      },
      { key: 'race', label: 'Carrera · 3 vueltas', position: '1.º de 1', detail: '¡Primero!' },
    ]);
  });

  it('con el mismo tiempo que el de arriba, lo dice', () => {
    const texts = getRankingTexts(
      rankingOf({ position: 2, above: row(1, TOMI), gapToAboveMs: 0 }, {}, null),
    );
    expect(texts.tables[0].detail).toBe('Empate con TOMI, que lo logró antes');
  });

  it('sin tiempo en una tabla, esa tabla no aparece', () => {
    const texts = getRankingTexts(rankingOf({}, { position: null, total: 0 }, null));
    expect(texts.tables.map((table) => table.key)).toEqual(['lap']);
  });
});

describe('RaceResults con ranking', () => {
  const renderWith = (ranking: RaceRanking, data = results()) =>
    render(
      <RaceResults
        results={data}
        stepHz={60}
        circuitName="Autódromo del Lago"
        ranking={ranking}
        onRetry={jest.fn()}
        onExit={jest.fn()}
      />,
    );

  it('récord de la pista: tarjeta lima, trofeo y papelitos', async () => {
    await renderWith(rankingOf({ trackRecord: true }, {}, 'trackRecord'));
    expect(screen.getByRole('header', { name: '¡Récord de la pista!' })).toBeTruthy();
    expect(screen.getByTestId('results-card')).toHaveStyle({ backgroundColor: COLORS.lime });
    expect(screen.getByTestId('confetti', { includeHiddenElements: true })).toBeTruthy();
  });

  it('superar o mejor tiempo personal: tarjeta lima, sin papelitos', async () => {
    await renderWith(rankingOf({ overtaken: [TOMI] }, {}, 'overtake'));
    expect(screen.getByRole('header', { name: '¡Pasaste a TOMI!' })).toBeTruthy();
    expect(screen.getByTestId('results-card')).toHaveStyle({ backgroundColor: COLORS.lime });
    expect(screen.queryByTestId('confetti', { includeHiddenElements: true })).toBeNull();
  });

  it('sin celebración: tarjeta blanca y "Tu tiempo", aunque haya mejorado la vuelta', async () => {
    await renderWith(rankingOf({}, {}, null), results({ newRecord: true }));
    expect(screen.getByRole('header', { name: 'Tu tiempo' })).toBeTruthy();
    expect(screen.getByTestId('results-card')).toHaveStyle({ backgroundColor: COLORS.card });
  });

  it('muestra el puesto en las dos tablas', async () => {
    await renderWith(rankingOf({ position: 2, above: row(1, TOMI), gapToAboveMs: 420 }, {}, null));
    expect(screen.getByTestId('results-ranking-lap')).toHaveTextContent(
      'Mejor vuelta2.º de 3Te faltan 0.42 s para alcanzar a TOMI',
    );
    expect(screen.getByTestId('results-ranking-race')).toHaveTextContent(
      'Carrera · 3 vueltas1.º de 3¡Primero!',
    );
  });

  it('sin ranking (sin perfil) no muestra el bloque', async () => {
    await render(
      <RaceResults
        results={results()}
        stepHz={60}
        circuitName="X"
        onRetry={jest.fn()}
        onExit={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('results-ranking')).toBeNull();
  });
});
