import { DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';

import {
  DEFAULT_GEARBOX,
  DEFAULT_GEARBOX_PACE,
  GEARBOX_PACES,
  GEARBOXES,
  getGearRpm,
  stepGearbox,
} from './EngineGears';
import type { GearboxConfig } from './EngineGears.types';

const BOX: GearboxConfig = { gearTopSpeeds: [0.25, 0.5, 1.25], downshiftRpm: 0.6 };

/** Pasa la caja por una serie de velocidades y devuelve cada paso. */
function drive(speeds: number[], config = BOX) {
  let gear = 0;
  return speeds.map((speed) => {
    const step = stepGearbox(gear, speed, config);
    gear = step.gear;
    return step;
  });
}

/** Segundos de cada subida acelerando desde 0, con la física por defecto del auto (60 Hz). */
function upshiftTimes(config: GearboxConfig): number[] {
  const { acceleration, drag, maxSpeed } = DEFAULT_DRIVING_CONFIG;
  let speed = 0;
  let gear = 0;
  const times: number[] = [];
  for (let tick = 1; tick <= 6 * 60; tick += 1) {
    speed = Math.min(speed + (acceleration - drag * speed) / 60, maxSpeed);
    const step = stepGearbox(gear, speed / maxSpeed, config);
    if (step.shift === 'up') {
      times.push(tick / 60);
    }
    gear = step.gear;
  }
  return times;
}

describe('GEARBOXES', () => {
  it('cada ritmo tiene seis marchas, cada una más larga que la anterior', () => {
    GEARBOX_PACES.forEach((pace) => {
      const tops = GEARBOXES[pace].gearTopSpeeds;
      expect(tops).toHaveLength(6);
      tops.slice(1).forEach((top, i) => expect(top).toBeGreaterThan(tops[i]));
    });
  });

  it('a velocidad máxima va en sexta, por debajo del corte', () => {
    GEARBOX_PACES.forEach((pace) => {
      const step = stepGearbox(5, 1, GEARBOXES[pace]);
      expect(step.gear).toBe(5);
      expect(step.rpm).toBeCloseTo(0.85, 2);
    });
  });

  it.each([
    ['quick', 2.4],
    ['medium', 3],
    ['slow', 3.5],
  ] as const)('acelerando con el auto de verdad, %s llega a sexta a los %s s', (pace, seconds) => {
    const times = upshiftTimes(GEARBOXES[pace]);
    expect(times).toHaveLength(5);
    expect(times[4]).toBeCloseTo(seconds, 1);
    // Nunca dos cambios a menos de 0,3 s.
    const gaps = times.map((time, i) => time - (times[i - 1] ?? 0));
    expect(Math.min(...gaps)).toBeGreaterThan(0.3);
  });

  it('el ritmo por defecto llega a sexta a los 3,5 s', () => {
    expect(DEFAULT_GEARBOX_PACE).toBe('slow');
    expect(DEFAULT_GEARBOX).toBe(GEARBOXES.slow);
  });

  it('cuanto más lento el ritmo, más tarde el primer cambio', () => {
    const [quick, medium, slow] = GEARBOX_PACES.map((pace) => upshiftTimes(GEARBOXES[pace])[0]);
    expect(quick).toBeLessThan(medium);
    expect(medium).toBeLessThan(slow);
  });
});

describe('getGearRpm', () => {
  it('va de 0 detenido a 1 en el corte de la marcha', () => {
    expect(getGearRpm(0, 0, BOX)).toBe(0);
    expect(getGearRpm(0.125, 0, BOX)).toBeCloseTo(0.5);
    expect(getGearRpm(0.25, 0, BOX)).toBe(1);
    expect(getGearRpm(0.9, 0, BOX)).toBe(1);
  });
});

describe('stepGearbox', () => {
  it('sube al llegar al corte y las revoluciones caen', () => {
    const [before, after] = drive([0.24, 0.25]);
    expect(before).toMatchObject({ gear: 0, shift: null });
    expect(before.rpm).toBeCloseTo(0.96);
    expect(after).toMatchObject({ gear: 1, shift: 'up' });
    expect(after.rpm).toBeCloseTo(0.5);
  });

  it('acelerando de 0 a la máxima pasa por todas las marchas, de a una', () => {
    const steps = drive([0, 0.1, 0.3, 0.45, 0.6, 0.9, 1]);
    expect(steps.map((step) => step.gear)).toEqual([0, 0, 1, 1, 2, 2, 2]);
    expect(steps.filter((step) => step.shift === 'up')).toHaveLength(2);
  });

  it('frenando, baja recién cuando la marcha de abajo quedaría con pocas revoluciones', () => {
    // En tercera: baja a segunda por debajo de 0,6 × 0,5 = 0,3.
    expect(stepGearbox(2, 0.35, BOX)).toMatchObject({ gear: 2, shift: null });
    expect(stepGearbox(2, 0.29, BOX)).toMatchObject({ gear: 1, shift: 'down' });
  });

  it('no va y viene alrededor del punto de cambio', () => {
    const steps = drive([0.26, 0.24, 0.26, 0.2, 0.26]);
    expect(steps.map((step) => step.gear)).toEqual([1, 1, 1, 1, 1]);
    expect(steps.filter((step) => step.shift !== null)).toHaveLength(1);
  });

  it('si la velocidad cae de golpe, salta varias marchas en un paso', () => {
    expect(stepGearbox(2, 0, BOX)).toEqual({ gear: 0, rpm: 0, shift: 'down' });
  });

  it('tolera marchas y velocidades fuera de rango', () => {
    expect(stepGearbox(9, 1, BOX).gear).toBe(2);
    expect(stepGearbox(-3, 0, BOX)).toEqual({ gear: 0, rpm: 0, shift: null });
    expect(stepGearbox(0, 2, BOX)).toMatchObject({ gear: 2, shift: 'up' });
  });
});
