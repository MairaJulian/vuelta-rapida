import { CIRCUITS } from '@/core/Circuits';
import { createCarState, DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import { getGridPose, getGridProgress, GRID_SLOT_GAP } from '@/core/Track';
import type { Circuit } from '@/core/Track';

import {
  AI_LEVELS,
  buildSpeedProfile,
  createRival,
  createRivalRoster,
  RIVAL_COUNT,
  stepRival,
} from './RivalAI';
import type { RivalState } from './RivalAI.types';

const STEP_HZ = 60;
const DT = 1 / STEP_HZ;
const LEVEL = AI_LEVELS.easy;
const COAST_CONFIG = { ...DEFAULT_DRIVING_CONFIG, acceleration: 0 };
const LAPS = 2;
/** Tope de la prueba: 4 minutos por vuelta de sobra. */
const MAX_TICKS = LAPS * 240 * STEP_HZ;

/** Los rivales en la grilla, con semillas distintas. */
function startRivals(circuit: Circuit, seed: number): RivalState[] {
  return Array.from({ length: RIVAL_COUNT }, (_, slot) => {
    const pose = getGridPose(circuit, slot);
    return createRival({
      id: `rival-${slot + 1}`,
      car: createCarState(pose.x, pose.z, pose.heading),
      startProgress: getGridProgress(circuit, slot),
      seed: seed + slot * 101,
      level: LEVEL,
    });
  });
}

describe('IA de los rivales', () => {
  describe.each(CIRCUITS.map((circuit) => [circuit.name, circuit] as const))(
    '%s',
    (_name, circuit) => {
      const profile = buildSpeedProfile(circuit, DEFAULT_DRIVING_CONFIG, LEVEL);

      it('la velocidad objetivo queda entre el mínimo y el tope del auto', () => {
        expect(profile).toHaveLength(circuit.centerline.length);
        for (const speed of profile) {
          expect(speed).toBeGreaterThan(0);
          expect(speed).toBeLessThanOrEqual(DEFAULT_DRIVING_CONFIG.maxSpeed);
        }
      });

      it.each([1, 2, 3])('con la semilla %i nunca toca el borde y completa la carrera', (seed) => {
        let rivals = startRivals(circuit, seed);
        const rules = { totalLaps: LAPS, finishBrake: 0.5 };
        let touches = 0;
        let tick = 0;
        while (tick < MAX_TICKS && rivals.some((rival) => rival.finishTick === null)) {
          rivals = rivals.map((rival) =>
            stepRival(rival, circuit, profile, DEFAULT_DRIVING_CONFIG, COAST_CONFIG, rules, DT),
          );
          touches += rivals.filter((rival) => rival.sim.contact.touching).length;
          tick += 1;
        }
        expect(touches).toBe(0);
        expect(rivals.map((rival) => rival.finishTick !== null)).toEqual([true, true, true]);
      });
    },
  );

  it('es determinista: la misma semilla da la misma carrera', () => {
    const circuit = CIRCUITS[0];
    const profile = buildSpeedProfile(circuit, DEFAULT_DRIVING_CONFIG, LEVEL);
    const run = () => {
      let rivals = startRivals(circuit, 7);
      const rules = { totalLaps: LAPS, finishBrake: 0.5 };
      for (let tick = 0; tick < 1200; tick += 1) {
        rivals = rivals.map((rival) =>
          stepRival(rival, circuit, profile, DEFAULT_DRIVING_CONFIG, COAST_CONFIG, rules, DT),
        );
      }
      return rivals.map((rival) => rival.sim.car);
    };
    expect(run()).toEqual(run());
  });

  it('los puestos de la grilla van ordenados hacia atrás', () => {
    const circuit = CIRCUITS[0];
    expect(getGridProgress(circuit, 0) - getGridProgress(circuit, 1)).toBeCloseTo(GRID_SLOT_GAP);
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
  });
});
