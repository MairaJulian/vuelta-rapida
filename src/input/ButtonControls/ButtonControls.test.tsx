import { render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DrivingInput } from '@/core/DrivingModel';
import { NEUTRAL_INPUT } from '@/input/InputControls';

import { ButtonControls, buttonsToInput } from './ButtonControls';
import { COLORS } from './ButtonControls.styles';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

type GestureHandlers = { onBegin?: () => void; onFinalize?: () => void };

/** Apoya un dedo sobre el botón sin levantarlo (fireGestureHandler siempre termina el gesto). */
function press(testId: string) {
  (getByGestureTestId(testId).handlers as GestureHandlers).onBegin?.();
}

function release(testId: string) {
  (getByGestureTestId(testId).handlers as GestureHandlers).onFinalize?.();
}

async function renderControls() {
  const input = { value: { ...NEUTRAL_INPUT } as DrivingInput, set: jest.fn() };
  input.set.mockImplementation((next: DrivingInput) => {
    input.value = next;
  });
  const utils = await render(<ButtonControls input={input as never} />);
  return { input, ...utils };
}

describe('buttonsToInput', () => {
  it('sin botones es entrada neutra', () => {
    expect(buttonsToInput({ left: false, right: false, brake: false })).toEqual(NEUTRAL_INPUT);
  });

  it('izquierda y derecha dan -1 y 1', () => {
    expect(buttonsToInput({ left: true, right: false, brake: false }).steer).toBe(-1);
    expect(buttonsToInput({ left: false, right: true, brake: false }).steer).toBe(1);
  });

  it('izquierda y derecha juntas se anulan', () => {
    expect(buttonsToInput({ left: true, right: true, brake: false }).steer).toBe(0);
  });

  it('el freno es a fondo', () => {
    expect(buttonsToInput({ left: false, right: false, brake: true }).brake).toBe(1);
  });
});

describe('ButtonControls', () => {
  beforeEach(() => {
    jest.mocked(Haptics.impactAsync).mockClear();
  });

  it('muestra los tres botones con etiquetas accesibles', async () => {
    await renderControls();
    expect(screen.getByLabelText('Doblar a la izquierda')).toBeTruthy();
    expect(screen.getByLabelText('Doblar a la derecha')).toBeTruthy();
    expect(screen.getByLabelText('Frenar o retroceder')).toBeTruthy();
    expect(screen.getByText('Freno')).toBeTruthy();
  });

  it('usa los colores del handoff', async () => {
    await renderControls();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).toContain(COLORS.steer);
    expect(tree).toContain(COLORS.brake);
  });

  it('mantener izquierda dobla a la izquierda y soltar vuelve a neutro', async () => {
    const { input } = await renderControls();
    press('button-left');
    expect(input.value).toEqual({ steer: -1, brake: 0 });
    release('button-left');
    expect(input.value).toEqual(NEUTRAL_INPUT);
  });

  it('un toque completo deja la entrada en neutro', async () => {
    const { input } = await renderControls();
    fireGestureHandler(getByGestureTestId('button-right'));
    expect(input.value).toEqual(NEUTRAL_INPUT);
  });

  it('multitáctil: frenar y doblar a la vez', async () => {
    const { input } = await renderControls();
    press('button-right');
    press('button-brake');
    expect(input.value).toEqual({ steer: 1, brake: 1 });

    release('button-right');
    expect(input.value).toEqual({ steer: 0, brake: 1 });

    press('button-left');
    expect(input.value).toEqual({ steer: -1, brake: 1 });

    release('button-brake');
    release('button-left');
    expect(input.value).toEqual(NEUTRAL_INPUT);
  });

  it('vibra una vez al empezar a frenar', async () => {
    await renderControls();
    press('button-brake');
    press('button-brake');
    await Promise.resolve();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('no vibra al doblar', async () => {
    await renderControls();
    press('button-left');
    await Promise.resolve();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('sin insets respeta los márgenes del handoff', async () => {
    await renderControls();
    expect(screen.getByTestId('steer-group')).toHaveStyle({ left: 28, bottom: 18 });
    expect(screen.getByLabelText('Frenar o retroceder')).toHaveStyle({ right: 28, bottom: 14 });
  });

  it('se corre para no quedar debajo de la barra de navegación', async () => {
    jest.mocked(useSafeAreaInsets).mockReturnValueOnce({ top: 0, right: 48, bottom: 0, left: 24 });
    await renderControls();
    expect(screen.getByTestId('steer-group')).toHaveStyle({ left: 28 + 24 });
    expect(screen.getByLabelText('Frenar o retroceder')).toHaveStyle({ right: 28 + 48 });
  });

  it('al desmontarse deja la entrada en neutro', async () => {
    const { input, unmount } = await renderControls();
    press('button-brake');
    await unmount();
    expect(input.set).toHaveBeenLastCalledWith(NEUTRAL_INPUT);
    expect(input.value).toEqual(NEUTRAL_INPUT);
  });
});
