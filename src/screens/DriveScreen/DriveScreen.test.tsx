import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import Storage from 'expo-sqlite/kv-store';
import { AppState, BackHandler } from 'react-native';
import type { AppStateStatus, HardwareBackPressEvent } from 'react-native';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { useAnimatedSensor, useFrameCallback } from 'react-native-reanimated';

import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import type { RaceResults } from '@/core/RaceFlow';
import { MAX_DEAD_ZONE } from '@/core/TiltSteering';
import {
  readPlayerPreferences,
  reloadPlayerPreferences,
  updatePlayerPreferences,
} from '@/hooks/usePlayerPreferences';
import { useRaceStatus } from '@/hooks/useRaceStatus';
import { COLORS as TRACK_COLORS } from '@/render/TrackLayer/TrackLayer.styles';

import { DriveScreen } from './DriveScreen';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: () => false,
};
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useEffect } = require('react');
  return {
    useRouter: () => mockRouter,
    // La pantalla de los tests siempre está enfocada.
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});
// El hook real, envuelto para poder llevar la pantalla a los resultados sin correr una carrera.
jest.mock('@/hooks/useRaceStatus', () => {
  const actual = jest.requireActual('@/hooks/useRaceStatus');
  return { ...actual, useRaceStatus: jest.fn(actual.useRaceStatus) };
});
const { useRaceStatus: realUseRaceStatus } = jest.requireActual('@/hooks/useRaceStatus');
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
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

const storage = Storage as unknown as { __reset: () => void };

/** Un cuadro del loop de la carrera; sus eventos llegan al hilo de JS en una microtarea. */
async function frame() {
  const callback = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
  await act(async () => {
    callback({ timestamp: 16, timeSincePreviousFrame: 16, timeSinceFirstFrame: 16 });
    await Promise.resolve();
  });
}

/** Simula el botón atrás de Android: lo atiende el último que se suscribió. */
async function pressBack() {
  const handler = jest.mocked(BackHandler.addEventListener).mock.calls.at(-1)![1];
  let handled: boolean | null | undefined;
  await act(async () => {
    handled = handler({} as HardwareBackPressEvent);
  });
  return handled;
}

type GestureHandlers = { onBegin?: () => void; onFinalize?: () => void };

const RESULTS: RaceResults = {
  totalTicks: 3600,
  lapTicks: [1260, 1170, 1170],
  bestLapTicks: 1170,
  bestLapIndex: 1,
  newRecord: true,
  previousRecordTicks: null,
};

describe('DriveScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    await act(() => reloadPlayerPreferences());
    jest.mocked(useRaceStatus).mockImplementation(realUseRaceStatus);
    mockRouter.dismissTo.mockClear();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  });

  afterEach(() => jest.mocked(BackHandler.addEventListener).mockRestore());

  it('muestra el lienzo y, sin modo elegido, los botones', async () => {
    await render(<DriveScreen />);
    expect(screen.getByTestId('drive-screen')).toBeTruthy();
    // Un solo lienzo para la escena; los íconos (como el de pausa) se ocultan al lector.
    const canvases = screen.container.queryAll((node) => node.type === 'Canvas');
    expect(canvases.filter((node) => node.props.accessible !== false)).toHaveLength(1);
    expect(screen.getByLabelText('Doblar a la izquierda')).toBeTruthy();
    expect(screen.getByLabelText('Frenar o retroceder')).toBeTruthy();
  });

  it('con inclinación guardada muestra los frenos laterales y no las flechas', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0.1 }));
    await render(<DriveScreen />);
    expect(screen.getByTestId('tilt-controls')).toBeTruthy();
    expect(screen.getByLabelText('Frenar o retroceder, lado izquierdo')).toBeTruthy();
    expect(screen.queryByLabelText('Doblar a la izquierda')).toBeNull();
  });

  it('desde el panel se cambia el modo en caliente y queda guardado', async () => {
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Inclinación' }));
    expect(readPlayerPreferences().controlMode).toBe('tilt');
    expect(screen.getByTestId('tilt-controls')).toBeTruthy();
  });

  it('el panel muestra los ajustes de inclinación solo al elegir inclinación', async () => {
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    expect(screen.queryByText('Calibración completa')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Inclinación' }));
    expect(screen.getByText('Calibración completa')).toBeTruthy();
  });

  it('Recalibrar del panel guarda la posición actual del celular como derecho', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0 }));
    await render(<DriveScreen />);
    // Celular en horizontal (rotación 90) girado 10° a la derecha.
    const angle = (10 * Math.PI) / 180;
    const { sensor } = jest.mocked(useAnimatedSensor).mock.results.at(-1)!.value;
    sensor.set({
      x: -9.81 * Math.cos(angle),
      y: -9.81 * Math.sin(angle),
      z: -3,
      interfaceOrientation: 90,
    });
    for (const [callback] of jest.mocked(useFrameCallback).mock.calls) {
      callback({ timestamp: 16, timeSincePreviousFrame: 16, timeSinceFirstFrame: 16 });
    }
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent.press(screen.getByText('Recalibrar'));
    expect(readPlayerPreferences().tiltNeutralAngle).toBeCloseTo(angle, 6);
  });

  it('la zona muerta del panel se guarda sin tocar la sensibilidad', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0 }));
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent(screen.getByTestId('slider-deadZone-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } },
    });
    const handlers = getByGestureTestId('slider-deadZone-gesture').handlers as {
      onStart?: (event: { x: number }) => void;
    };
    await act(() => handlers.onStart?.({ x: 200 }));
    // DevSlider redondea a 6 decimales.
    expect(readPlayerPreferences().tiltDeadZone).toBeCloseTo(MAX_DEAD_ZONE, 5);
    expect(readPlayerPreferences().tiltSensitivity).toBe(5);
  });

  it('Calibración completa del panel abre la pantalla de calibración', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0 }));
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent.press(screen.getByText('Calibración completa'));
    expect(mockRouter.push).toHaveBeenCalledWith('/calibracion');
  });

  it('cambia de modo en caliente cuando cambian las preferencias', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'buttons' }));
    await render(<DriveScreen />);
    expect(screen.getByLabelText('Doblar a la izquierda')).toBeTruthy();
    await act(() => updatePlayerPreferences({ controlMode: 'tilt' }));
    expect(screen.getByTestId('tilt-controls')).toBeTruthy();
  });

  it('mantiene la pantalla encendida mientras se maneja', async () => {
    await render(<DriveScreen />);
    expect(useKeepAwake).toHaveBeenCalled();
  });

  it('en desarrollo incluye el panel de ajuste', async () => {
    expect(__DEV__).toBe(true);
    await render(<DriveScreen />);
    expect(screen.getByLabelText('Abrir el panel de ajuste')).toBeTruthy();
  });

  it('arranca el loop de la simulación', async () => {
    jest.mocked(useFrameCallback).mockClear();
    await render(<DriveScreen />);
    expect(useFrameCallback).toHaveBeenCalled();
  });

  it('muestra el HUD de vueltas con el récord guardado del circuito', async () => {
    await act(() => updatePlayerPreferences({ bestLapsMs: { 'autodromo-del-lago': 72480 } }));
    await render(<DriveScreen />);
    expect(screen.getByTestId('lap-hud-lap')).toHaveTextContent('1/3');
    expect(screen.getByTestId('lap-hud-time')).toHaveTextContent('0:00.000');
    expect(screen.getByTestId('lap-hud-best')).toHaveTextContent('1:12.480');
  });

  describe('carrera', () => {
    it('al entrar muestra el semáforo en la grilla', async () => {
      await render(<DriveScreen />);
      expect(screen.getByTestId('start-lights-label')).toHaveTextContent('Preparate…');
    });

    it('el botón de pausa abre la pausa con la vuelta y el circuito, y Continuar la cierra', async () => {
      await render(<DriveScreen />);
      expect(screen.queryByTestId('pause-menu')).toBeNull();
      await fireEvent.press(screen.getByLabelText('Pausa'));
      await frame();
      expect(screen.getByTestId('pause-menu')).toBeTruthy();
      expect(screen.getByText(`Vuelta 1 de 3 · ${DEFAULT_CIRCUIT.name}`)).toBeTruthy();
      expect(screen.getByTestId('pause-lap-time')).toHaveTextContent('0:00.000');
      await fireEvent.press(screen.getByText('Continuar'));
      await frame();
      expect(screen.queryByTestId('pause-menu')).toBeNull();
    });

    it('el botón atrás pausa y, en la pausa, continúa', async () => {
      await render(<DriveScreen />);
      expect(await pressBack()).toBe(true);
      await frame();
      expect(screen.getByTestId('pause-menu')).toBeTruthy();
      expect(await pressBack()).toBe(true);
      await frame();
      expect(screen.queryByTestId('pause-menu')).toBeNull();
      expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    });

    it('pasar a segundo plano pausa la carrera', async () => {
      jest.mocked(AppState.addEventListener).mockClear();
      await render(<DriveScreen />);
      // Lo escuchan la pantalla y el sonido: se avisa a todos.
      const listeners = jest
        .mocked(AppState.addEventListener)
        .mock.calls.map(([, listener]) => listener as (state: AppStateStatus) => void);
      await act(async () => listeners.forEach((listener) => listener('background')));
      await frame();
      expect(screen.getByTestId('pause-menu')).toBeTruthy();
    });

    it('en la pausa, Reiniciar vuelve a la grilla y arranca el semáforo', async () => {
      await render(<DriveScreen />);
      await fireEvent.press(screen.getByLabelText('Pausa'));
      await frame();
      await fireEvent.press(screen.getByText('Reiniciar'));
      await frame();
      expect(screen.queryByTestId('pause-menu')).toBeNull();
      expect(screen.getByTestId('start-lights')).toBeTruthy();
    });

    it('los interruptores de la pausa guardan el sonido y la vibración', async () => {
      await render(<DriveScreen />);
      await fireEvent.press(screen.getByLabelText('Pausa'));
      await frame();
      await fireEvent.press(screen.getByRole('switch', { name: 'Sonido' }));
      await fireEvent.press(screen.getByRole('switch', { name: 'Vibración' }));
      expect(readPlayerPreferences()).toMatchObject({
        soundEnabled: false,
        vibrationEnabled: false,
      });
      expect(screen.getByRole('switch', { name: 'Sonido' })).not.toBeChecked();
    });

    it('el freno vibra según la preferencia de vibración', async () => {
      const brake = async () => {
        const handlers = getByGestureTestId('button-brake').handlers as GestureHandlers;
        await act(async () => {
          handlers.onBegin?.();
          await Promise.resolve();
        });
      };
      jest.mocked(Haptics.impactAsync).mockClear();
      const { unmount } = await render(<DriveScreen />);
      await brake();
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
      await unmount();

      await act(() => updatePlayerPreferences({ vibrationEnabled: false }));
      jest.mocked(Haptics.impactAsync).mockClear();
      await render(<DriveScreen />);
      await brake();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('las vueltas del panel valen desde la próxima carrera', async () => {
      await render(<DriveScreen />);
      await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
      await fireEvent(screen.getByTestId('slider-totalLaps-track'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } },
      });
      const handlers = getByGestureTestId('slider-totalLaps-gesture').handlers as {
        onStart?: (event: { x: number }) => void;
      };
      await act(() => handlers.onStart?.({ x: 0 }));
      // La carrera en curso sigue con 3 vueltas.
      await fireEvent.press(screen.getByLabelText('Pausa'));
      await frame();
      expect(screen.getByText(`Vuelta 1 de 3 · ${DEFAULT_CIRCUIT.name}`)).toBeTruthy();
      await fireEvent.press(screen.getByText('Reiniciar'));
      await frame();
      await fireEvent.press(screen.getByLabelText('Pausa'));
      await frame();
      expect(screen.getByText(`Vuelta 1 de 1 · ${DEFAULT_CIRCUIT.name}`)).toBeTruthy();
    });

    it('Salir al menú vuelve a Inicio', async () => {
      await render(<DriveScreen />);
      await fireEvent.press(screen.getByLabelText('Pausa'));
      await frame();
      await fireEvent.press(screen.getByText('Salir al menú'));
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/inicio');
    });

    it('con los resultados muestra la mejor vuelta, papelitos si hay récord, y Salir va a Inicio', async () => {
      jest
        .mocked(useRaceStatus)
        .mockReturnValue({ phase: 'finished', pausedLap: null, results: RESULTS });
      await render(<DriveScreen />);
      expect(screen.getByTestId('race-results')).toBeTruthy();
      expect(screen.getByTestId('results-best')).toHaveTextContent('0:19.500');
      expect(screen.getByTestId('confetti', { includeHiddenElements: true })).toBeTruthy();
      await fireEvent.press(screen.getByText('Salir'));
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/inicio');
    });

    it('sin récord nuevo no caen papelitos', async () => {
      jest.mocked(useRaceStatus).mockReturnValue({
        phase: 'finished',
        pausedLap: null,
        results: { ...RESULTS, newRecord: false, previousRecordTicks: 1000 },
      });
      await render(<DriveScreen />);
      expect(screen.getByTestId('race-results')).toBeTruthy();
      expect(screen.queryByTestId('confetti', { includeHiddenElements: true })).toBeNull();
    });

    it('tras la llegada el botón atrás sale a Inicio', async () => {
      jest
        .mocked(useRaceStatus)
        .mockReturnValue({ phase: 'finished', pausedLap: null, results: RESULTS });
      await render(<DriveScreen />);
      expect(await pressBack()).toBe(true);
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/inicio');
    });
  });

  it('el ancho de pista del panel cambia el circuito sin perder sus datos', async () => {
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent(screen.getByTestId('slider-width-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } },
    });
    const handlers = getByGestureTestId('slider-width-gesture').handlers as {
      onStart?: (event: { x: number }) => void;
    };
    await act(() => handlers.onStart?.({ x: 0 }));
    // El asfalto se dibuja con el ancho nuevo, sobre el mismo trazado del circuito.
    const [asphalt] = screen.container.queryAll(
      (node) => node.type === 'Path' && node.props.color === TRACK_COLORS.asphalt,
    );
    expect(asphalt.props.strokeWidth).toBe(8);
    expect(asphalt.props.path.match(/[ML] /g)).toHaveLength(DEFAULT_CIRCUIT.centerline.length);
  });
});
