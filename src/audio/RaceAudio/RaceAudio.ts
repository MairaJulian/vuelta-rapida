import { AudioContext } from 'react-native-audio-api';
import type { AudioBuffer, AudioBufferSourceNode } from 'react-native-audio-api';

import { DEFAULT_GEARBOX_PACE, GEARBOXES, stepGearbox } from '@/audio/EngineGears';
import { clamp } from '@/core/MathUtils';
import type { RaceEvent } from '@/core/RaceFlow';
import type { CelebrationKind } from '@/core/Ranking';

import type {
  RaceAudio,
  RaceAudioMix,
  RaceAudioOptions,
  RaceSound,
  RaceSoundCue,
  RaceSoundSources,
} from './RaceAudio.types';

/**
 * Los sonidos empaquetados (`assets/sounds`, ver `CREDITOS.md` y
 * `scripts/generate-sounds.mjs`). Metro los incluye por el `require`.
 */
export const RACE_SOUND_SOURCES: RaceSoundSources = {
  engine: require('../../../assets/sounds/engine.wav'),
  light: require('../../../assets/sounds/light.wav'),
  go: require('../../../assets/sounds/go.wav'),
  kerb: require('../../../assets/sounds/kerb.wav'),
  border: require('../../../assets/sounds/border.wav'),
  lap: require('../../../assets/sounds/lap.wav'),
  finish: require('../../../assets/sounds/finish.wav'),
  personalBest: require('../../../assets/sounds/personal-best.wav'),
  overtake: require('../../../assets/sounds/overtake.wav'),
  trackRecord: require('../../../assets/sounds/track-record.wav'),
};

/**
 * Mezcla inicial: el motor bien por debajo de los efectos (al 50 % cansaba al
 * jugar) y con cambios de marcha. El tono va de 0,8 (detenido) a 2,2 en el corte; antes
 * de los cambios llegaba a 2,4 a velocidad máxima y en las rectas cansaba. Ahora, a
 * velocidad máxima, la sexta gira al 85 % y el motor suena a 2,0.
 */
export const DEFAULT_RACE_AUDIO_MIX: RaceAudioMix = Object.freeze({
  engineVolume: 0.25,
  effectsVolume: 0.9,
  enginePitchMin: 0.8,
  enginePitchMax: 2.2,
  gearShifts: true,
  gearPace: DEFAULT_GEARBOX_PACE,
});

/** Volumen del motor en ralentí, relativo al de velocidad máxima. */
export const ENGINE_IDLE_GAIN = 0.6;

/** Constante de tiempo con la que el motor sigue a la velocidad, en segundos. */
export const ENGINE_SMOOTHING = 0.06;

/**
 * Cambio de marcha: el tono salta a la marcha nueva con una constante de 15 ms (casi
 * de golpe) y, al subir, el volumen baja al 35 % durante 80 ms, como un corte de
 * encendido.
 */
export const SHIFT_SMOOTHING = 0.015;
export const SHIFT_CUT_SECONDS = 0.08;
export const SHIFT_CUT_GAIN = 0.35;

/** Velocidad (m/s) desde la que un piano suena a todo volumen. */
export const KERB_FULL_SPEED = 30;

/** Velocidad de impacto (m/s) desde la que un toque de borde suena a todo volumen. */
export const BORDER_FULL_IMPACT = 15;

/**
 * Tono del motor (velocidad de reproducción) para un valor de 0 a 1: las revoluciones
 * con cambios de marcha, o la velocidad sin cambios.
 */
export function getEnginePitch(ratio: number, mix: RaceAudioMix): number {
  const value = clamp(ratio, 0, 1);
  return mix.enginePitchMin + (mix.enginePitchMax - mix.enginePitchMin) * value;
}

/** Volumen del motor para una velocidad de 0 a 1: de ralentí a pleno. */
export function getEngineGain(speedRatio: number, mix: RaceAudioMix): number {
  const ratio = clamp(speedRatio, 0, 1);
  return mix.engineVolume * (ENGINE_IDLE_GAIN + (1 - ENGINE_IDLE_GAIN) * ratio);
}

/** Volumen que crece con `value` desde `floor` (en 0) hasta 1 (en `full` o más). */
function scaledVolume(value: number, full: number, floor: number): number {
  return floor + (1 - floor) * clamp(value / full, 0, 1);
}

/** El sonido de cada celebración del ranking. */
const CELEBRATION_SOUNDS: Record<CelebrationKind, RaceSound> = {
  trackRecord: 'trackRecord',
  overtake: 'overtake',
  personalBest: 'personalBest',
};

/**
 * Qué suena con cada evento de la carrera; `null` si ninguno. La última vuelta no
 * suena como vuelta: suena la llegada.
 */
export function getSoundCue(event: RaceEvent): RaceSoundCue | null {
  switch (event.type) {
    case 'lightOn':
      return { sound: 'light', volume: 1 };
    case 'lightsOut':
      return { sound: 'go', volume: 1 };
    case 'kerbEnter':
      return { sound: 'kerb', volume: scaledVolume(event.speed, KERB_FULL_SPEED, 0.4) };
    case 'borderHit':
      return {
        sound: 'border',
        volume: scaledVolume(event.impactSpeed, BORDER_FULL_IMPACT, 0.3),
      };
    case 'lapCompleted':
      return event.lap < event.totalLaps ? { sound: 'lap', volume: 1 } : null;
    case 'finish':
      return { sound: 'finish', volume: 1 };
    case 'celebration':
      return { sound: CELEBRATION_SOUNDS[event.kind], volume: 1 };
    default:
      return null;
  }
}

const SOUNDS: RaceSound[] = [
  'light',
  'go',
  'kerb',
  'border',
  'lap',
  'finish',
  'personalBest',
  'overtake',
  'trackRecord',
];

/**
 * Arma el sonido de una carrera con react-native-audio-api: el motor en loop con
 * su tono según la marcha y las revoluciones (o la velocidad, sin cambios), los
 * efectos sueltos y un volumen general para silenciar. Hay que llamar a `load()`
 * antes de que suene algo.
 */
export function createRaceAudio({
  sources,
  mix: initialMix,
  gearbox,
  createContext = () => new AudioContext(),
}: RaceAudioOptions): RaceAudio {
  const context = createContext();
  const master = context.createGain();
  const engineGain = context.createGain();
  const effectsGain = context.createGain();
  master.connect(context.destination);
  engineGain.connect(master);
  effectsGain.connect(master);

  let mix = initialMix;
  let speedRatio = 0;
  let gear = 0;
  // Hasta cuándo dura el corte del último cambio: el volumen vuelve recién ahí.
  let cutUntil = 0;
  let closed = false;
  let engine: AudioBufferSourceNode | null = null;
  const buffers = new Map<RaceSound, AudioBuffer>();

  engineGain.gain.value = getEngineGain(0, mix);
  effectsGain.gain.value = mix.effectsVolume;

  /** Revoluciones (o velocidad, sin cambios) que dan el tono, y si cambió de marcha. */
  const engineState = () => {
    if (!mix.gearShifts) {
      gear = 0;
      return { rpm: speedRatio, shift: null };
    }
    // El ritmo se puede cambiar en caliente desde el panel: la caja sale de la mezcla.
    const step = stepGearbox(gear, speedRatio, gearbox ?? GEARBOXES[mix.gearPace]);
    gear = step.gear;
    return step;
  };

  const applyEngine = () => {
    const now = context.currentTime;
    const { rpm, shift } = engineState();
    const gain = getEngineGain(speedRatio, mix);
    engine?.playbackRate.setTargetAtTime(
      getEnginePitch(rpm, mix),
      now,
      shift ? SHIFT_SMOOTHING : ENGINE_SMOOTHING,
    );
    if (shift === 'up') {
      // Corte de encendido: el volumen baja un instante y vuelve.
      engineGain.gain.cancelScheduledValues(now);
      engineGain.gain.setTargetAtTime(gain * SHIFT_CUT_GAIN, now, SHIFT_SMOOTHING);
      cutUntil = now + SHIFT_CUT_SECONDS;
    }
    engineGain.gain.setTargetAtTime(gain, Math.max(now, cutUntil), ENGINE_SMOOTHING);
  };

  // El audio nunca tiene que romper el juego: un error queda en silencio.
  const quietly = (promise: Promise<void>) => {
    promise.catch(() => undefined);
  };

  return {
    async load() {
      const [engineBuffer, ...effects] = await Promise.all([
        context.decodeAudioData(sources.engine),
        ...SOUNDS.map((sound) => context.decodeAudioData(sources[sound])),
      ]);
      if (closed) {
        return;
      }
      SOUNDS.forEach((sound, i) => buffers.set(sound, effects[i]));
      const source = context.createBufferSource();
      source.buffer = engineBuffer;
      source.loop = true;
      source.playbackRate.value = getEnginePitch(engineState().rpm, mix);
      source.connect(engineGain);
      source.start();
      engine = source;
    },

    setEngineSpeed(ratio) {
      if (closed) {
        return;
      }
      speedRatio = ratio;
      applyEngine();
    },

    play({ sound, volume }) {
      const buffer = buffers.get(sound);
      if (closed || !buffer) {
        return;
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = clamp(volume, 0, 1);
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(effectsGain);
      source.onEnded = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    },

    setMix(next) {
      if (closed) {
        return;
      }
      mix = next;
      effectsGain.gain.value = mix.effectsVolume;
      applyEngine();
    },

    setMuted(muted) {
      if (!closed) {
        master.gain.value = muted ? 0 : 1;
      }
    },

    suspend() {
      if (!closed) {
        quietly(context.suspend());
      }
    },

    resume() {
      if (!closed) {
        quietly(context.resume());
      }
    },

    close() {
      if (closed) {
        return;
      }
      closed = true;
      engine?.stop();
      engine = null;
      quietly(context.close());
    },
  };
}
