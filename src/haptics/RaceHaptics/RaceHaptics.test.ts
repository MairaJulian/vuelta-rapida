import * as Haptics from 'expo-haptics';

import type { RaceEvent } from '@/core/RaceFlow';

import {
  createRaceHaptics,
  DEFAULT_RACE_HAPTICS,
  DOUBLE_GAP_MS,
  getHapticLevel,
  HAPTIC_LEVELS,
} from './RaceHaptics';
import type { RaceHapticsConfig } from './RaceHaptics.types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const FINISH: RaceEvent = {
  type: 'finish',
  tick: 0,
  totalTicks: 300,
  lapTicks: [100, 100, 100],
  bestLapTicks: 100,
  bestLapIndex: 0,
  newRecord: false,
  previousRecordTicks: null,
};

describe('getHapticLevel', () => {
  it('con los valores iniciales: piano leve, borde fuerte, largada media, llegada doble', () => {
    const level = (event: RaceEvent) => getHapticLevel(event, DEFAULT_RACE_HAPTICS);
    expect(level({ type: 'kerbEnter', tick: 0, speed: 20 })).toBe('light');
    expect(level({ type: 'borderHit', tick: 0, impactSpeed: 5 })).toBe('heavy');
    expect(level({ type: 'lightsOut', tick: 0 })).toBe('medium');
    expect(level(FINISH)).toBe('double');
  });

  it('las luces, las vueltas y los cambios de estado no vibran', () => {
    const level = (event: RaceEvent) => getHapticLevel(event, DEFAULT_RACE_HAPTICS);
    expect(level({ type: 'lightOn', tick: 0, light: 1 })).toBeNull();
    expect(
      level({ type: 'lapCompleted', tick: 0, lap: 1, totalLaps: 3, lapTicks: 100 }),
    ).toBeNull();
    expect(level({ type: 'phase', tick: 0, from: 'grid', to: 'lights' })).toBeNull();
  });

  it('un momento apagado no vibra', () => {
    const config: RaceHapticsConfig = { ...DEFAULT_RACE_HAPTICS, border: 'off' };
    expect(getHapticLevel({ type: 'borderHit', tick: 0, impactSpeed: 5 }, config)).toBeNull();
  });

  it('el panel ofrece las cinco intensidades en orden', () => {
    expect(HAPTIC_LEVELS.map((option) => option.label)).toEqual([
      'Apagada',
      'Leve',
      'Media',
      'Fuerte',
      'Doble',
    ]);
  });
});

describe('createRaceHaptics', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('cada intensidad es un golpe de esa fuerza', () => {
    const impact = jest.fn();
    const haptics = createRaceHaptics({ impact });
    haptics.pulse('light');
    haptics.pulse('medium');
    haptics.pulse('heavy');
    haptics.pulse('off');
    expect(impact.mock.calls).toEqual([['light'], ['medium'], ['heavy']]);
  });

  it(`doble son dos golpes fuertes separados por ${DOUBLE_GAP_MS} ms`, () => {
    const impact = jest.fn();
    const haptics = createRaceHaptics({ impact });
    haptics.pulse('double');
    expect(impact).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(DOUBLE_GAP_MS);
    expect(impact.mock.calls).toEqual([['heavy'], ['heavy']]);
  });

  it('al cerrar se cancela el segundo golpe y ya no vibra', () => {
    const impact = jest.fn();
    const haptics = createRaceHaptics({ impact });
    haptics.pulse('double');
    haptics.close();
    jest.advanceTimersByTime(DOUBLE_GAP_MS * 2);
    haptics.pulse('heavy');
    expect(impact).toHaveBeenCalledTimes(1);
  });

  it('por defecto usa expo-haptics con el estilo de cada fuerza', () => {
    const haptics = createRaceHaptics();
    haptics.pulse('medium');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });
});
