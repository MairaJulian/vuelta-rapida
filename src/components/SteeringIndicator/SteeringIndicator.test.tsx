import { render, screen } from '@testing-library/react-native';

import {
  createTiltState,
  DEFAULT_TILT_CONFIG,
  getFullTurnAngle,
  MAX_FULL_TURN_ANGLE,
} from '@/core/TiltSteering';
import type { TiltConfig, TiltSteeringResult } from '@/core/TiltSteering';

import { getDeadZoneWidth, indicatorOffset, SteeringIndicator } from './SteeringIndicator';
import { COLORS, FLAT_OPACITY, SCALE_DEGREES, SIZES, TRAVEL } from './SteeringIndicator.styles';

const DEG = Math.PI / 180;
const scale = SCALE_DEGREES * DEG;
const { deadZone, sensitivity } = DEFAULT_TILT_CONFIG;
const fullTurn = getFullTurnAngle(deadZone, sensitivity);

async function renderIndicator(
  result: Partial<TiltSteeringResult>,
  config: TiltConfig = DEFAULT_TILT_CONFIG,
) {
  const idle = { state: createTiltState(), steer: 0, relativeAngle: 0, confidence: 0 };
  const value = { ...idle, ...result };
  const output = { value, get: () => value };
  await render(<SteeringIndicator output={output as never} config={config} />);
}

const byTestId = (id: string) => screen.getAllByTestId(id, { includeHiddenElements: true });

/** Desplazamiento de cada marca de giro completo, en dp. */
function fullTurnOffsets(): number[] {
  return byTestId('steering-indicator-full-turn').map(
    (node) => node.props.style[1].transform[0].translateX,
  );
}

describe('indicatorOffset', () => {
  it('escala fija en grados: del centro al borde en el extremo de la escala, y se limita', () => {
    expect(indicatorOffset(0)).toBe(0);
    expect(indicatorOffset(scale / 2)).toBeCloseTo(TRAVEL / 2, 12);
    expect(indicatorOffset(scale)).toBe(TRAVEL);
    expect(indicatorOffset(-3 * scale)).toBe(-TRAVEL);
  });

  it('la escala alcanza para el giro completo más suave posible', () => {
    expect(scale).toBeGreaterThanOrEqual(MAX_FULL_TURN_ANGLE);
  });
});

describe('getDeadZoneWidth', () => {
  it('la franja abarca la zona muerta más el punto', () => {
    expect(getDeadZoneWidth(0)).toBe(SIZES.dot);
    expect(getDeadZoneWidth(scale / 4)).toBeCloseTo(TRAVEL / 2 + SIZES.dot, 12);
  });
});

describe('SteeringIndicator', () => {
  it('dibuja la píldora con la zona muerta del handoff', async () => {
    await renderIndicator({});
    expect(byTestId('steering-indicator')[0]).toHaveStyle({
      width: SIZES.width,
      height: SIZES.height,
    });
    expect(byTestId('steering-indicator-dead-zone')[0]).toHaveStyle({
      backgroundColor: COLORS.deadZone,
      width: getDeadZoneWidth(deadZone),
    });
  });

  it('marca el giro completo a los dos lados', async () => {
    await renderIndicator({});
    expect(fullTurnOffsets()).toEqual([-indicatorOffset(fullTurn), indicatorOffset(fullTurn)]);
  });

  it('al subir la sensibilidad la franja no cambia y las marcas se acercan al centro', async () => {
    await renderIndicator({}, { ...DEFAULT_TILT_CONFIG, sensitivity: 1 });
    const softWidth = byTestId('steering-indicator-dead-zone')[0].props.style[1].width;
    const softMark = fullTurnOffsets()[1];

    await renderIndicator({}, { ...DEFAULT_TILT_CONFIG, sensitivity: 10 });
    expect(byTestId('steering-indicator-dead-zone')[0].props.style[1].width).toBe(softWidth);
    expect(fullTurnOffsets()[1]).toBeLessThan(softMark);
  });

  it('el punto sigue el ángulo calibrado y llega a la marca con el giro completo', async () => {
    await renderIndicator({ relativeAngle: fullTurn, confidence: 1 });
    expect(byTestId('steering-indicator-dot')[0]).toHaveStyle({
      transform: [{ translateX: fullTurnOffsets()[1] }],
      opacity: 1,
    });
  });

  it('con el celular plano el punto se atenúa', async () => {
    await renderIndicator({ confidence: 0 });
    expect(byTestId('steering-indicator-dot')[0]).toHaveStyle({ opacity: FLAT_OPACITY });
  });
});
