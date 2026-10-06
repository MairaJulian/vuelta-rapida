import { DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';

import {
  angleToSteer,
  calibrateTilt,
  createTiltState,
  DEFAULT_TILT_CONFIG,
  getFullTurnAngle,
  getScreenTilt,
  getTiltConfidence,
  stepTiltSteering,
  toScreenGravity,
  withTiltSteering,
} from './TiltSteering';
import type { GravityReading, ScreenRotation, TiltConfig, TiltState } from './TiltSteering.types';

const DEG = Math.PI / 180;
const DT = 1 / 60;
const G = 9.81;
const config = DEFAULT_TILT_CONFIG;

/**
 * Lectura del sensor para una postura del celular: girado `steer` grados como un
 * volante (positivo, en sentido horario), con la pantalla echada hacia atrás
 * `recline` grados (0 = vertical, 90 = plano) y la pantalla en `rotation`.
 */
function pose(steer: number, rotation: ScreenRotation = 90, recline = 30): GravityReading {
  const planar = G * Math.cos(recline * DEG);
  // Gravedad en coordenadas de pantalla.
  const sx = planar * Math.sin(steer * DEG);
  const sy = -planar * Math.cos(steer * DEG);
  const sz = -G * Math.sin(recline * DEG);
  // Coordenadas del celular: lo inverso de toScreenGravity.
  switch (rotation) {
    case 90:
      return { x: sy, y: -sx, z: sz, rotation };
    case 180:
      return { x: -sx, y: -sy, z: sz, rotation };
    case 270:
      return { x: -sy, y: sx, z: sz, rotation };
    default:
      return { x: sx, y: sy, z: sz, rotation };
  }
}

/** Procesa una secuencia de lecturas y devuelve el último resultado. */
function feed(readings: GravityReading[], tiltConfig: TiltConfig = config, start?: TiltState) {
  let state = start ?? createTiltState();
  let result = stepTiltSteering(state, readings[0], tiltConfig, DT);
  for (const reading of readings) {
    result = stepTiltSteering(state, reading, tiltConfig, DT);
    state = result.state;
  }
  return result;
}

describe('toScreenGravity y getScreenTilt', () => {
  it('derecho en horizontal da ángulo 0 en las dos orientaciones', () => {
    expect(getScreenTilt(pose(0, 90)).angle).toBeCloseTo(0, 12);
    expect(getScreenTilt(pose(0, 270)).angle).toBeCloseTo(0, 12);
  });

  it('girar en sentido horario da un ángulo positivo', () => {
    expect(getScreenTilt(pose(20, 90)).angle).toBeCloseTo(20 * DEG, 12);
  });

  it('corrige el signo: en las dos orientaciones horizontales los ejes del celular quedan invertidos', () => {
    const left = pose(20, 90);
    const right = pose(20, 270);
    // Misma postura física, lectura cruda opuesta en x e y...
    expect(right.x).toBeCloseTo(-left.x, 12);
    expect(right.y).toBeCloseTo(-left.y, 12);
    // ...y el mismo ángulo una vez corregida.
    expect(getScreenTilt(left).angle).toBeCloseTo(20 * DEG, 12);
    expect(getScreenTilt(right).angle).toBeCloseTo(20 * DEG, 12);
  });

  it('la corrección se aplica una sola vez: un vector ya ajustado por el sensor daría otro ángulo', () => {
    // Si el sensor ya entregara el vector en coordenadas de pantalla (ajuste automático
    // por orientación activado), corregirlo de nuevo lo giraría 90° de más.
    const alreadyAdjusted = { ...toScreenGravity(pose(20, 90)), rotation: 90 as const };
    expect(getScreenTilt(alreadyAdjusted).angle).not.toBeCloseTo(20 * DEG, 2);
  });

  it('con rotación 0 no transforma el vector', () => {
    expect(toScreenGravity({ x: 1, y: 2, z: 3, rotation: 0 })).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('mide cuánto de la gravedad cae sobre la pantalla', () => {
    expect(getScreenTilt(pose(0, 90, 0)).planar).toBeCloseTo(1, 12);
    expect(getScreenTilt(pose(0, 90, 60)).planar).toBeCloseTo(0.5, 12);
    expect(getScreenTilt(pose(0, 90, 90)).planar).toBeCloseTo(0, 12);
    expect(getScreenTilt({ x: 0, y: 0, z: 0, rotation: 90 }).planar).toBe(0);
  });
});

describe('getFullTurnAngle', () => {
  it('va de 45° con sensibilidad 1 a 12° con 10, y 5 equivale a 25°', () => {
    expect(getFullTurnAngle(1)).toBeCloseTo(45 * DEG, 12);
    expect(getFullTurnAngle(10)).toBeCloseTo(12 * DEG, 12);
    expect(getFullTurnAngle(5) / DEG).toBeCloseTo(25, 1);
  });

  it('a más sensibilidad, menos ángulo para girar a fondo', () => {
    for (let sensitivity = 1; sensitivity < 10; sensitivity += 1) {
      expect(getFullTurnAngle(sensitivity + 1)).toBeLessThan(getFullTurnAngle(sensitivity));
    }
  });

  it('limita valores fuera de rango', () => {
    expect(getFullTurnAngle(0)).toBe(getFullTurnAngle(1));
    expect(getFullTurnAngle(15)).toBe(getFullTurnAngle(10));
  });
});

describe('angleToSteer', () => {
  const deadZone = 5 * DEG;
  const fullTurn = 25 * DEG;

  it('dentro de la zona muerta da 0, también en el borde', () => {
    expect(angleToSteer(0, deadZone, fullTurn)).toBe(0);
    expect(angleToSteer(4 * DEG, deadZone, fullTurn)).toBe(0);
    expect(angleToSteer(-5 * DEG, deadZone, fullTurn)).toBe(0);
  });

  it('crece desde el borde de la zona muerta, sin saltos', () => {
    expect(angleToSteer(5.1 * DEG, deadZone, fullTurn)).toBeCloseTo(0.005, 9);
    expect(angleToSteer(15 * DEG, deadZone, fullTurn)).toBeCloseTo(0.5, 12);
    expect(angleToSteer(-15 * DEG, deadZone, fullTurn)).toBeCloseTo(-0.5, 12);
  });

  it('se limita a -1 y 1', () => {
    expect(angleToSteer(25 * DEG, deadZone, fullTurn)).toBe(1);
    expect(angleToSteer(80 * DEG, deadZone, fullTurn)).toBe(1);
    expect(angleToSteer(-80 * DEG, deadZone, fullTurn)).toBe(-1);
  });

  it('si la zona muerta llega al giro completo, fuera de ella gira a fondo', () => {
    expect(angleToSteer(30 * DEG, 30 * DEG, 20 * DEG)).toBe(0);
    expect(angleToSteer(31 * DEG, 30 * DEG, 20 * DEG)).toBe(1);
  });
});

describe('stepTiltSteering', () => {
  it('sin lecturas, va derecho', () => {
    const flat = stepTiltSteering(createTiltState(), pose(30, 90, 90), config, DT);
    expect(flat.steer).toBe(0);
    expect(flat.state.hasReading).toBe(false);
  });

  it('la primera lectura se toma tal cual, sin esperar al filtro', () => {
    const first = stepTiltSteering(createTiltState(), pose(15), config, DT);
    expect(first.relativeAngle).toBeCloseTo(15 * DEG, 12);
  });

  it('en la zona muerta el auto va derecho', () => {
    expect(feed([pose(3)]).steer).toBe(0);
    expect(feed([pose(-4.9)]).steer).toBe(0);
  });

  it('se limita a -1 y 1 con el celular muy inclinado', () => {
    expect(feed([pose(60)]).steer).toBe(1);
    expect(feed([pose(-60)]).steer).toBe(-1);
  });

  it('la calibración desplaza el centro', () => {
    const calibrated = { ...config, neutralAngle: 10 * DEG };
    expect(feed([pose(10)], calibrated).steer).toBe(0);
    expect(feed([pose(10)], calibrated).relativeAngle).toBeCloseTo(0, 12);
    // Sin calibrar, 10° ya saldría de la zona muerta.
    expect(feed([pose(10)]).steer).toBeGreaterThan(0);
    // 10° + 25° (giro completo con sensibilidad 5) es giro completo.
    expect(feed([pose(36)], calibrated).steer).toBe(1);
  });

  it('la misma inclinación da la misma dirección en las dos orientaciones horizontales', () => {
    const left = feed([pose(18, 90)]).steer;
    const right = feed([pose(18, 270)]).steer;
    expect(left).toBeGreaterThan(0);
    expect(right).toBeCloseTo(left, 12);
    expect(feed([pose(-18, 270)]).steer).toBeCloseTo(-left, 12);
  });

  it('con el celular plano no dobla y congela el filtro', () => {
    const tilted = feed([pose(20)]);
    // Casi plano (pantalla a 5° de la horizontal) y girado: la lectura no es confiable.
    const flat = stepTiltSteering(tilted.state, pose(30, 90, 85), config, DT);
    expect(flat.confidence).toBe(0);
    expect(flat.steer).toBe(0);
    expect(flat.state).toBe(tilted.state);
  });

  it('al acercarse a plano, la dirección se atenúa sin cambiar de signo', () => {
    const upright = feed([pose(20, 90, 30)]).steer;
    // 70° de la vertical: un 34 % de la gravedad sobre la pantalla, entre el mínimo y la confianza plena.
    const reclined = feed([pose(20, 90, 70)]);
    expect(reclined.confidence).toBeGreaterThan(0);
    expect(reclined.confidence).toBeLessThan(1);
    expect(reclined.steer).toBeGreaterThan(0);
    expect(reclined.steer).toBeLessThan(upright);
  });

  it('el filtro reduce el temblor del sensor', () => {
    // Temblor de ±3° alrededor de 15°, que cambia en cada lectura.
    const shaky = Array.from({ length: 120 }, (_, i) => pose(15 + (i % 2 === 0 ? 3 : -3)));
    const spread = (tiltConfig: TiltConfig) => {
      let state = createTiltState();
      const angles: number[] = [];
      for (const reading of shaky) {
        const result = stepTiltSteering(state, reading, tiltConfig, DT);
        state = result.state;
        angles.push(result.relativeAngle);
      }
      const tail = angles.slice(60);
      return Math.max(...tail) - Math.min(...tail);
    };
    const raw = spread({ ...config, smoothing: 0 });
    const filtered = spread(config);
    expect(raw).toBeCloseTo(6 * DEG, 9);
    expect(filtered).toBeLessThan(raw / 3);
  });

  it('el filtro recorre el 63 % del cambio en su constante de tiempo', () => {
    const start = feed([pose(0)]).state;
    const frames = Math.round(config.smoothing / DT);
    let state = start;
    let result = stepTiltSteering(state, pose(20), config, DT);
    for (let i = 0; i < frames; i += 1) {
      result = stepTiltSteering(state, pose(20), config, DT);
      state = result.state;
    }
    expect(result.relativeAngle / (20 * DEG)).toBeCloseTo(
      1 - Math.exp((-frames * DT) / config.smoothing),
      6,
    );
  });

  it('al cambiar de orientación reinicia el filtro con el ángulo nuevo, sin volantazo', () => {
    const before = feed([pose(20, 90)]);
    const after = stepTiltSteering(before.state, pose(-10, 270), config, DT);
    expect(after.state.rotation).toBe(270);
    expect(after.relativeAngle).toBeCloseTo(-10 * DEG, 12);
  });

  it('el filtro cruza ±180° por el camino corto', () => {
    const start = feed([pose(179)]).state;
    const next = stepTiltSteering(start, pose(-179), config, DT);
    expect(Math.abs(next.state.angle)).toBeGreaterThan(178 * DEG);
  });

  it('el estado es serializable', () => {
    const { state } = feed([pose(12), pose(14), pose(16)]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('getTiltConfidence', () => {
  it('es 0 por debajo del mínimo, 1 desde la confianza plena, y crece sin saltos', () => {
    expect(getTiltConfidence(0)).toBe(0);
    expect(getTiltConfidence(0.25)).toBe(0);
    expect(getTiltConfidence(0.4)).toBe(1);
    expect(getTiltConfidence(1)).toBe(1);
    expect(getTiltConfidence(0.325)).toBeCloseTo(0.5, 12);
  });
});

describe('calibrateTilt', () => {
  it('toma el ángulo filtrado como el nuevo derecho', () => {
    const { state } = feed([pose(12)]);
    const calibrated = calibrateTilt(state, config);
    expect(calibrated.neutralAngle).toBeCloseTo(12 * DEG, 12);
    expect(feed([pose(12)], calibrated).steer).toBe(0);
  });

  it('sin lecturas deja la configuración como estaba', () => {
    expect(calibrateTilt(createTiltState(), config)).toBe(config);
  });
});

describe('withTiltSteering', () => {
  it('acorta la rampa del modelo y deja el resto igual', () => {
    const tiltDriving = withTiltSteering(DEFAULT_DRIVING_CONFIG, config);
    expect(tiltDriving).toEqual({
      ...DEFAULT_DRIVING_CONFIG,
      steerInTime: config.steerRampTime,
      steerReturnTime: config.steerRampTime,
    });
  });
});
