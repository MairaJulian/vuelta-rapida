import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { getBestLap, withLapRecord } from '@/core/Profiles';
import type { ProfileDraft } from '@/core/Profiles';
import {
  createPlayerProfile,
  readProfiles,
  reloadProfiles,
  updateProfiles,
} from '@/hooks/useProfiles';

import { PROFILE_ERROR_TEXTS, ProfileEditorScreen } from './ProfileEditorScreen';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockParams: { id?: string } = {};
jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
  };
});

const storage = Storage as unknown as { __reset: () => void };

const LAGO = 'autodromo-del-lago';

async function create(draft: ProfileDraft) {
  let id = '';
  await act(() => {
    const result = createPlayerProfile(draft);
    id = result.ok ? result.profile.id : '';
  });
  return id;
}

const nameInput = () => screen.getByLabelText('Nombre del piloto');
const save = () => fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
const previewNumbers = () =>
  screen.container.queryAll((node) => node.type === 'SkiaText').map((node) => node.props.text);
const previewPainted = (color: string) =>
  screen.container.queryAll((node) => node.type === 'Path' && node.props.color === color);

describe('ProfileEditorScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    jest.clearAllMocks();
    mockParams = {};
    await act(() => reloadProfiles());
  });

  describe('crear', () => {
    it('arranca con los valores sugeridos: azul y el 7', async () => {
      await render(<ProfileEditorScreen />);
      expect(screen.getByRole('header')).toHaveTextContent('Nuevo piloto');
      expect(screen.getByText('Color · Azul')).toBeTruthy();
      expect(screen.getByTestId('number-value')).toHaveTextContent('7');
      expect(screen.getByRole('radio', { name: 'Azul' })).toHaveProp('accessibilityState', {
        checked: true,
      });
      expect(nameInput()).toHaveProp('value', '');
      expect(screen.getByText('Hasta 12 letras. Aparece en tus récords.')).toBeTruthy();
      expect(screen.queryByLabelText('Borrar piloto')).toBeNull();
    });

    it('la vista previa muestra los cambios en el momento', async () => {
      await render(<ProfileEditorScreen />);
      await fireEvent.press(screen.getByRole('radio', { name: 'Rosa' }));
      expect(screen.getByText('Color · Rosa')).toBeTruthy();
      expect(previewPainted('#F164AF').length).toBeGreaterThan(0);

      await fireEvent.press(screen.getByRole('button', { name: 'Sumar' }));
      expect(screen.getByTestId('number-value')).toHaveTextContent('8');
      expect(previewNumbers()).toEqual(['8']);

      await fireEvent.changeText(nameInput(), 'male');
      expect(screen.getByTestId('profile-preview-badge')).toHaveTextContent('8MALE');
    });

    it('el número da la vuelta en los extremos', async () => {
      await create({ name: 'Uno', colorId: 'blue', number: 7 });
      // Sugeridos usados: 7; el siguiente sugerido es el 14.
      await render(<ProfileEditorScreen />);
      expect(screen.getByTestId('number-value')).toHaveTextContent('14');
      for (let i = 0; i < 14; i += 1) {
        await fireEvent.press(screen.getByRole('button', { name: 'Restar' }));
      }
      expect(screen.getByTestId('number-value')).toHaveTextContent('99');
      await fireEvent.press(screen.getByRole('button', { name: 'Sumar' }));
      expect(screen.getByTestId('number-value')).toHaveTextContent('1');
    });

    it('sin nombre no guarda y lo explica; al escribir, el aviso se va', async () => {
      await render(<ProfileEditorScreen />);
      await fireEvent.changeText(nameInput(), '   ');
      await save();
      expect(screen.getByTestId('profile-error')).toHaveTextContent(
        PROFILE_ERROR_TEXTS['name-empty'],
      );
      expect(readProfiles().profiles).toEqual([]);
      expect(mockRouter.replace).not.toHaveBeenCalled();

      await fireEvent.changeText(nameInput(), 'Male');
      expect(screen.queryByTestId('profile-error')).toBeNull();
    });

    it('con un nombre que ya existe no guarda y lo explica', async () => {
      await create({ name: 'Male', colorId: 'blue', number: 27 });
      await render(<ProfileEditorScreen />);
      await fireEvent.changeText(nameInput(), ' MALÉ ');
      await save();
      expect(screen.getByTestId('profile-error')).toHaveTextContent(
        'Ya hay un piloto con ese nombre.',
      );
      expect(readProfiles().profiles).toHaveLength(1);
    });

    it('el campo acepta hasta 12 caracteres', async () => {
      await render(<ProfileEditorScreen />);
      expect(nameInput()).toHaveProp('maxLength', 12);
    });

    it('guarda el perfil normalizado, lo deja activo y va a Inicio', async () => {
      await render(<ProfileEditorScreen />);
      await fireEvent.press(screen.getByRole('radio', { name: 'Naranja' }));
      await fireEvent.changeText(nameInput(), '  Juan   Cruz ');
      await save();
      const state = readProfiles();
      expect(state.profiles).toEqual([
        expect.objectContaining({ name: 'Juan Cruz', colorId: 'orange', number: 7 }),
      ]);
      expect(state.activeProfileId).toBe(state.profiles[0].id);
      expect(mockRouter.replace).toHaveBeenCalledWith('/inicio');
    });

    it('el primer perfil se queda con los récords de antes', async () => {
      await act(() =>
        updateProfiles((state) => ({ ...state, unassignedRecords: { [LAGO]: 72480 } })),
      );
      await render(<ProfileEditorScreen />);
      await fireEvent.changeText(nameInput(), 'Male');
      await save();
      const state = readProfiles();
      expect(getBestLap(state, state.activeProfileId, LAGO)).toBe(72480);
    });

    it('Volver regresa; si no hay a dónde, va a "¿Quién juega?"', async () => {
      await render(<ProfileEditorScreen />);
      await fireEvent.press(screen.getByLabelText('Volver'));
      expect(mockRouter.back).toHaveBeenCalled();

      mockRouter.canGoBack.mockReturnValueOnce(false);
      await fireEvent.press(screen.getByLabelText('Volver'));
      expect(mockRouter.replace).toHaveBeenCalledWith('/jugadores');
    });
  });

  describe('editar', () => {
    let male = '';

    beforeEach(async () => {
      male = await create({ name: 'Male', colorId: 'pink', number: 27 });
      await create({ name: 'Tomi', colorId: 'teal', number: 7 });
      await act(() => updateProfiles((state) => withLapRecord(state, male, LAGO, 72480, 1)!));
      mockParams = { id: male };
    });

    it('arranca con los datos del perfil', async () => {
      await render(<ProfileEditorScreen />);
      expect(screen.getByRole('header')).toHaveTextContent('Tu monoplaza');
      expect(screen.getByText('Color · Rosa')).toBeTruthy();
      expect(screen.getByTestId('number-value')).toHaveTextContent('27');
      expect(nameInput()).toHaveProp('value', 'Male');
      expect(previewNumbers()).toEqual(['27']);
    });

    it('guarda los cambios, conserva los récords y vuelve', async () => {
      await render(<ProfileEditorScreen />);
      await fireEvent.changeText(nameInput(), 'Maca');
      await fireEvent.press(screen.getByRole('radio', { name: 'Violeta' }));
      await save();
      const state = readProfiles();
      expect(state.profiles[0]).toMatchObject({ id: male, name: 'Maca', colorId: 'violet' });
      expect(getBestLap(state, male, LAGO)).toBe(72480);
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('no puede tomar el nombre de otro perfil', async () => {
      await render(<ProfileEditorScreen />);
      await fireEvent.changeText(nameInput(), 'tomi');
      await save();
      expect(screen.getByTestId('profile-error')).toHaveTextContent(
        'Ya hay un piloto con ese nombre.',
      );
      expect(readProfiles().profiles[0].name).toBe('Male');
    });

    it('borrar pide confirmación; cancelar no borra nada', async () => {
      await render(<ProfileEditorScreen />);
      await fireEvent.press(screen.getByLabelText('Borrar piloto'));
      expect(screen.getByText('¿Borrar a MALE?')).toBeTruthy();
      expect(screen.getByText('También se borran sus récords. No se puede deshacer.')).toBeTruthy();
      await fireEvent.press(screen.getByText('Cancelar'));
      expect(screen.queryByText('¿Borrar a MALE?')).toBeNull();
      expect(readProfiles().profiles).toHaveLength(2);
    });

    it('al confirmar, borra el perfil y sus récords, y vuelve a "¿Quién juega?"', async () => {
      await render(<ProfileEditorScreen />);
      await fireEvent.press(screen.getByLabelText('Borrar piloto'));
      await fireEvent.press(screen.getByRole('button', { name: 'Borrar' }));
      const state = readProfiles();
      expect(state.profiles.map((profile) => profile.name)).toEqual(['Tomi']);
      expect(state.lapRecords).toEqual([]);
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/jugadores');
      // La pantalla sigue montada un instante: no redirige por su cuenta.
      expect(screen.queryByText('redirect:/jugadores')).toBeNull();
    });

    it('con un perfil que no existe, va a "¿Quién juega?"', async () => {
      mockParams = { id: 'p-no-existe' };
      await render(<ProfileEditorScreen />);
      expect(screen.getByText('redirect:/jugadores')).toBeTruthy();
    });
  });
});
