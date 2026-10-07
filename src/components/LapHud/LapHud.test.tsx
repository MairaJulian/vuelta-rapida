import { act, render, screen } from '@testing-library/react-native';

import { createLapState } from '@/core/LapTimer';
import type { LapState } from '@/core/LapTimer';

import { getLapHudTexts, LapHud } from './LapHud';
import { HUD_INTERVAL_MS, NO_RECORD } from './LapHud.styles';

function sharedLaps(initial: LapState) {
  let value = initial;
  return {
    get: () => value,
    set: (next: LapState) => {
      value = next;
    },
  };
}

/** Vuelta 2 en curso: empezó en el paso 4320 y van 2580 pasos (43 s). */
const secondLap: LapState = {
  ...createLapState(),
  tick: 6900,
  progress: 1200,
  gatesPassed: 5,
  lapStartTick: 4320,
  lapTicks: [4320],
  bestLapTicks: 4320,
};

describe('getLapHudTexts', () => {
  it('antes de largar muestra la vuelta 1 y el tiempo en cero', () => {
    expect(getLapHudTexts(createLapState(), null, 60)).toEqual({
      lap: '1',
      time: '0:00.000',
      best: NO_RECORD,
    });
  });

  it('muestra la vuelta en curso, su tiempo y el récord', () => {
    expect(getLapHudTexts(secondLap, 72480, 60)).toEqual({
      lap: '2',
      time: '0:43.000',
      best: '1:12.480',
    });
  });
});

describe('LapHud', () => {
  it('dibuja las tres píldoras del handoff', async () => {
    const laps = sharedLaps(secondLap);
    await render(<LapHud laps={laps as never} recordMs={72480} stepHz={60} />);
    expect(screen.getByText('Vuelta')).toBeTruthy();
    expect(screen.getByTestId('lap-hud-lap')).toHaveTextContent('2');
    expect(screen.getByTestId('lap-hud-time')).toHaveTextContent('0:43.000');
    expect(screen.getByText('Mejor')).toBeTruthy();
    expect(screen.getByTestId('lap-hud-best')).toHaveTextContent('1:12.480');
    expect(screen.getByLabelText('Mejor vuelta 1:12.480')).toBeTruthy();
  });

  it('sin récord lo indica', async () => {
    await render(
      <LapHud laps={sharedLaps(createLapState()) as never} recordMs={null} stepHz={60} />,
    );
    expect(screen.getByTestId('lap-hud-best')).toHaveTextContent(NO_RECORD);
    expect(screen.getByLabelText('Sin mejor vuelta')).toBeTruthy();
  });

  it('actualiza el tiempo mientras corre la vuelta', async () => {
    jest.useFakeTimers();
    try {
      const laps = sharedLaps(secondLap);
      await render(<LapHud laps={laps as never} recordMs={null} stepHz={60} />);
      laps.set({ ...secondLap, tick: secondLap.tick + 30 });
      await act(() => jest.advanceTimersByTime(HUD_INTERVAL_MS));
      expect(screen.getByTestId('lap-hud-time')).toHaveTextContent('0:43.500');
    } finally {
      jest.useRealTimers();
    }
  });

  it('deja pasar los toques', async () => {
    await render(
      <LapHud laps={sharedLaps(createLapState()) as never} recordMs={null} stepHz={60} />,
    );
    expect(screen.getByTestId('lap-hud')).toHaveStyle({ pointerEvents: 'none' });
  });
});
