import { act, render, screen } from '@testing-library/react-native';

import {
  createTiltState,
  DEFAULT_TILT_CONFIG,
  getFullTurnAngle,
  MAX_FULL_TURN_ANGLE,
} from '@/core/TiltSteering';
import type { TiltSteeringResult } from '@/core/TiltSteering';

import {
  arcPath,
  arcPoint,
  CalibrationGauge,
  formatSignedDegrees,
  gaugeAngle,
  getGaugeMarks,
  tickPath,
} from './CalibrationGauge';
import { COLORS, DEGREES_INTERVAL_MS, GAUGE } from './CalibrationGauge.styles';

const DEG = Math.PI / 180;
const scale = GAUGE.scaleDegrees * DEG;

function sharedResult(relativeAngle: number) {
  let value: TiltSteeringResult = {
    state: createTiltState(),
    steer: 0,
    relativeAngle,
    confidence: 1,
  };
  return {
    get: () => value,
    set: (next: TiltSteeringResult) => {
      value = next;
    },
  };
}

describe('gaugeAngle', () => {
  it('escala fija en grados: de 0 arriba a span en el extremo de la escala, y se limita', () => {
    expect(gaugeAngle(0)).toBe(0);
    expect(gaugeAngle(scale / 2)).toBeCloseTo(GAUGE.span / 2, 12);
    expect(gaugeAngle(scale)).toBe(GAUGE.span);
    expect(gaugeAngle(-5 * scale)).toBe(-GAUGE.span);
  });

  it('la escala alcanza para el giro completo más suave posible', () => {
    expect(scale).toBeGreaterThanOrEqual(MAX_FULL_TURN_ANGLE);
  });
});

describe('getGaugeMarks', () => {
  it('la zona muerta ocupa siempre lo mismo, con cualquier sensibilidad', () => {
    const softest = getGaugeMarks({ ...DEFAULT_TILT_CONFIG, sensitivity: 1 });
    for (let sensitivity = 2; sensitivity <= 10; sensitivity += 1) {
      expect(getGaugeMarks({ ...DEFAULT_TILT_CONFIG, sensitivity }).deadZone).toBe(
        softest.deadZone,
      );
    }
    expect(softest.deadZone).toBeCloseTo(gaugeAngle(DEFAULT_TILT_CONFIG.deadZone), 12);
  });

  it('al subir la sensibilidad, la marca de giro completo se acerca al centro', () => {
    for (let sensitivity = 1; sensitivity < 10; sensitivity += 1) {
      const softer = getGaugeMarks({ ...DEFAULT_TILT_CONFIG, sensitivity });
      const sharper = getGaugeMarks({ ...DEFAULT_TILT_CONFIG, sensitivity: sensitivity + 1 });
      expect(sharper.fullTurn).toBeLessThan(softer.fullTurn);
      // Y siempre por fuera de la zona muerta.
      expect(sharper.fullTurn).toBeGreaterThan(sharper.deadZone);
    }
  });

  it('la marca de giro completo está donde la dirección llega a fondo', () => {
    const { deadZone, sensitivity } = DEFAULT_TILT_CONFIG;
    expect(getGaugeMarks(DEFAULT_TILT_CONFIG).fullTurn).toBeCloseTo(
      gaugeAngle(getFullTurnAngle(deadZone, sensitivity)),
      12,
    );
  });

  it('una zona muerta más grande ocupa más arco', () => {
    const small = getGaugeMarks({ ...DEFAULT_TILT_CONFIG, deadZone: 1 * DEG });
    const large = getGaugeMarks({ ...DEFAULT_TILT_CONFIG, deadZone: 9 * DEG });
    expect(large.deadZone).toBeGreaterThan(small.deadZone);
  });
});

describe('arcPoint y arcPath', () => {
  it('0° es la parte de arriba del arco y ±90° sus extremos', () => {
    expect(arcPoint(0).x).toBeCloseTo(GAUGE.centerX, 9);
    expect(arcPoint(0).y).toBeCloseTo(GAUGE.centerY - GAUGE.radius, 9);
    expect(arcPoint(90).x).toBeCloseTo(GAUGE.centerX + GAUGE.radius, 9);
    expect(arcPoint(-90).x).toBeCloseTo(GAUGE.centerX - GAUGE.radius, 9);
  });

  it('el arco se recorre en sentido horario, por arriba', () => {
    expect(arcPath(-90, 90)).toMatch(/^M .* A 116 116 0 0 1 /);
  });

  it('la marca cruza el arco, centrada en él', () => {
    const [, x1, y1, , x2, y2] = tickPath(0).split(' ');
    expect(Number(x1)).toBeCloseTo(GAUGE.centerX, 9);
    expect(Number(x2)).toBeCloseTo(GAUGE.centerX, 9);
    expect(Number(y1)).toBeCloseTo(GAUGE.centerY - GAUGE.radius + GAUGE.tickLength / 2, 9);
    expect(Number(y2)).toBeCloseTo(GAUGE.centerY - GAUGE.radius - GAUGE.tickLength / 2, 9);
  });
});

describe('formatSignedDegrees', () => {
  it('muestra el signo siempre, con el menos tipográfico', () => {
    expect(formatSignedDegrees(14 * DEG)).toBe('+14°');
    expect(formatSignedDegrees(-12 * DEG)).toBe('−12°');
    expect(formatSignedDegrees(0.2 * DEG)).toBe('0°');
  });
});

describe('CalibrationGauge', () => {
  it('dibuja el arco, la zona muerta y las dos marcas de giro completo', async () => {
    await render(
      <CalibrationGauge output={sharedResult(0) as never} config={DEFAULT_TILT_CONFIG} />,
    );
    const paths = screen.container.queryAll((node) => node.type === 'Path');
    expect(paths.map((node) => node.props.color)).toEqual([
      COLORS.track,
      COLORS.deadZone,
      COLORS.fullTurn,
      COLORS.fullTurn,
    ]);
    const { fullTurn } = getGaugeMarks(DEFAULT_TILT_CONFIG);
    expect(paths[2].props.path).toBe(tickPath(-fullTurn));
    expect(paths[3].props.path).toBe(tickPath(fullTurn));
  });

  it('al cambiar la sensibilidad la zona azul no cambia de tamaño', async () => {
    const deadZonePath = async (sensitivity: number) => {
      await render(
        <CalibrationGauge
          output={sharedResult(0) as never}
          config={{ ...DEFAULT_TILT_CONFIG, sensitivity }}
        />,
      );
      return screen.container.queryAll((node) => node.type === 'Path')[1].props.path;
    };
    expect(await deadZonePath(10)).toBe(await deadZonePath(1));
  });

  it('la silueta del teléfono gira con el ángulo y muestra los grados', async () => {
    await render(
      <CalibrationGauge output={sharedResult(14 * DEG) as never} config={DEFAULT_TILT_CONFIG} />,
    );
    expect(screen.getByText('+14°')).toBeTruthy();
    expect(screen.getByTestId('calibration-phone')).toHaveStyle({
      transform: [{ rotate: `${14 * DEG}rad` }],
    });
  });

  it('actualiza los grados mientras el jugador inclina el celular', async () => {
    jest.useFakeTimers();
    try {
      const output = sharedResult(0);
      await render(<CalibrationGauge output={output as never} config={DEFAULT_TILT_CONFIG} />);
      output.set({ ...output.get(), relativeAngle: -8 * DEG });
      await act(() => jest.advanceTimersByTime(DEGREES_INTERVAL_MS));
      expect(screen.getByText('−8°')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
