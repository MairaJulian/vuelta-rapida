import { act, renderHook } from '@testing-library/react-native';

import { createEventBus } from '@/core/EventBus';
import type { RaceEvent } from '@/core/RaceFlow';
import { DEFAULT_RACE_HAPTICS } from '@/haptics/RaceHaptics';
import type { RaceHaptics } from '@/haptics/RaceHaptics';

import { useRaceHaptics } from './useRaceHaptics';
import type { UseRaceHapticsParams } from './useRaceHaptics.types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const BORDER: RaceEvent = { type: 'borderHit', tick: 10, impactSpeed: 8 };
const KERB: RaceEvent = { type: 'kerbEnter', tick: 20, speed: 25 };

async function renderHaptics(overrides: Partial<UseRaceHapticsParams> = {}) {
  const bus = createEventBus<RaceEvent>();
  const haptics: jest.Mocked<RaceHaptics> = { pulse: jest.fn(), close: jest.fn() };
  const createHaptics = jest.fn(() => haptics);
  const hook = await renderHook(
    (props: Partial<UseRaceHapticsParams>) =>
      useRaceHaptics({
        bus,
        enabled: true,
        config: DEFAULT_RACE_HAPTICS,
        createHaptics,
        ...props,
      }),
    { initialProps: overrides },
  );
  const emit = (...events: RaceEvent[]) => act(() => bus.emitAll(events));
  return { ...hook, bus, haptics, createHaptics, emit };
}

describe('useRaceHaptics', () => {
  it('cada evento vibra con la intensidad de su momento', async () => {
    const { haptics, emit } = await renderHaptics();
    await emit(BORDER, KERB, { type: 'lightOn', tick: 30, light: 1 });
    expect(haptics.pulse.mock.calls).toEqual([['heavy'], ['light']]);
  });

  it('con la vibración apagada no vibra nada, y se prende en caliente', async () => {
    const { haptics, emit, rerender } = await renderHaptics({ enabled: false });
    await emit(BORDER);
    expect(haptics.pulse).not.toHaveBeenCalled();
    await rerender({ enabled: true });
    await emit(BORDER);
    expect(haptics.pulse).toHaveBeenCalledTimes(1);
  });

  it('las intensidades cambian en caliente', async () => {
    const { haptics, emit, rerender } = await renderHaptics();
    await rerender({ config: { ...DEFAULT_RACE_HAPTICS, border: 'double' } });
    await emit(BORDER);
    expect(haptics.pulse).toHaveBeenCalledWith('double');
  });

  it('al desmontar cancela lo pendiente y deja de escuchar el bus', async () => {
    const { haptics, bus, unmount, createHaptics } = await renderHaptics();
    expect(createHaptics).toHaveBeenCalledTimes(1);
    await unmount();
    expect(haptics.close).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount()).toBe(0);
  });
});
