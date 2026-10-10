import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { DEFAULT_RACE_AUDIO_MIX } from '@/audio/RaceAudio';
import type { RaceAudio, RaceAudioMix } from '@/audio/RaceAudio';
import { createEventBus } from '@/core/EventBus';
import type { RaceEvent, RacePhase } from '@/core/RaceFlow';

import { useRaceAudio } from './useRaceAudio';
import type { UseRaceAudioParams } from './useRaceAudio.types';

function fakeAudio(): jest.Mocked<RaceAudio> {
  return {
    load: jest.fn(() => Promise.resolve()),
    setEngineSpeed: jest.fn(),
    play: jest.fn(),
    setMix: jest.fn(),
    setMuted: jest.fn(),
    suspend: jest.fn(),
    resume: jest.fn(),
    close: jest.fn(),
  };
}

const phase = (from: RacePhase, to: RacePhase): RaceEvent => ({ type: 'phase', tick: 0, from, to });

async function renderAudio(overrides: Partial<UseRaceAudioParams> = {}) {
  const bus = createEventBus<RaceEvent>();
  const audio = fakeAudio();
  const createAudio = jest.fn(() => audio);
  const hook = await renderHook(
    (props: Partial<UseRaceAudioParams>) =>
      useRaceAudio({ bus, enabled: true, mix: DEFAULT_RACE_AUDIO_MIX, createAudio, ...props }),
    { initialProps: overrides },
  );
  const emit = (...events: RaceEvent[]) => act(() => bus.emitAll(events));
  const appState = async (state: AppStateStatus) => {
    const listener = jest.mocked(AppState.addEventListener).mock.calls.at(-1)![1] as (
      next: AppStateStatus,
    ) => void;
    await act(async () => listener(state));
  };
  return { ...hook, bus, audio, createAudio, emit, appState };
}

describe('useRaceAudio', () => {
  it('crea el sonido una vez, lo carga y aplica la preferencia y la mezcla', async () => {
    const { audio, createAudio, rerender } = await renderAudio();
    expect(createAudio).toHaveBeenCalledTimes(1);
    expect(audio.load).toHaveBeenCalledTimes(1);
    expect(audio.setMuted).toHaveBeenLastCalledWith(false);
    expect(audio.setMix).toHaveBeenLastCalledWith(DEFAULT_RACE_AUDIO_MIX);
    await rerender({});
    expect(createAudio).toHaveBeenCalledTimes(1);
  });

  it('si los sonidos no cargan, el juego sigue y en desarrollo lo avisa', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const audio = fakeAudio();
    const error = new Error('Network request failed');
    audio.load.mockReturnValueOnce(Promise.reject(error));
    await renderAudio({ createAudio: () => audio });
    await act(async () => undefined);
    expect(warn).toHaveBeenCalledWith('No se pudieron cargar los sonidos de la carrera:', error);
    warn.mockRestore();
  });

  it('las celebraciones del ranking suenan', async () => {
    const { audio, emit } = await renderAudio();
    await emit({ type: 'celebration', kind: 'overtake' });
    expect(audio.play).toHaveBeenLastCalledWith({ sound: 'overtake', volume: 1 });
    await emit({ type: 'celebration', kind: 'trackRecord' });
    expect(audio.play).toHaveBeenLastCalledWith({ sound: 'trackRecord', volume: 1 });
  });

  it('sin sonido silencia todo, y lo vuelve a prender en caliente', async () => {
    const { audio, rerender } = await renderAudio({ enabled: false });
    expect(audio.setMuted).toHaveBeenLastCalledWith(true);
    await rerender({ enabled: true });
    expect(audio.setMuted).toHaveBeenLastCalledWith(false);
  });

  it('la mezcla cambia en caliente', async () => {
    const { audio, rerender } = await renderAudio();
    const mix: RaceAudioMix = { ...DEFAULT_RACE_AUDIO_MIX, engineVolume: 0.1 };
    await rerender({ mix });
    expect(audio.setMix).toHaveBeenLastCalledWith(mix);
  });

  it('cada evento hace sonar su efecto', async () => {
    const { audio, emit } = await renderAudio();
    await emit(
      { type: 'lightOn', tick: 60, light: 1 },
      { type: 'lightsOut', tick: 400 },
      { type: 'lapCompleted', tick: 900, lap: 1, totalLaps: 3, lapTicks: 500 },
    );
    expect(audio.play.mock.calls.map(([cue]) => cue.sound)).toEqual(['light', 'go', 'lap']);
  });

  it('la pausa congela el audio y continuar lo reanuda', async () => {
    const { audio, emit } = await renderAudio();
    await emit(phase('racing', 'paused'));
    expect(audio.suspend).toHaveBeenCalledTimes(1);
    await emit(phase('paused', 'racing'));
    expect(audio.resume).toHaveBeenCalledTimes(1);
  });

  it('en segundo plano se congela; al volver se reanuda, salvo si la carrera quedó en pausa', async () => {
    const { audio, emit, appState } = await renderAudio();
    await appState('background');
    expect(audio.suspend).toHaveBeenCalledTimes(1);
    await appState('active');
    expect(audio.resume).toHaveBeenCalledTimes(1);
    await emit(phase('racing', 'paused'));
    await appState('background');
    await appState('active');
    expect(audio.resume).toHaveBeenCalledTimes(1);
  });

  it('onEngine pasa la velocidad al motor y es estable', async () => {
    const { result, audio, rerender } = await renderAudio();
    const { onEngine } = result.current;
    onEngine(0.7);
    expect(audio.setEngineSpeed).toHaveBeenCalledWith(0.7);
    await rerender({});
    expect(result.current.onEngine).toBe(onEngine);
  });

  it('al desmontar cierra el sonido y deja de escuchar el bus', async () => {
    const { audio, bus, unmount } = await renderAudio();
    await unmount();
    expect(audio.close).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount()).toBe(0);
  });
});
