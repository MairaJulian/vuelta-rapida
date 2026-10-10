import { AudioContext } from 'react-native-audio-api';

import { DEFAULT_GEARBOX, GEARBOXES } from '@/audio/EngineGears';
import type { GearboxConfig, GearboxPace } from '@/audio/EngineGears';
import type { RaceEvent } from '@/core/RaceFlow';

import {
  BORDER_FULL_IMPACT,
  createRaceAudio,
  DEFAULT_RACE_AUDIO_MIX,
  ENGINE_IDLE_GAIN,
  ENGINE_SMOOTHING,
  getEngineGain,
  getEnginePitch,
  getSoundCue,
  KERB_FULL_SPEED,
  RACE_SOUND_SOURCES,
  SHIFT_CUT_GAIN,
  SHIFT_CUT_SECONDS,
  SHIFT_SMOOTHING,
} from './RaceAudio';
import type { RaceAudioMix, RaceSoundSources } from './RaceAudio.types';

/** Sin cambios de marcha: el tono sigue a la velocidad, como antes de las marchas. */
const MIX: RaceAudioMix = {
  engineVolume: 0.5,
  effectsVolume: 0.8,
  enginePitchMin: 1,
  enginePitchMax: 3,
  gearShifts: false,
  gearPace: 'medium',
};

/** Dos marchas: la primera llega al corte a 0,4 y la segunda a 1. */
const GEARBOX: GearboxConfig = { gearTopSpeeds: [0.4, 1], downshiftRpm: 0.5 };

const SOURCES: RaceSoundSources = {
  engine: 'engine.wav',
  light: 'light.wav',
  go: 'go.wav',
  kerb: 'kerb.wav',
  border: 'border.wav',
  lap: 'lap.wav',
  finish: 'finish.wav',
};

/** Sonido sobre un contexto del mock, con espías en lo que crea. */
function setup(mix = MIX, gearbox = GEARBOX) {
  const context = new AudioContext();
  const decode = jest.spyOn(context, 'decodeAudioData');
  const sources = jest.spyOn(context, 'createBufferSource');
  const gains = jest.spyOn(context, 'createGain');
  const audio = createRaceAudio({ sources: SOURCES, mix, gearbox, createContext: () => context });
  const created = () => sources.mock.results.map((result) => result.value);
  const createdGains = () => gains.mock.results.map((result) => result.value);
  // Las tres primeras ganancias: general, motor y efectos.
  const [master, engineGain, effectsGain] = createdGains();
  return { context, audio, decode, created, createdGains, master, engineGain, effectsGain };
}

describe('getEnginePitch / getEngineGain', () => {
  it('el tono va del mínimo al máximo con la velocidad y no se sale del rango', () => {
    expect(getEnginePitch(0, MIX)).toBe(1);
    expect(getEnginePitch(0.5, MIX)).toBe(2);
    expect(getEnginePitch(1, MIX)).toBe(3);
    expect(getEnginePitch(-1, MIX)).toBe(1);
    expect(getEnginePitch(2, MIX)).toBe(3);
  });

  it('en ralentí el motor suena más bajo que a fondo', () => {
    expect(getEngineGain(0, MIX)).toBeCloseTo(0.5 * ENGINE_IDLE_GAIN);
    expect(getEngineGain(1, MIX)).toBeCloseTo(0.5);
  });
});

describe('getSoundCue', () => {
  const lap = (n: number, total: number): RaceEvent => ({
    type: 'lapCompleted',
    tick: 0,
    lap: n,
    totalLaps: total,
    lapTicks: 100,
  });

  it('cada luz pita y la largada tiene su pitido', () => {
    expect(getSoundCue({ type: 'lightOn', tick: 0, light: 3 })).toEqual({
      sound: 'light',
      volume: 1,
    });
    expect(getSoundCue({ type: 'lightsOut', tick: 0 })).toEqual({ sound: 'go', volume: 1 });
  });

  it('las vueltas suenan, menos la última: ahí suena la llegada', () => {
    expect(getSoundCue(lap(1, 3))?.sound).toBe('lap');
    expect(getSoundCue(lap(2, 3))?.sound).toBe('lap');
    expect(getSoundCue(lap(3, 3))).toBeNull();
    const finish: RaceEvent = {
      type: 'finish',
      tick: 0,
      totalTicks: 300,
      lapTicks: [100, 100, 100],
      bestLapTicks: 100,
      bestLapIndex: 0,
      newRecord: false,
      previousRecordTicks: null,
    };
    expect(getSoundCue(finish)).toEqual({ sound: 'finish', volume: 1 });
  });

  it('el borde suena más fuerte cuanto más fuerte el golpe', () => {
    const soft = getSoundCue({ type: 'borderHit', tick: 0, impactSpeed: 1 })!;
    const hard = getSoundCue({ type: 'borderHit', tick: 0, impactSpeed: BORDER_FULL_IMPACT })!;
    expect(soft.sound).toBe('border');
    expect(soft.volume).toBeGreaterThanOrEqual(0.3);
    expect(soft.volume).toBeLessThan(hard.volume);
    expect(hard.volume).toBe(1);
  });

  it('el piano suena más fuerte cuanto más rápido se lo pisa', () => {
    const slow = getSoundCue({ type: 'kerbEnter', tick: 0, speed: 5 })!;
    const fast = getSoundCue({ type: 'kerbEnter', tick: 0, speed: KERB_FULL_SPEED * 2 })!;
    expect(slow.sound).toBe('kerb');
    expect(slow.volume).toBeLessThan(fast.volume);
    expect(fast.volume).toBe(1);
  });

  it('los cambios de estado y los récords no suenan', () => {
    expect(getSoundCue({ type: 'phase', tick: 0, from: 'grid', to: 'lights' })).toBeNull();
    expect(
      getSoundCue({ type: 'newRecord', tick: 0, lapTicks: 90, previousTicks: null }),
    ).toBeNull();
  });
});

describe('createRaceAudio', () => {
  it('trae los siete sonidos empaquetados', () => {
    expect(Object.keys(RACE_SOUND_SOURCES).sort()).toEqual(
      ['border', 'engine', 'finish', 'go', 'kerb', 'lap', 'light'].sort(),
    );
  });

  it('la mezcla por defecto deja el motor por debajo de los efectos, con cambios', () => {
    expect(DEFAULT_RACE_AUDIO_MIX.engineVolume).toBeLessThan(DEFAULT_RACE_AUDIO_MIX.effectsVolume);
    expect(DEFAULT_RACE_AUDIO_MIX.enginePitchMin).toBeLessThan(
      DEFAULT_RACE_AUDIO_MIX.enginePitchMax,
    );
    expect(DEFAULT_RACE_AUDIO_MIX.gearShifts).toBe(true);
  });

  it('a velocidad máxima el motor suena más grave que antes de los cambios (2,4)', () => {
    const top = DEFAULT_GEARBOX.gearTopSpeeds.at(-1)!;
    expect(getEnginePitch(1 / top, DEFAULT_RACE_AUDIO_MIX)).toBeCloseTo(1.99, 2);
  });

  it('al cargar decodifica todo y arranca el motor en loop, en ralentí', async () => {
    const { audio, decode, created } = setup();
    await audio.load();
    expect(decode.mock.calls.map(([source]) => source).sort()).toEqual(
      Object.values(SOURCES).sort(),
    );
    const [engine] = created();
    expect(engine.loop).toBe(true);
    expect(engine.playbackRate.value).toBe(1);
  });

  it('sin cambios de marcha, la velocidad sube el tono y el volumen del motor', async () => {
    const { audio, created, engineGain } = setup();
    await audio.load();
    audio.setEngineSpeed(1);
    expect(created()[0].playbackRate.value).toBe(3);
    expect(engineGain.gain.value).toBeCloseTo(0.5);
  });

  describe('con cambios de marcha', () => {
    const GEARS = { ...MIX, gearShifts: true };

    it('el tono sube dentro de cada marcha y cae al pasar a la siguiente', async () => {
      const { audio, created } = setup(GEARS);
      await audio.load();
      const pitch = () => created()[0].playbackRate.value;
      audio.setEngineSpeed(0.2); // primera, a media vuelta
      expect(pitch()).toBeCloseTo(2);
      audio.setEngineSpeed(0.39); // primera, casi en el corte
      expect(pitch()).toBeCloseTo(1 + 2 * (0.39 / 0.4));
      audio.setEngineSpeed(0.4); // segunda: las revoluciones caen a 0,4
      expect(pitch()).toBeCloseTo(1.8);
    });

    it('al subir, el tono cambia casi de golpe y el volumen hace un corte breve', async () => {
      const { audio, created, engineGain } = setup(GEARS);
      await audio.load();
      audio.setEngineSpeed(0.3);
      const rate = jest.spyOn(created()[0].playbackRate, 'setTargetAtTime');
      const gain = jest.spyOn(engineGain.gain, 'setTargetAtTime');
      audio.setEngineSpeed(0.45);
      const full = getEngineGain(0.45, GEARS);
      expect(rate).toHaveBeenLastCalledWith(expect.any(Number), 0, SHIFT_SMOOTHING);
      expect(gain.mock.calls).toEqual([
        [full * SHIFT_CUT_GAIN, 0, SHIFT_SMOOTHING],
        [full, SHIFT_CUT_SECONDS, expect.any(Number)],
      ]);
    });

    it('durante el corte, el volumen espera a que termine', async () => {
      const { audio, engineGain } = setup(GEARS);
      await audio.load();
      audio.setEngineSpeed(0.45); // sube a segunda
      const gain = jest.spyOn(engineGain.gain, 'setTargetAtTime');
      audio.setEngineSpeed(0.5);
      expect(gain).toHaveBeenLastCalledWith(
        expect.any(Number),
        SHIFT_CUT_SECONDS,
        expect.any(Number),
      );
    });

    it('sin cambiar de marcha, el motor sigue suave y sin cortes', async () => {
      const { audio, created, engineGain } = setup(GEARS);
      await audio.load();
      audio.setEngineSpeed(0.1);
      const rate = jest.spyOn(created()[0].playbackRate, 'setTargetAtTime');
      const gain = jest.spyOn(engineGain.gain, 'setTargetAtTime');
      audio.setEngineSpeed(0.2);
      expect(rate).toHaveBeenLastCalledWith(2, 0, ENGINE_SMOOTHING);
      expect(gain).toHaveBeenCalledTimes(1);
    });

    it('al bajar de marcha, el tono sube rápido y no hay corte', async () => {
      const { audio, created, engineGain } = setup(GEARS);
      await audio.load();
      audio.setEngineSpeed(0.9); // segunda
      const rate = jest.spyOn(created()[0].playbackRate, 'setTargetAtTime');
      const cancel = jest.spyOn(engineGain.gain, 'cancelScheduledValues');
      audio.setEngineSpeed(0.15); // primera, a 0,375 de revoluciones
      expect(rate).toHaveBeenLastCalledWith(1 + 2 * (0.15 / 0.4), 0, SHIFT_SMOOTHING);
      expect(cancel).not.toHaveBeenCalled();
    });

    it('apagarlos en caliente vuelve al tono por velocidad', async () => {
      const { audio, created } = setup(GEARS);
      await audio.load();
      audio.setEngineSpeed(0.45);
      audio.setMix({ ...GEARS, gearShifts: false });
      expect(created()[0].playbackRate.value).toBeCloseTo(1 + 2 * 0.45);
    });

    /** Sonido sin caja propia: usa la del ritmo de la mezcla. */
    async function withPace(pace: GearboxPace) {
      const context = new AudioContext();
      const sources = jest.spyOn(context, 'createBufferSource');
      const audio = createRaceAudio({
        sources: SOURCES,
        mix: { ...GEARS, gearPace: pace },
        createContext: () => context,
      });
      await audio.load();
      return { audio, pitch: () => sources.mock.results[0].value.playbackRate.value };
    }

    it('sin caja propia, usa las seis marchas del ritmo de la mezcla', async () => {
      const { audio, pitch } = await withPace('medium');
      audio.setEngineSpeed(1);
      const top = GEARBOXES.medium.gearTopSpeeds.at(-1)!;
      expect(pitch()).toBeCloseTo(1 + 2 / top);
    });

    it('el ritmo cambia los puntos de cambio, también en caliente', async () => {
      const speed = 0.24; // pasado el corte de primera de quick (0,2) y de medium (0,226)
      const quick = await withPace('quick');
      quick.audio.setEngineSpeed(speed);
      expect(quick.pitch()).toBeCloseTo(1 + 2 * (speed / GEARBOXES.quick.gearTopSpeeds[1]));

      const slow = await withPace('slow');
      slow.audio.setEngineSpeed(speed); // en slow sigue en primera (corte a 0,258)
      expect(slow.pitch()).toBeCloseTo(1 + 2 * (speed / GEARBOXES.slow.gearTopSpeeds[0]));

      slow.audio.setMix({ ...GEARS, gearPace: 'quick' });
      expect(slow.pitch()).toBeCloseTo(quick.pitch());
    });
  });

  it('cada efecto suena con su propio volumen', async () => {
    const { audio, created, createdGains } = setup();
    await audio.load();
    audio.play({ sound: 'border', volume: 0.4 });
    audio.play({ sound: 'lap', volume: 2 });
    const [, border, lap] = created();
    expect(border.loop).toBe(false);
    expect(lap.loop).toBe(false);
    // Una ganancia por efecto, después de las tres fijas; el volumen no pasa de 1.
    expect(
      createdGains()
        .slice(3)
        .map((gain) => gain.gain.value),
    ).toEqual([0.4, 1]);
  });

  it('antes de cargar, los efectos no hacen nada', () => {
    const { audio, created } = setup();
    audio.play({ sound: 'lap', volume: 1 });
    expect(created()).toHaveLength(0);
  });

  it('silenciar baja el volumen general sin detener el motor', async () => {
    const { audio, master } = setup();
    await audio.load();
    audio.setMuted(true);
    expect(master.gain.value).toBe(0);
    audio.setMuted(false);
    expect(master.gain.value).toBe(1);
  });

  it('la mezcla cambia los efectos y el tono en caliente', async () => {
    const { audio, created, effectsGain } = setup();
    await audio.load();
    audio.setMix({ ...MIX, effectsVolume: 0.2, enginePitchMin: 0.5 });
    expect(effectsGain.gain.value).toBe(0.2);
    expect(created()[0].playbackRate.value).toBe(0.5);
  });

  it('pausa y reanuda el contexto', async () => {
    const { audio, context } = setup();
    await audio.load();
    audio.suspend();
    expect(context.state).toBe('suspended');
    audio.resume();
    expect(context.state).toBe('running');
  });

  it('al cerrar detiene el motor y libera el contexto; después no suena nada', async () => {
    const { audio, context, created } = setup();
    await audio.load();
    const stop = jest.spyOn(created()[0], 'stop');
    audio.close();
    expect(stop).toHaveBeenCalled();
    expect(context.state).toBe('closed');
    audio.play({ sound: 'lap', volume: 1 });
    audio.resume();
    expect(created()).toHaveLength(1);
    expect(context.state).toBe('closed');
  });

  it('si se cierra mientras carga, el motor no arranca', async () => {
    const { audio, created } = setup();
    const loading = audio.load();
    audio.close();
    await loading;
    expect(created()).toHaveLength(0);
  });
});
