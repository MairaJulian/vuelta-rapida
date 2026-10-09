import { act, renderHook } from '@testing-library/react-native';

import { createEventBus } from '@/core/EventBus';
import type { RaceEvent, RaceLapView, RacePhase, RaceResults } from '@/core/RaceFlow';

import { RESULTS_DELAY_MS, useRaceStatus } from './useRaceStatus';

const RESULTS: RaceResults = {
  totalTicks: 900,
  lapTicks: [320, 290, 290],
  bestLapTicks: 290,
  bestLapIndex: 1,
  newRecord: true,
  previousRecordTicks: 300,
};

const phase = (from: RacePhase, to: RacePhase): RaceEvent => ({ type: 'phase', tick: 0, from, to });
const finish: RaceEvent = { type: 'finish', tick: 1200, ...RESULTS };

async function renderStatus(view: RaceLapView = { lap: 2, totalLaps: 3, lapTicks: 125 }) {
  const bus = createEventBus<RaceEvent>();
  const lapView = { get: jest.fn(() => view) };
  const hook = await renderHook(() => useRaceStatus({ bus, lapView: lapView as never }));
  const emit = (...events: RaceEvent[]) => act(() => bus.emitAll(events));
  return { ...hook, bus, lapView, emit };
}

describe('useRaceStatus', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('empieza en la grilla, sin pausa ni resultados', async () => {
    const { result } = await renderStatus();
    expect(result.current).toEqual({ phase: 'grid', pausedLap: null, results: null });
  });

  it('sigue el estado de la carrera con los avisos de cambio', async () => {
    const { result, emit } = await renderStatus();
    await emit(phase('grid', 'lights'));
    expect(result.current.phase).toBe('lights');
    await emit(phase('lights', 'racing'));
    expect(result.current.phase).toBe('racing');
  });

  it('al pausar lee la vuelta una sola vez y la suelta al continuar', async () => {
    const { result, emit, lapView } = await renderStatus();
    await emit(phase('racing', 'paused'));
    expect(result.current.pausedLap).toEqual({ lap: 2, totalLaps: 3, lapTicks: 125 });
    expect(lapView.get).toHaveBeenCalledTimes(1);
    await emit(phase('paused', 'racing'));
    expect(result.current).toMatchObject({ phase: 'racing', pausedLap: null });
    expect(lapView.get).toHaveBeenCalledTimes(1);
  });

  it(`muestra los resultados ${RESULTS_DELAY_MS} ms después de la llegada`, async () => {
    const { result, emit } = await renderStatus();
    await emit(finish, phase('racing', 'finished'));
    expect(result.current).toMatchObject({ phase: 'finished', results: null });
    await act(() => jest.advanceTimersByTime(RESULTS_DELAY_MS - 1));
    expect(result.current.results).toBeNull();
    await act(() => jest.advanceTimersByTime(1));
    expect(result.current.results).toEqual(RESULTS);
  });

  it('reiniciar quita los resultados', async () => {
    const { result, emit } = await renderStatus();
    await emit(finish, phase('racing', 'finished'));
    await act(() => jest.advanceTimersByTime(RESULTS_DELAY_MS));
    await emit(phase('finished', 'grid'));
    expect(result.current).toEqual({ phase: 'grid', pausedLap: null, results: null });
  });

  it('reiniciar antes de que aparezcan los resultados los cancela', async () => {
    const { result, emit } = await renderStatus();
    await emit(finish, phase('racing', 'finished'));
    await emit(phase('finished', 'grid'), phase('grid', 'lights'));
    await act(() => jest.advanceTimersByTime(RESULTS_DELAY_MS * 2));
    expect(result.current).toMatchObject({ phase: 'lights', results: null });
  });

  it('deja de escuchar el bus al desmontarse', async () => {
    const { bus, unmount } = await renderStatus();
    expect(bus.listenerCount()).toBe(2);
    await unmount();
    expect(bus.listenerCount()).toBe(0);
  });
});
