import {
  createLapState,
  formatGapSeconds,
  formatLapDelta,
  formatLapTime,
  getCurrentLap,
  getCurrentLapTicks,
  MAX_PROGRESS_STEP,
  stepLapTimer,
  ticksToMs,
} from './LapTimer';
import type { LapState } from './LapTimer.types';

/** Vuelta de 900 m con puntos de control en 300 y 600 m. */
const gates = { length: 900, checkpoints: [300, 600] };

/**
 * Progresos de los pasos siguientes a `start`: recorren `distance` metros en pasos
 * de `step` (con signo). No incluye `start`, así cada tramo sigue al anterior.
 */
function path(start: number, distance: number, step: number): number[] {
  const count = Math.round(Math.abs(distance / step));
  return Array.from({ length: count }, (_, k) => (((start + (k + 1) * step) % 900) + 900) % 900);
}

/** Procesa los progresos en pasos seguidos, a partir del paso siguiente al del estado. */
function drive(progresses: number[], state: LapState = createLapState()): LapState {
  return progresses.reduce(
    (current, progress, i) => stepLapTimer(current, progress, gates, state.tick + i + 1),
    state,
  );
}

describe('stepLapTimer', () => {
  it('la primera lectura solo guarda el progreso', () => {
    const state = stepLapTimer(createLapState(), 880, gates, 1);
    expect(state).toEqual({ ...createLapState(), tick: 1, progress: 880 });
  });

  it('la vuelta 1 empieza al cruzar la meta hacia adelante', () => {
    // 880, 885, 890, 895 y 0: la meta se cruza en el quinto paso.
    const state = drive([880, ...path(880, 20, 5)]);
    expect(state.tick).toBe(5);
    expect(state.lapStartTick).toBe(5);
    expect(getCurrentLap(state)).toBe(1);
    expect(getCurrentLapTicks(state)).toBe(0);
  });

  it('una vuelta con los puntos de control en orden dura exactamente los pasos entre cruces', () => {
    // Largada 20 m antes de la meta y una vuelta entera a 5 m por paso: 180 pasos.
    const state = drive([880, ...path(880, 920, 5)]);
    expect(state.lapTicks).toEqual([180]);
    expect(state.bestLapTicks).toBe(180);
    expect(getCurrentLap(state)).toBe(2);
    expect(ticksToMs(state.lapTicks[0], 60)).toBe(3000);
  });

  it('el tiempo no depende del tamaño de los pasos, solo de cuándo se cruza la meta', () => {
    // A 3 m por paso, la meta se cruza en los pasos 8 (de 898 a 1) y 308 (de 898 a 1).
    const state = drive([880, ...path(880, 1200, 3)]);
    expect(state.lapTicks).toEqual([300]);
  });

  it('cruzar la meta hacia atrás y hacia adelante no suma una vuelta', () => {
    let state = drive([880, ...path(880, 30, 5)]); // larga y sigue hasta 10 m
    const started = state.lapStartTick;
    state = drive(path(10, -20, -5), state); // vuelve a 890: deshace la largada
    expect(getCurrentLap(state)).toBe(0);
    expect(state.lapStartTick).toBeNull();
    state = drive(path(890, 30, 5), state); // cruza otra vez
    expect(getCurrentLap(state)).toBe(1);
    expect(state.lapTicks).toEqual([]);
    expect(state.lapStartTick).toBeGreaterThan(started!);
  });

  it('volver sobre la meta después de completar una vuelta la deshace, sin contarla dos veces', () => {
    let state = drive([880, ...path(880, 930, 5)]); // una vuelta y 10 m más
    expect(state.lapTicks).toEqual([180]);
    state = drive(path(10, -20, -5), state); // cruza la meta hacia atrás
    expect(state.lapTicks).toEqual([]);
    expect(state.bestLapTicks).toBeNull();
    expect(getCurrentLap(state)).toBe(1);
    state = drive(path(890, 20, 5), state); // y otra vez hacia adelante
    // Una sola vuelta, que ahora incluye los 8 pasos de ida y vuelta.
    expect(state.lapTicks).toEqual([188]);
    expect(getCurrentLap(state)).toBe(2);
  });

  it('saltear un punto de control impide completar la vuelta', () => {
    // Avanza hasta 290 m, salta a 320 m (un atajo: más de MAX_PROGRESS_STEP) y sigue.
    let state = drive([880, ...path(880, 310, 5)]);
    expect(state.progress).toBe(290);
    state = drive([320], state);
    state = drive(path(320, 600, 5), state); // pasa 600 y cruza la meta en 0
    expect(state.lapTicks).toEqual([]);
    expect(getCurrentLap(state)).toBe(1);
    expect(MAX_PROGRESS_STEP).toBeLessThan(30);
  });

  it('cruzar un punto de control hacia atrás lo deshace: hay que volver a pasarlo', () => {
    let state = drive([880, ...path(880, 330, 5)]); // pasa el punto de control de 300 m
    state = drive(path(310, -20, -5), state); // vuelve a 290 m
    // Salta por encima del punto de control: no cuenta.
    state = drive([320], state);
    state = drive(path(320, 580, 5), state); // llega a la meta
    expect(state.lapTicks).toEqual([]);
  });

  it('un salto grande no cruza la meta', () => {
    const state = drive([895, 50]);
    expect(getCurrentLap(state)).toBe(0);
    expect(state.progress).toBe(50);
  });

  it('guarda cada vuelta y la mejor', () => {
    let state = drive([880, ...path(880, 920, 5)]); // vuelta 1: 180 pasos
    state = drive(path(0, 900, 10), state); // vuelta 2: 90 pasos
    state = drive(path(0, 900, 6), state); // vuelta 3: 150 pasos
    expect(state.lapTicks).toEqual([180, 90, 150]);
    expect(state.bestLapTicks).toBe(90);
    expect(getCurrentLap(state)).toBe(4);
  });

  it('cuenta el tiempo de la vuelta en curso', () => {
    const state = drive([880, ...path(880, 120, 5)]); // larga en el paso 5 y sigue hasta el 25
    expect(getCurrentLapTicks(state)).toBe(20);
  });

  it('es determinista y serializable', () => {
    const run = () => drive([880, ...path(880, 2000, 7)]);
    const state = run();
    expect(run()).toEqual(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('getCurrentLap y getCurrentLapTicks', () => {
  it('antes de largar, vuelta 0 y tiempo 0', () => {
    expect(getCurrentLap(createLapState())).toBe(0);
    expect(getCurrentLapTicks({ ...createLapState(), tick: 500 })).toBe(0);
  });
});

describe('ticksToMs y formatLapTime', () => {
  it('convierte pasos de 60 Hz a milisegundos', () => {
    expect(ticksToMs(60, 60)).toBe(1000);
    expect(ticksToMs(4349, 60)).toBeCloseTo(72483.333, 3);
  });

  it('muestra m:ss.mmm como el handoff', () => {
    expect(formatLapTime(72480)).toBe('1:12.480');
    expect(formatLapTime(64318)).toBe('1:04.318');
    expect(formatLapTime(5007)).toBe('0:05.007');
    expect(formatLapTime(59999.6)).toBe('1:00.000');
  });

  it('valores inválidos se muestran como 0:00.000', () => {
    expect(formatLapTime(0)).toBe('0:00.000');
    expect(formatLapTime(-5)).toBe('0:00.000');
    expect(formatLapTime(Number.NaN)).toBe('0:00.000');
  });
});

describe('formatGapSeconds', () => {
  it('da segundos con dos decimales', () => {
    expect(formatGapSeconds(420)).toBe('0.42');
    expect(formatGapSeconds(1234)).toBe('1.24');
    expect(formatGapSeconds(61000)).toBe('61.00');
  });

  it('redondea para arriba: con diferencia, nunca 0.00', () => {
    expect(formatGapSeconds(4)).toBe('0.01');
    expect(formatGapSeconds(0)).toBe('0.00');
  });

  it('tolera valores inválidos', () => {
    expect(formatGapSeconds(-5)).toBe('0.00');
    expect(formatGapSeconds(Number.NaN)).toBe('0.00');
  });
});

describe('formatLapDelta', () => {
  it('siempre lleva signo, con el menos tipográfico', () => {
    expect(formatLapDelta(-578)).toBe('−' + '0.578');
    expect(formatLapDelta(236)).toBe('+0.236');
    expect(formatLapDelta(1312.4)).toBe('+1.312');
    expect(formatLapDelta(0)).toBe('±0.000');
  });

  it('desde un minuto muestra los minutos', () => {
    expect(formatLapDelta(62345)).toBe('+1:02.345');
    expect(formatLapDelta(-60000)).toBe('−' + '1:00.000');
  });

  it('un valor inválido cuenta como 0', () => {
    expect(formatLapDelta(Number.NaN)).toBe('±0.000');
  });
});
