import { createCarState, DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import type { CarState, DrivingInput } from '@/core/DrivingModel';
import { DEFAULT_FIXED_STEP_CONFIG, getStepMs } from '@/core/FixedStep';
import { clamp, wrapAngle } from '@/core/MathUtils';
import { advanceRace, createRace, DEFAULT_RACE_CONFIG, startLights } from '@/core/RaceFlow';
import type { RaceState } from '@/core/RaceFlow';
import { AI_LEVELS, buildSpeedProfile } from '@/core/RivalAI';
import {
  getGridPose,
  getGridProgress,
  getNearestOnCenterline,
  getTrackProgress,
  OVAL_CIRCUIT,
} from '@/core/Track';
import { getKerbReach, getTrackLimit } from '@/core/TrackBounds';

import { DEFAULT_COLLISION_CONFIG, NO_COLLISIONS } from './CarCollisions';
import type { CollisionConfig } from './CarCollisions.types';

const circuit = OVAL_CIRCUIT;
const stepConfig = DEFAULT_FIXED_STEP_CONFIG;
const STEP_MS = getStepMs(stepConfig);
const RIVALS = 5;
const FRAMES = 2400;
/** Margen de redondeo al medir solapes y salidas de pista, en metros. */
const EPSILON = 0.05;
/** Pasos seguidos que un solape puede durar mientras la pista lo aprieta antes de ser "permanente". */
const MAX_OVERLAP_STEPS = 30;

/** Punto del trazado a `distance` metros de la meta. */
function pointAt(distance: number) {
  const along = ((distance % circuit.length) + circuit.length) % circuit.length;
  let index = 0;
  while (index + 1 < circuit.distances.length && circuit.distances[index + 1] <= along) {
    index += 1;
  }
  const a = circuit.centerline[index];
  const b = circuit.centerline[(index + 1) % circuit.centerline.length];
  const end = circuit.distances[index + 1] ?? circuit.length;
  const t = (along - circuit.distances[index]) / (end - circuit.distances[index]);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/** Piloto automático: apunta a un punto del trazado 10 m adelante. */
function autopilot(car: CarState): DrivingInput {
  const target = pointAt(getTrackProgress(circuit, car.x, car.z) + 10);
  const desired = Math.atan2(target.x - car.x, car.z - target.z);
  return { steer: clamp(wrapAngle(desired - car.heading) * 4, -1, 1), brake: 0 };
}

/** Carrera con cinco rivales fáciles y el jugador, más rápido, saliendo último. */
function startRace(): RaceState {
  const slot = (index: number) => {
    const pose = getGridPose(circuit, index);
    return createCarState(pose.x, pose.z, pose.heading);
  };
  return startLights(
    createRace({
      car: slot(RIVALS),
      seed: 7,
      recordTicks: null,
      stepHz: stepConfig.stepHz,
      config: DEFAULT_RACE_CONFIG,
      field: {
        lapLength: circuit.length,
        playerProgress: getGridProgress(circuit, RIVALS),
        speedProfile: buildSpeedProfile(circuit, DEFAULT_DRIVING_CONFIG, AI_LEVELS.easy),
        rivals: Array.from({ length: RIVALS }, (_, i) => ({
          id: `rival-${i + 1}`,
          car: slot(i),
          startProgress: getGridProgress(circuit, i),
          seed: 100 + i,
          level: AI_LEVELS.easy,
        })),
      },
    }),
  );
}

function allCars(race: RaceState): CarState[] {
  return [race.sim.car, ...race.rivals.map((rival) => rival.sim.car)];
}

/** Corre la carrera y devuelve cada estado, sin retirar los eventos (la comparación los incluye). */
function run(collision: CollisionConfig, frames = FRAMES): RaceState[] {
  let race = startRace();
  const states: RaceState[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    race = advanceRace(
      race,
      STEP_MS,
      race.phase === 'racing' ? autopilot(race.sim.car) : { steer: 0, brake: 0 },
      DEFAULT_DRIVING_CONFIG,
      circuit,
      stepConfig,
      collision,
    );
    states.push(race);
  }
  return states;
}

describe('colisiones entre autos en la carrera', () => {
  it('la simulación con colisiones es determinista', () => {
    const first = run(DEFAULT_COLLISION_CONFIG);
    const second = run(DEFAULT_COLLISION_CONFIG);
    expect(second).toEqual(first);
    // La carrera tuvo choques: si no, la prueba no probaría nada.
    const hits = first[first.length - 1].events.filter((event) => event.type === 'carHit');
    expect(hits.length).toBeGreaterThan(0);
    // Y con los choques apagados, la carrera es otra.
    expect(run(NO_COLLISIONS)[FRAMES - 1].sim.car).not.toEqual(first[FRAMES - 1].sim.car);
  });

  it('nunca quedan dos autos superpuestos de forma permanente ni fuera de la pista', () => {
    const reach = DEFAULT_COLLISION_CONFIG.radius * 2;
    const maxFromCenter =
      getTrackLimit(circuit, DEFAULT_DRIVING_CONFIG) + getKerbReach(circuit) + EPSILON;
    const states = run(DEFAULT_COLLISION_CONFIG);
    const overlapRun = new Map<string, number>();
    let longest = 0;

    for (const race of states) {
      const cars = allCars(race);
      for (const car of cars) {
        expect(getNearestOnCenterline(circuit, car.x, car.z).distance).toBeLessThanOrEqual(
          maxFromCenter,
        );
      }
      for (let i = 0; i < cars.length; i += 1) {
        for (let j = i + 1; j < cars.length; j += 1) {
          const key = `${i}-${j}`;
          const overlapped =
            Math.hypot(cars[j].x - cars[i].x, cars[j].z - cars[i].z) < reach - EPSILON;
          const steps = overlapped ? (overlapRun.get(key) ?? 0) + 1 : 0;
          overlapRun.set(key, steps);
          longest = Math.max(longest, steps);
        }
      }
    }
    expect(longest).toBeLessThanOrEqual(MAX_OVERLAP_STEPS);
  });
});
