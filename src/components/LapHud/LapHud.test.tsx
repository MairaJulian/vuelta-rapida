import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { RaceLapView } from '@/core/RaceFlow';

import { getLapHudTexts, LapHud } from './LapHud';
import { HUD_INTERVAL_MS, NO_RECORD } from './LapHud.styles';

function sharedView(initial: RaceLapView) {
  let value = initial;
  return {
    get: () => value,
    set: (next: RaceLapView) => {
      value = next;
    },
  };
}

const GRID: RaceLapView = { lap: 1, totalLaps: 3, lapTicks: 0 };
/** Vuelta 2 de 3 en curso: van 2580 pasos (43 s). */
const SECOND_LAP: RaceLapView = { lap: 2, totalLaps: 3, lapTicks: 2580 };

describe('getLapHudTexts', () => {
  it('antes de largar muestra la vuelta 1 y el tiempo en cero', () => {
    expect(getLapHudTexts(GRID, null, 60)).toEqual({
      lap: '1',
      totalLaps: '/3',
      time: '0:00.000',
      best: NO_RECORD,
    });
  });

  it('muestra la vuelta en curso con el total, su tiempo y el récord', () => {
    expect(getLapHudTexts(SECOND_LAP, 72480, 60)).toEqual({
      lap: '2',
      totalLaps: '/3',
      time: '0:43.000',
      best: '1:12.480',
    });
  });
});

describe('LapHud', () => {
  it('dibuja las tres píldoras del handoff', async () => {
    await render(<LapHud lapView={sharedView(SECOND_LAP) as never} recordMs={72480} stepHz={60} />);
    expect(screen.getByText('Vuelta')).toBeTruthy();
    expect(screen.getByTestId('lap-hud-lap')).toHaveTextContent('2/3');
    expect(screen.getByLabelText('Vuelta 2 de 3')).toBeTruthy();
    expect(screen.getByTestId('lap-hud-time')).toHaveTextContent('0:43.000');
    expect(screen.getByText('Mejor')).toBeTruthy();
    expect(screen.getByTestId('lap-hud-best')).toHaveTextContent('1:12.480');
    expect(screen.getByLabelText('Mejor vuelta 1:12.480')).toBeTruthy();
  });

  it('sin récord lo indica', async () => {
    await render(<LapHud lapView={sharedView(GRID) as never} recordMs={null} stepHz={60} />);
    expect(screen.getByTestId('lap-hud-best')).toHaveTextContent(NO_RECORD);
    expect(screen.getByLabelText('Sin mejor vuelta')).toBeTruthy();
  });

  it('actualiza el tiempo mientras corre la vuelta', async () => {
    jest.useFakeTimers();
    try {
      const view = sharedView(SECOND_LAP);
      await render(<LapHud lapView={view as never} recordMs={null} stepHz={60} />);
      view.set({ ...SECOND_LAP, lapTicks: SECOND_LAP.lapTicks + 30 });
      await act(() => jest.advanceTimersByTime(HUD_INTERVAL_MS));
      expect(screen.getByTestId('lap-hud-time')).toHaveTextContent('0:43.500');
    } finally {
      jest.useRealTimers();
    }
  });

  it('deja pasar los toques, salvo el botón de pausa', async () => {
    await render(<LapHud lapView={sharedView(GRID) as never} recordMs={null} stepHz={60} />);
    expect(screen.getByTestId('lap-hud')).toHaveStyle({ pointerEvents: 'box-none' });
    expect(screen.getByLabelText('Sin mejor vuelta')).toHaveStyle({ pointerEvents: 'none' });
    expect(screen.queryByRole('button', { name: 'Pausa' })).toBeNull();
  });

  it('con onPause muestra el botón de pausa a la derecha de "Mejor"', async () => {
    const onPause = jest.fn();
    await render(
      <LapHud lapView={sharedView(GRID) as never} recordMs={null} stepHz={60} onPause={onPause} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Pausa' }));
    expect(onPause).toHaveBeenCalledTimes(1);
    // "Mejor" se corre para dejarle lugar: 28 + 48 + 10.
    expect(screen.getByLabelText('Sin mejor vuelta')).toHaveStyle({ right: 86 });
  });
});
