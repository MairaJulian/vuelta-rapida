import { render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { useAnimatedSensor, useFrameCallback } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DrivingInput } from '@/core/DrivingModel';
import { DEFAULT_TILT_CONFIG } from '@/core/TiltSteering';
import { NEUTRAL_INPUT } from '@/input/InputControls';

import { brakesToInput, TiltControls } from './TiltControls';
import { COLORS } from './TiltControls.styles';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('expo-sensors', () => ({
  Accelerometer: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    setUpdateInterval: jest.fn(),
  },
}));
jest.mock('expo-screen-orientation', () => ({
  Orientation: { LANDSCAPE_LEFT: 3, LANDSCAPE_RIGHT: 4 },
  getOrientationAsync: jest.fn(() => Promise.resolve(4)),
  addOrientationChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

type GestureHandlers = { onBegin?: () => void; onFinalize?: () => void };

const press = (testId: string) =>
  (getByGestureTestId(testId).handlers as GestureHandlers).onBegin?.();
const release = (testId: string) =>
  (getByGestureTestId(testId).handlers as GestureHandlers).onFinalize?.();

async function renderControls(brakeVibration?: boolean) {
  const input = {
    value: { ...NEUTRAL_INPUT } as DrivingInput,
    get: () => input.value,
    set: jest.fn((next: DrivingInput) => {
      input.value = next;
    }),
  };
  const utils = await render(
    <TiltControls
      input={input as never}
      config={DEFAULT_TILT_CONFIG}
      brakeVibration={brakeVibration}
    />,
  );
  return { input, ...utils };
}

describe('brakesToInput', () => {
  it('cualquiera de los dos frenos frena a fondo, y los dos juntos igual que uno', () => {
    expect(brakesToInput({ left: false, right: false })).toBe(0);
    expect(brakesToInput({ left: true, right: false })).toBe(1);
    expect(brakesToInput({ left: false, right: true })).toBe(1);
    expect(brakesToInput({ left: true, right: true })).toBe(1);
  });
});

describe('TiltControls', () => {
  beforeEach(() => {
    jest.mocked(Haptics.impactAsync).mockClear();
  });

  it('muestra solo los dos frenos laterales y el indicador de volante', async () => {
    await renderControls();
    expect(screen.getByLabelText('Frenar o retroceder, lado izquierdo')).toBeTruthy();
    expect(screen.getByLabelText('Frenar o retroceder, lado derecho')).toBeTruthy();
    expect(screen.getAllByText('Freno')).toHaveLength(2);
    expect(screen.queryByLabelText('Doblar a la izquierda')).toBeNull();
    expect(screen.getByTestId('steering-indicator', { includeHiddenElements: true })).toBeTruthy();
  });

  it('usa el coral del handoff', async () => {
    await renderControls();
    expect(JSON.stringify(screen.toJSON())).toContain(COLORS.brake);
  });

  it('cualquier freno frena; los dos juntos frenan igual y soltar uno no suelta el freno', async () => {
    const { input } = await renderControls();
    press('brake-left');
    expect(input.value.brake).toBe(1);
    press('brake-right');
    expect(input.value.brake).toBe(1);
    release('brake-left');
    expect(input.value.brake).toBe(1);
    release('brake-right');
    expect(input.value.brake).toBe(0);
  });

  it('frenar no toca la dirección', async () => {
    const { input } = await renderControls();
    input.value = { steer: 0.4, brake: 0 };
    press('brake-right');
    expect(input.value).toEqual({ steer: 0.4, brake: 1 });
  });

  it('con la vibración apagada no vibra al frenar', async () => {
    await renderControls(false);
    press('brake-left');
    await Promise.resolve();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('vibra una sola vez al empezar a frenar, aunque se apoyen los dos pulgares', async () => {
    await renderControls();
    press('brake-left');
    press('brake-right');
    await Promise.resolve();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('el sensor dobla el auto a través de la entrada', async () => {
    const { input } = await renderControls();
    const { sensor } = jest.mocked(useAnimatedSensor).mock.results.at(-1)!.value;
    // Horizontal (rotación 90), girado 40° a la derecha: más que el giro completo.
    const angle = (40 * Math.PI) / 180;
    sensor.set({
      x: -9.81 * Math.cos(angle),
      y: -9.81 * Math.sin(angle),
      z: 0,
      interfaceOrientation: 90,
    });
    const frame = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
    frame({ timestamp: 16, timeSincePreviousFrame: 16, timeSinceFirstFrame: 16 });
    expect(input.value.steer).toBe(1);
  });

  it('sin insets respeta los márgenes del handoff', async () => {
    await renderControls();
    expect(screen.getByLabelText('Frenar o retroceder, lado izquierdo')).toHaveStyle({
      left: 20,
      bottom: 22,
      width: 76,
      height: 128,
    });
    expect(screen.getByLabelText('Frenar o retroceder, lado derecho')).toHaveStyle({
      right: 20,
      bottom: 22,
    });
  });

  it('se corre para no quedar debajo de la barra de navegación', async () => {
    jest.mocked(useSafeAreaInsets).mockReturnValueOnce({ top: 0, right: 48, bottom: 0, left: 24 });
    await renderControls();
    expect(screen.getByLabelText('Frenar o retroceder, lado izquierdo')).toHaveStyle({ left: 44 });
    expect(screen.getByLabelText('Frenar o retroceder, lado derecho')).toHaveStyle({ right: 68 });
  });

  it('al desmontarse deja la entrada en neutro', async () => {
    const { input, unmount } = await renderControls();
    press('brake-left');
    await unmount();
    expect(input.value).toEqual(NEUTRAL_INPUT);
  });
});
