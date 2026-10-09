import { createRandomState, nextRandom, nextRandomBetween } from './SeededRandom';

function sequence(seed: number, count: number): number[] {
  let state = createRandomState(seed);
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const result = nextRandom(state);
    values.push(result.value);
    state = result.state;
  }
  return values;
}

describe('SeededRandom', () => {
  it('la misma semilla da la misma secuencia', () => {
    expect(sequence(1234, 50)).toEqual(sequence(1234, 50));
  });

  it('semillas distintas dan secuencias distintas', () => {
    expect(sequence(1, 10)).not.toEqual(sequence(2, 10));
  });

  it('los valores quedan en [0, 1) y se reparten parejo', () => {
    const values = sequence(99, 10000);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
    // Cada décimo del rango recibe entre el 9 % y el 11 % de los valores.
    const buckets = Array(10).fill(0);
    values.forEach((value) => {
      buckets[Math.floor(value * 10)] += 1;
    });
    buckets.forEach((count) => {
      expect(count).toBeGreaterThan(900);
      expect(count).toBeLessThan(1100);
    });
  });

  it('acepta semillas grandes, negativas, con decimales o inválidas', () => {
    expect(createRandomState(2 ** 40 + 5)).toBe(5);
    expect(createRandomState(-1)).toBe(4294967295);
    expect(createRandomState(3.9)).toBe(3);
    expect(createRandomState(Number.NaN)).toBe(0);
    expect(nextRandom(createRandomState(Number.NaN)).value).toBeGreaterThanOrEqual(0);
  });

  it('nextRandomBetween escala al rango pedido', () => {
    let state = createRandomState(7);
    for (let i = 0; i < 1000; i += 1) {
      const result = nextRandomBetween(state, 0.5, 1.5);
      expect(result.value).toBeGreaterThanOrEqual(0.5);
      expect(result.value).toBeLessThan(1.5);
      state = result.state;
    }
  });

  it('el estado es un número serializable', () => {
    const { state } = nextRandom(createRandomState(42));
    expect(JSON.parse(JSON.stringify(state))).toBe(state);
  });
});
