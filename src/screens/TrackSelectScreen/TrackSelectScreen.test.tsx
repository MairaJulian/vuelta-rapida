import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { CIRCUITS, getCircuitSummary } from '@/core/Circuits';
import { updateProfile, withLapRecord } from '@/core/Profiles';
import { createPlayerProfile, reloadProfiles, updateProfiles } from '@/hooks/useProfiles';

import { TrackSelectScreen } from './TrackSelectScreen';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const storage = Storage as unknown as { __reset: () => void };

const LAGO = CIRCUITS[0];

function create(name: string, colorId: 'teal' | 'pink') {
  const result = createPlayerProfile({ name, colorId, number: 7 });
  return result.ok ? result.profile.id : '';
}

describe('TrackSelectScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    jest.clearAllMocks();
    await act(() => reloadProfiles());
  });

  it('muestra el título del handoff, las vueltas y una tarjeta por pista', async () => {
    await render(<TrackSelectScreen />);
    expect(screen.getByRole('header')).toHaveTextContent('Elegí la pista');
    expect(screen.getByText('Contrarreloj · 3 vueltas')).toBeTruthy();
    CIRCUITS.forEach((circuit) => {
      expect(screen.getByText(circuit.name)).toBeTruthy();
      expect(screen.getByText(getCircuitSummary(circuit))).toBeTruthy();
    });
  });

  it('la primera pista viene elegida', async () => {
    await render(<TrackSelectScreen />);
    expect(screen.getByTestId(`track-card-${LAGO.id}`)).toHaveProp('accessibilityState', {
      checked: true,
    });
  });

  it('sin tiempos, la pista dice que no tiene récord', async () => {
    await render(<TrackSelectScreen />);
    expect(screen.getByTestId(`track-record-${LAGO.id}`)).toHaveTextContent('Sin récord todavía');
  });

  it('con tiempos, muestra el récord con el nombre y el color de quien lo tiene', async () => {
    await act(() => {
      const tomi = create('Tomi', 'teal');
      const male = create('Male', 'pink');
      updateProfiles((state) =>
        withLapRecord(withLapRecord(state, tomi, LAGO.id, 70000, 1)!, male, LAGO.id, 72000, 2)!,
      );
    });
    await render(<TrackSelectScreen />);
    expect(screen.getByTestId(`track-record-${LAGO.id}`)).toHaveTextContent('Récord 1:10.000TOMI');
    const dot = screen.getByTestId(`track-record-${LAGO.id}`).children[1];
    expect(dot).toHaveStyle({ backgroundColor: '#00BEB7' });
  });

  it('si quien tiene el récord cambia de nombre, la tarjeta lo muestra', async () => {
    let tomi = '';
    await act(() => {
      tomi = create('Tomi', 'teal');
      updateProfiles((state) => withLapRecord(state, tomi, LAGO.id, 70000, 1)!);
      updateProfiles((state) => {
        const result = updateProfile(state, tomi, { name: 'Tomás', colorId: 'teal', number: 7 });
        return result.ok ? result.state : state;
      });
    });
    await render(<TrackSelectScreen />);
    expect(screen.getByTestId(`track-record-${LAGO.id}`)).toHaveTextContent('Récord 1:10.000TOMÁS');
  });

  it('Largar abre la carrera en la pista elegida', async () => {
    await render(<TrackSelectScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Largar' }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/pista',
      params: { circuito: LAGO.id },
    });
  });

  it('Volver regresa a Inicio', async () => {
    await render(<TrackSelectScreen />);
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('dibuja el trazado de la pista', async () => {
    await render(<TrackSelectScreen />);
    const [outline] = screen.container.queryAll(
      (node) => node.type === 'Path' && node.props.style === 'stroke',
    );
    expect(outline.props.path).toMatch(/^M [\d.]+ [\d.]+ L .* Z$/);
  });
});
