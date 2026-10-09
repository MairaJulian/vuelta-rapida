import { act, render, screen } from '@testing-library/react-native';

import { createEventBus } from '@/core/EventBus';
import type { RaceEvent } from '@/core/RaceFlow';

import { GRID_VIEW, nextStartLightsView, StartLights } from './StartLights';
import { COLORS, GO_VISIBLE_MS, LABELS } from './StartLights.styles';

const lightOn = (light: number): RaceEvent => ({ type: 'lightOn', tick: light * 60, light });
const lightsOut: RaceEvent = { type: 'lightsOut', tick: 340 };

function litLamps() {
  return [1, 2, 3, 4, 5].filter(
    (light) =>
      screen.getByTestId(`start-light-${light}`).props.style[1].backgroundColor === COLORS.lampOn,
  ).length;
}

describe('nextStartLightsView', () => {
  it('enciende de a una luz; con todas, "Esperá…"', () => {
    expect(nextStartLightsView(GRID_VIEW, lightOn(1), 5)).toEqual({ lightsOn: 1, label: 'ready' });
    expect(nextStartLightsView(GRID_VIEW, lightOn(5), 5)).toEqual({ lightsOn: 5, label: 'wait' });
  });

  it('al apagarse las luces dice "¡Largada!"', () => {
    expect(nextStartLightsView({ lightsOn: 5, label: 'wait' }, lightsOut, 5)).toEqual({
      lightsOn: 0,
      label: 'go',
    });
  });

  it('reiniciar vuelve a la grilla; la llegada lo oculta; la pausa no lo cambia', () => {
    const lit = { lightsOn: 3, label: 'ready' as const };
    const phase = (from: 'paused' | 'lights' | 'racing', to: 'grid' | 'paused' | 'finished') =>
      ({ type: 'phase', tick: 1, from, to }) as RaceEvent;
    expect(nextStartLightsView(lit, phase('paused', 'grid'), 5)).toEqual(GRID_VIEW);
    expect(nextStartLightsView(lit, phase('lights', 'paused'), 5)).toBe(lit);
    expect(nextStartLightsView(lit, phase('racing', 'finished'), 5).label).toBeNull();
  });

  it('los demás eventos no lo cambian', () => {
    const event: RaceEvent = { type: 'borderHit', tick: 1, impactSpeed: 3 };
    expect(nextStartLightsView(GRID_VIEW, event, 5)).toBe(GRID_VIEW);
  });
});

describe('StartLights', () => {
  it('en la grilla muestra cinco columnas apagadas y "Preparate…"', async () => {
    await render(<StartLights bus={createEventBus<RaceEvent>()} />);
    expect(screen.getByTestId('start-lights')).toHaveStyle({ pointerEvents: 'none' });
    expect(litLamps()).toBe(0);
    expect(screen.getByTestId('start-lights-label')).toHaveTextContent(LABELS.ready);
  });

  it('sigue los eventos del bus: luces, espera y largada', async () => {
    const bus = createEventBus<RaceEvent>();
    await render(<StartLights bus={bus} />);
    await act(() => bus.emitAll([lightOn(1), lightOn(2), lightOn(3)]));
    expect(litLamps()).toBe(3);
    await act(() => bus.emitAll([lightOn(4), lightOn(5)]));
    expect(litLamps()).toBe(5);
    expect(screen.getByTestId('start-lights-label')).toHaveTextContent(LABELS.wait);
    await act(() => bus.emit(lightsOut));
    expect(litLamps()).toBe(0);
    expect(screen.getByTestId('start-lights-label')).toHaveTextContent(LABELS.go);
  });

  it('"¡Largada!" se va después de un momento', async () => {
    jest.useFakeTimers();
    try {
      const bus = createEventBus<RaceEvent>();
      await render(<StartLights bus={bus} />);
      await act(() => bus.emit(lightsOut));
      await act(() => jest.advanceTimersByTime(GO_VISIBLE_MS - 10));
      expect(screen.getByTestId('start-lights')).toBeTruthy();
      await act(() => jest.advanceTimersByTime(20));
      expect(screen.queryByTestId('start-lights')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('al reiniciar la carrera vuelve a aparecer', async () => {
    const bus = createEventBus<RaceEvent>();
    await render(<StartLights bus={bus} />);
    await act(() => bus.emit({ type: 'phase', tick: 9, from: 'racing', to: 'finished' }));
    expect(screen.queryByTestId('start-lights')).toBeNull();
    await act(() => bus.emit({ type: 'phase', tick: 0, from: 'finished', to: 'grid' }));
    expect(screen.getByTestId('start-lights-label')).toHaveTextContent(LABELS.ready);
  });

  it('deja de escuchar al desmontarse', async () => {
    const bus = createEventBus<RaceEvent>();
    const { unmount } = await render(<StartLights bus={bus} />);
    expect(bus.listenerCount()).toBe(1);
    await unmount();
    expect(bus.listenerCount()).toBe(0);
  });
});
