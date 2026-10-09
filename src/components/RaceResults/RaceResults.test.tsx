import { fireEvent, render, screen } from '@testing-library/react-native';

import type { RaceResults as RaceResultsData } from '@/core/RaceFlow';

import { getRaceResultsTexts, RaceResults } from './RaceResults';
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
