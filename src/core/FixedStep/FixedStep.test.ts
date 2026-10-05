import { consumeFrameTime, DEFAULT_FIXED_STEP_CONFIG, getStepAlpha, getStepMs } from './FixedStep';

const config = DEFAULT_FIXED_STEP_CONFIG;

function totalSteps(frames: number[]) {
  let accumulatorMs = 0;
  let steps = 0;
  for (const frameMs of frames) {
    const result = consumeFrameTime(accumulatorMs, frameMs, config);
    accumulatorMs = result.accumulatorMs;
    steps += result.steps;
  }
  return { steps, accumulatorMs };
}

describe('FixedStep', () => {
  it('un paso dura 1000 / stepHz ms', () => {
    expect(getStepMs(config)).toBeCloseTo(16.6667, 4);
  });

  it('60 cuadros a 60 Hz dan exactamente 60 pasos', () => {
    const { steps, accumulatorMs } = totalSteps(Array(60).fill(1000 / 60));
    expect(steps).toBe(60);
    expect(accumulatorMs).toBeLessThan(1e-3);
  });

  it('90 cuadros a 90 Hz dan exactamente 60 pasos', () => {
    expect(totalSteps(Array(90).fill(1000 / 90)).steps).toBe(60);
  });

  it('120 cuadros a 120 Hz dan exactamente 60 pasos', () => {
    expect(totalSteps(Array(120).fill(1000 / 120)).steps).toBe(60);
  });

  it('acumula cuadros cortos hasta completar un paso', () => {
    const first = consumeFrameTime(0, 10, config);
    expect(first.steps).toBe(0);
    const second = consumeFrameTime(first.accumulatorMs, 10, config);
    expect(second.steps).toBe(1);
    expect(second.accumulatorMs).toBeCloseTo(20 - 1000 / 60, 9);
  });

  it('limita un cuadro enorme a maxFrameMs', () => {
    // 100 ms a 60 Hz son 6 pasos, no los 300 que corresponderían a 5 s.
    const { steps } = consumeFrameTime(0, 5000, config);
    expect(steps).toBe(6);
  });

  it('ignora cuadros nulos, negativos o no finitos', () => {
    expect(consumeFrameTime(5, 0, config)).toEqual({ steps: 0, accumulatorMs: 5 });
    expect(consumeFrameTime(5, -10, config)).toEqual({ steps: 0, accumulatorMs: 5 });
    expect(consumeFrameTime(5, Number.NaN, config)).toEqual({ steps: 0, accumulatorMs: 5 });
  });

  it('alpha va de 0 a casi 1 según el tiempo acumulado', () => {
    expect(getStepAlpha(0, config)).toBe(0);
    expect(getStepAlpha(getStepMs(config) / 2, config)).toBeCloseTo(0.5, 9);
    expect(getStepAlpha(getStepMs(config), config)).toBeLessThan(1);
  });
});
