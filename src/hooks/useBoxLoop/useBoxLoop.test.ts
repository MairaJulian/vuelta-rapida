import { renderHook } from '@testing-library/react-native';
import { useFrameCallback } from 'react-native-reanimated';

import { useBoxLoop } from './useBoxLoop';

const params = { areaWidth: 220, boxWidth: 20, speed: 100 };

function runFrame(dtMs: number | null) {
  const callback = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
  callback({
    timestamp: 0,
    timeSincePreviousFrame: dtMs,
    timeSinceFirstFrame: 0,
  });
}

describe('useBoxLoop', () => {
  beforeEach(() => {
    jest.mocked(useFrameCallback).mockClear();
  });

  it('empieza en x = 0 con el contador en 0 FPS', async () => {
    const { result } = await renderHook(() => useBoxLoop(params));
    expect(result.current.x.value).toBe(0);
    expect(result.current.fpsText.value).toBe('0 FPS');
  });

  it('registra un único frame callback', async () => {
    await renderHook(() => useBoxLoop(params));
    expect(useFrameCallback).toHaveBeenCalled();
  });

  it('avanza el rectángulo con cada cuadro', async () => {
    const { result } = await renderHook(() => useBoxLoop(params));
    runFrame(500);
    expect(result.current.x.value).toBeCloseTo(50, 5);
  });

  it('muestra los fps redondeados', async () => {
    const { result } = await renderHook(() => useBoxLoop(params));
    runFrame(1000 / 60);
    expect(result.current.fpsText.value).toBe('60 FPS');
  });

  it('ignora el primer cuadro, que llega sin tiempo previo', async () => {
    const { result } = await renderHook(() => useBoxLoop(params));
    runFrame(null);
    expect(result.current.x.value).toBe(0);
    expect(result.current.fpsText.value).toBe('0 FPS');
  });
});
