import { CIRCUITS } from '@/core/Circuits';
import { createCarState, DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import {
  getGridOffset,
  getGridPose,
  getGridProgress,
  GRID_ROW_GAP,
  GRID_STAGGER,
} from '@/core/Track';
import type { Circuit } from '@/core/Track';

import {
  AI_LEVEL_IDS,
  AI_LEVELS,
  buildSpeedProfile,
  createRival,
  createRivalRoster,
  getTrafficCar,
  MAX_RIVALS,
  RIVAL_COUNT,
  stepRival,
  withDynamicDifficulty,
} from './RivalAI';
import type { AiLevel, RivalState, TrafficCar } from './RivalAI.types';

// Cada prueba corre una carrera entera de hasta 10 autos que se ven entre sí: con la máquina cargada pasa los 5 s por defecto.
jest.setTimeout(30000);

const STEP_HZ = 60;
const DT = 1 / STEP_HZ;
const LEVEL = AI_LEVELS.easy;
const COAST_CONFIG = { ...DEFAULT_DRIVING_CONFIG, acceleration: 0 };
const LAPS = 2;
/** Tope de la prueba: 4 minutos por vuelta de sobra. */
const MAX_TICKS = LAPS * 240 * STEP_HZ;

/** Los rivales en la grilla, con semillas distintas. */
function startRivals(
  circuit: Circuit,
  seed: number,
  level: AiLevel = LEVEL,
  count: number = RIVAL_COUNT,
): RivalState[] {
  return Array.from({ length: count }, (_, slot) => {
    const pose = getGridPose(circuit, slot);
    return createRival({
      id: `rival-${slot + 1}`,
      car: createCarState(pose.x, pose.z, pose.heading),
      startProgress: getGridProgress(circuit, slot),
      startOffset: getGridOffset(circuit, slot),
      seed: seed + slot * 101,
      level,
    });
  });
}

describe('IA de los rivales', () => {
  describe.each(AI_LEVEL_IDS.map((id) => [id, AI_LEVELS[id]] as const))(
    'nivel %s',
    (_id, level) => {
      describe.each(CIRCUITS.map((circuit) => [circuit.name, circuit] as const))(
        '%s',
        (_name, circuit) => {
          const profile = buildSpeedProfile(circuit, DEFAULT_DRIVING_CONFIG, level);

          it('la velocidad objetivo queda entre el mínimo y el tope del auto', () => {
            expect(profile).toHaveLength(circuit.centerline.length);
            for (const speed of profile) {
              expect(speed).toBeGreaterThan(0);
              expect(speed).toBeLessThanOrEqual(DEFAULT_DRIVING_CONFIG.maxSpeed);
            }
          });

          it.each([1, 2, 3])(
            'con la semilla %i, el jugador muy adelante (ritmo máximo) y la grilla llena, nunca toca el borde y completa la carrera',
            (seed) => {
              let rivals = startRivals(circuit, seed, level, MAX_RIVALS);
              const rules = { totalLaps: LAPS, finishBrake: 0.5 };
              let touches = 0;
              let tick = 0;
              while (tick < MAX_TICKS && rivals.some((rival) => rival.finishTick === null)) {
                const traffic = rivals.map((rival) =>
                  getTrafficCar(rival.sim, circuit, circuit.length),
                );
                rivals = rivals.map((rival, index) =>
                  stepRival(
                    rival,
                    circuit,
                    profile,
                    DEFAULT_DRIVING_CONFIG,
                    COAST_CONFIG,
                    rules,
                    DT,
                    1e9,
                    traffic,
                    index,
                  ),
                );
                touches += rivals.filter((rival) => rival.sim.contact.touching).length;
                tick += 1;
              }
              expect(touches).toBe(0);
              expect(rivals.every((rival) => rival.finishTick !== null)).toBe(true);
            },
          );
        },
      );
    },
  );

  it('los niveles van de menos a más exigentes', () => {
    const paces = AI_LEVEL_IDS.map((id) => AI_LEVELS[id].paceMax);
    expect(paces).toEqual([...paces].sort((a, b) => a - b));
  });

  describe('withDynamicDifficulty', () => {
    it('activada deja el nivel como está', () => {
      expect(withDynamicDifficulty(AI_LEVELS.medium, true)).toBe(AI_LEVELS.medium);
    });

    it('desactivada quita el ajuste de ritmo y no toca el resto', () => {
      const level = withDynamicDifficulty(AI_LEVELS.medium, false);
      expect(level.catchUpBoost).toBe(0);
      expect(level.catchUpEase).toBe(0);
      expect(level).toEqual({ ...AI_LEVELS.medium, catchUpBoost: 0, catchUpEase: 0 });
    });

    it('sin ajuste, un rival no cambia de ritmo con la distancia al jugador', () => {
      const circuit = CIRCUITS[0];
      const level = withDynamicDifficulty(AI_LEVELS.medium, false);
      const profile = buildSpeedProfile(circuit, DEFAULT_DRIVING_CONFIG, level);
      const run = (playerDistance: number) => {
        let rival = startRivals(circuit, 5, level, 1)[0];
        const rules = { totalLaps: LAPS, finishBrake: 0.5 };
        for (let tick = 0; tick < 900; tick += 1) {
          rival = stepRival(
            rival,
            circuit,
            profile,
            DEFAULT_DRIVING_CONFIG,
            COAST_CONFIG,
            rules,
            DT,
            playerDistance,
          );
        }
        return rival.sim.car;
      };
      expect(run(1e9)).toEqual(run(-1e9));
    });
  });

  describe('con otros autos a la vista', () => {
    const circuit = CIRCUITS[0];
    const rules = { totalLaps: 3, finishBrake: 0.5 };
    /** Un rival ya lanzado: sale de la grilla y corre solo hasta ir a más de 25 m/s en recta. */
    function launched(level: AiLevel) {
      const profile = buildSpeedProfile(circuit, DEFAULT_DRIVING_CONFIG, level);
      let rival = startRivals(circuit, 11, level, 1)[0];
      let tick = 0;
      while (tick < 3000 && getTrafficCar(rival.sim, circuit, circuit.length).speed < 25) {
        rival = stepRival(
          rival,
          circuit,
          profile,
          DEFAULT_DRIVING_CONFIG,
          COAST_CONFIG,
          rules,
          DT,
          0,
        );
        tick += 1;
      }
      return { rival, profile };
    }
    /** Un auto de mentira que avanza por la trazada a velocidad constante y a un desvío fijo. */
    function other(from: TrafficCar, gap: number, lateral: number, speed: number): TrafficCar {
      return { distance: from.distance + gap, lateral, speed };
    }
    function step(
      rival: RivalState,
      profile: number[],
      car: TrafficCar,
    ): { rival: RivalState; car: TrafficCar } {
      const me = getTrafficCar(rival.sim, circuit, circuit.length);
      const next = stepRival(
        rival,
        circuit,
        profile,
        DEFAULT_DRIVING_CONFIG,
        COAST_CONFIG,
        rules,
        DT,
        0,
        [car, me],
        1,
      );
      return { rival: next, car: { ...car, distance: car.distance + car.speed * DT } };
    }

    it('sin traffic no maniobra: corre como antes', () => {
      const { rival } = launched(AI_LEVELS.hard);
      expect(rival.driver.tactic).toBe('none');
    });

    it.each(['easy', 'medium', 'hard'] as const)(
      'nivel %s: si el de adelante es lento y estorba, lo pasa por un costado sin tocarlo',
      (id) => {
        const level = AI_LEVELS[id];
        let { rival, profile } = launched(level);
        const me = getTrafficCar(rival.sim, circuit, circuit.length);
        let car = other(me, 30, me.lateral, 20);
        let passed = false;
        let closest = Infinity;
        for (let tick = 0; tick < 60 * 12; tick += 1) {
          const next = step(rival, profile, car);
          rival = next.rival;
          car = next.car;
          const mine = getTrafficCar(rival.sim, circuit, circuit.length);
          const along = car.distance - mine.distance;
          passed = passed || along < -5;
          if (Math.abs(along) < 5) {
            closest = Math.min(closest, Math.abs(car.lateral - mine.lateral));
          }
        }
        expect(passed).toBe(true);
        // Los autos miden 2,6 m: en fácil y medio nunca se tocan al ir en paralelo; en difícil, a lo sumo un roce.
        expect(closest).toBeGreaterThan(id === 'hard' ? 1.8 : 2.6);
      },
    );

    it('sin lugar para pasar se queda detrás del lento, sin tocarlo', () => {
      const { rival: start, profile } = launched(AI_LEVELS.medium);
      let rival = start;
      const me = getTrafficCar(rival.sim, circuit, circuit.length);
      // Tres autos lentos en fila a lo ancho: no hay carril libre para pasar.
      let car = other(me, 25, me.lateral, 15);
      let right = other(me, 25, me.lateral + 3.2, 15);
      let left = other(me, 25, me.lateral - 3.2, 15);
      let minGap = Infinity;
      for (let tick = 0; tick < 60 * 6; tick += 1) {
        const mine = getTrafficCar(rival.sim, circuit, circuit.length);
        rival = stepRival(
          rival,
          circuit,
          profile,
          DEFAULT_DRIVING_CONFIG,
          COAST_CONFIG,
          rules,
          DT,
          0,
          [car, right, left, mine],
          3,
        );
        car = { ...car, distance: car.distance + car.speed * DT };
        right = { ...right, distance: right.distance + right.speed * DT };
        left = { ...left, distance: left.distance + left.speed * DT };
        minGap = Math.min(
          minGap,
          car.distance - getTrafficCar(rival.sim, circuit, circuit.length).distance,
        );
      }
      expect(minGap).toBeGreaterThan(2.6);
    });

    it('defiende: se corre hacia la línea del que lo ataca; más cuanto más alto el nivel', () => {
      const goals = (['easy', 'medium', 'hard'] as const).map((id) => {
        const { rival, profile } = launched(AI_LEVELS[id]);
        const me = getTrafficCar(rival.sim, circuit, circuit.length);
        const attacker = other(me, -15, me.lateral + 3, me.speed + 2);
        const { rival: next } = step(rival, profile, attacker);
        return { tactic: next.driver.tactic, shift: next.driver.tacticGoal - me.lateral };
      });
      expect(goals.every((goal) => goal.tactic === 'defend')).toBe(true);
      expect(goals[0].shift).toBeGreaterThan(0);
      expect(goals[1].shift).toBeGreaterThan(goals[0].shift);
      expect(goals[2].shift).toBeGreaterThan(goals[1].shift);
    });

    it('no zigzaguea: tras defender espera antes de cambiar de maniobra', () => {
      const { rival: start, profile } = launched(AI_LEVELS.hard);
      let rival = start;
      const me = getTrafficCar(rival.sim, circuit, circuit.length);
      let attacker = other(me, -15, me.lateral + 3, me.speed + 2);
      let changes = 0;
      let last = rival.driver.tactic;
      for (let tick = 0; tick < 60 * 3; tick += 1) {
        const next = step(rival, profile, attacker);
        rival = next.rival;
        attacker = { ...next.car, lateral: attacker.lateral * -1 };
        if (rival.driver.tactic !== last) {
          changes += 1;
          last = rival.driver.tactic;
        }
      }
      // Defender y soltar: a lo sumo dos cambios en 3 s con `tacticHold` 1,2 s y espera 1,5 s.
      expect(changes).toBeLessThanOrEqual(3);
    });

    it('se aparta de un auto a su lado más cerca que su separación', () => {
      const { rival, profile } = launched(AI_LEVELS.medium);
      const me = getTrafficCar(rival.sim, circuit, circuit.length);
      const beside = other(me, 0, me.lateral + 1, me.speed);
      const before = rival.driver.lineOffset;
      let next = rival;
      let car = beside;
      for (let tick = 0; tick < 30; tick += 1) {
        const result = step(next, profile, car);
        next = result.rival;
        car = {
          ...result.car,
          distance: getTrafficCar(next.sim, circuit, circuit.length).distance,
        };
      }
      expect(next.driver.lineOffset).toBeLessThan(before);
    });

    it('es determinista con otros autos', () => {
      const run = () => {
        let { rival, profile } = launched(AI_LEVELS.hard);
        const me = getTrafficCar(rival.sim, circuit, circuit.length);
        let car = other(me, 25, me.lateral, 22);
        for (let tick = 0; tick < 600; tick += 1) {
          const next = step(rival, profile, car);
          rival = next.rival;
          car = next.car;
        }
        return rival;
      };
      expect(run()).toEqual(run());
    });
  });

  it('es determinista: la misma semilla da la misma carrera', () => {
    const circuit = CIRCUITS[0];
    const profile = buildSpeedProfile(circuit, DEFAULT_DRIVING_CONFIG, LEVEL);
    const run = () => {
      let rivals = startRivals(circuit, 7);
      const rules = { totalLaps: LAPS, finishBrake: 0.5 };
      for (let tick = 0; tick < 1200; tick += 1) {
        rivals = rivals.map((rival) =>
          stepRival(rival, circuit, profile, DEFAULT_DRIVING_CONFIG, COAST_CONFIG, rules, DT, 0),
        );
      }
      return rivals.map((rival) => rival.sim.car);
    };
    expect(run()).toEqual(run());
  });

  it('los puestos de la grilla van ordenados hacia atrás', () => {
    const circuit = CIRCUITS[0];
    // Dos columnas: el segundo sale a la derecha y un poco más atrás; la fila siguiente, más atrás.
    expect(getGridProgress(circuit, 0) - getGridProgress(circuit, 1)).toBeCloseTo(GRID_STAGGER);
    expect(getGridProgress(circuit, 0) - getGridProgress(circuit, 2)).toBeCloseTo(GRID_ROW_GAP);
    expect(getGridOffset(circuit, 0)).toBeLessThan(0);
    expect(getGridOffset(circuit, 1)).toBeGreaterThan(0);
    expect(getGridOffset(circuit, 2)).toBe(getGridOffset(circuit, 0));
  });

  describe('createRivalRoster', () => {
    it('da nombres y colores distintos entre sí y al del jugador', () => {
      for (const colorId of ['blue', 'coral', 'pink', 'white']) {
        const roster = createRivalRoster(colorId);
        expect(roster).toHaveLength(RIVAL_COUNT);
        expect(new Set(roster.map((rival) => rival.colorId)).size).toBe(RIVAL_COUNT);
        expect(new Set(roster.map((rival) => rival.name)).size).toBe(RIVAL_COUNT);
        expect(roster.map((rival) => rival.colorId)).not.toContain(colorId);
      }
    });

    it('con el máximo de rivales, ningún nombre se repite', () => {
      const roster = createRivalRoster('blue', MAX_RIVALS);
      expect(roster).toHaveLength(MAX_RIVALS);
      expect(new Set(roster.map((rival) => rival.name)).size).toBe(MAX_RIVALS);
    });
  });
});
