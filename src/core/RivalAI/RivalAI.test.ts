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
  MAX_RIVALS,
  RIVAL_COUNT,
  stepRival,
  withDynamicDifficulty,
} from './RivalAI';
import type { AiLevel, RivalState } from './RivalAI.types';

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
                rivals = rivals.map((rival) =>
                  stepRival(
                    rival,
                    circuit,
                    profile,
                    DEFAULT_DRIVING_CONFIG,
                    COAST_CONFIG,
                    rules,
                    DT,
                    1e9,
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
