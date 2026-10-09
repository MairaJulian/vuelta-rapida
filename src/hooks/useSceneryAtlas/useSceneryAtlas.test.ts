import { drawAsImage } from '@shopify/react-native-skia';
import { renderHook, waitFor } from '@testing-library/react-native';

import { ATLAS_SIZE, SceneryAtlas } from '@/render/SceneryAtlas';

import { useSceneryAtlas } from './useSceneryAtlas';

describe('useSceneryAtlas', () => {
  it('empieza sin textura y la entrega cuando está dibujada', async () => {
    const { result } = await renderHook(() => useSceneryAtlas());
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(jest.mocked(drawAsImage)).toHaveBeenCalledTimes(1);
    const [element, size] = jest.mocked(drawAsImage).mock.calls[0];
    expect((element as { type: unknown }).type).toBe(SceneryAtlas);
    expect(size).toEqual(ATLAS_SIZE);
  });

  it('la reutiliza: la textura se dibuja una sola vez por sesión', async () => {
    const { result } = await renderHook(() => useSceneryAtlas());
    await waitFor(() => expect(result.current).not.toBeNull());
    // Sigue siendo la llamada del primer test.
    expect(jest.mocked(drawAsImage)).toHaveBeenCalledTimes(1);
  });
});
