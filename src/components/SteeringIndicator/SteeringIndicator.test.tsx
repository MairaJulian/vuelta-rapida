import { render, screen } from '@testing-library/react-native';

import { createTiltState, DEFAULT_TILT_CONFIG, getFullTurnAngle } from '@/core/TiltSteering';
import type { TiltSteeringResult } from '@/core/TiltSteering';

import { getDeadZoneWidth, indicatorOffset, SteeringIndicator } from './SteeringIndicator';
import { COLORS, FLAT_OPACITY, SIZES, TRAVEL } from './SteeringIndicator.styles';

const fullTurn = getFullTurnAngle(DEFAULT_TILT_CONFIG.sensitivity);

async function renderIndicator(result: Partial<TiltSteeringResult>) {
  const idle = { state: createTiltState(), steer: 0, relativeAngle: 0, confidence: 0 };
  const value = { ...idle, ...result };
  const output = { value, get: () => value };
  await render(<SteeringIndicator output={output as never} config={DEFAULT_TILT_CONFIG} />);
}

describe('indicatorOffset', () => {
  it('va del centro al borde con el giro completo y se limita', () => {
    expect(indicatorOffset(0, fullTurn)).toBe(0);
    expect(indicatorOffset(fullTurn / 2, fullTurn)).toBeCloseTo(TRAVEL / 2, 12);
    expect(indicatorOffset(fullTurn, fullTurn)).toBe(TRAVEL);
    expect(indicatorOffset(-3 * fullTurn, fullTurn)).toBe(-TRAVEL);
  });
});

describe('getDeadZoneWidth', () => {
  it('la franja abarca la zona muerta más el punto', () => {
    expect(getDeadZoneWidth(0, fullTurn)).toBe(SIZES.dot);
    expect(getDeadZoneWidth(fullTurn / 4, fullTurn)).toBeCloseTo(TRAVEL / 2 + SIZES.dot, 12);
  });
});

describe('SteeringIndicator', () => {
  it('dibuja la píldora con la zona muerta del handoff', async () => {
    await renderIndicator({});
    expect(screen.getByTestId('steering-indicator', { includeHiddenElements: true })).toHaveStyle({
      width: SIZES.width,
      height: SIZES.height,
    });
    expect(
      screen.getByTestId('steering-indicator-dead-zone', { includeHiddenElements: true }),
    ).toHaveStyle({
      backgroundColor: COLORS.deadZone,
      width: getDeadZoneWidth(DEFAULT_TILT_CONFIG.deadZone, fullTurn),
    });
  });

  it('el punto sigue el ángulo calibrado', async () => {
    await renderIndicator({ relativeAngle: fullTurn, confidence: 1 });
    expect(
      screen.getByTestId('steering-indicator-dot', { includeHiddenElements: true }),
    ).toHaveStyle({
      transform: [{ translateX: TRAVEL }],
      opacity: 1,
    });
  });

  it('con el celular plano el punto se atenúa', async () => {
    await renderIndicator({ confidence: 0 });
    expect(
      screen.getByTestId('steering-indicator-dot', { includeHiddenElements: true }),
    ).toHaveStyle({ opacity: FLAT_OPACITY });
  });
});
