import { act, render, screen } from '@testing-library/react-native';

import { createTiltState, DEFAULT_TILT_CONFIG, getFullTurnAngle } from '@/core/TiltSteering';
import type { TiltSteeringResult } from '@/core/TiltSteering';

import {
  arcPath,
  arcPoint,
  CalibrationGauge,
  formatSignedDegrees,
  gaugeAngle,
} from './CalibrationGauge';
import { COLORS, DEGREES_INTERVAL_MS, GAUGE } from './CalibrationGauge.styles';

const DEG = Math.PI / 180;
const fullTurn = getFullTurnAngle(DEFAULT_TILT_CONFIG.sensitivity);

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
  it('va de 0 arriba a span con la dirección a fondo, y se limita', () => {
    expect(gaugeAngle(0, fullTurn)).toBe(0);
    expect(gaugeAngle(fullTurn, fullTurn)).toBe(GAUGE.span);
    expect(gaugeAngle(-5 * fullTurn, fullTurn)).toBe(-GAUGE.span);
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
});

describe('formatSignedDegrees', () => {
  it('muestra el signo siempre, con el menos tipográfico', () => {
    expect(formatSignedDegrees(14 * DEG)).toBe('+14°');
    expect(formatSignedDegrees(-12 * DEG)).toBe('−12°');
    expect(formatSignedDegrees(0.2 * DEG)).toBe('0°');
  });
});

describe('CalibrationGauge', () => {
  it('dibuja el arco y la zona muerta', async () => {
    await render(
      <CalibrationGauge output={sharedResult(0) as never} config={DEFAULT_TILT_CONFIG} />,
    );
    const paths = screen.container.queryAll((node) => node.type === 'Path');
    expect(paths.map((node) => node.props.color)).toEqual([COLORS.track, COLORS.deadZone]);
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
