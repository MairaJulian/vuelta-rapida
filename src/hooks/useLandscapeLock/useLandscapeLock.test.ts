import { renderHook } from '@testing-library/react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { useLandscapeLock } from './useLandscapeLock';

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 5 },
  lockAsync: jest.fn(() => Promise.resolve()),
}));

describe('useLandscapeLock', () => {
  beforeEach(() => jest.mocked(ScreenOrientation.lockAsync).mockClear());

  it('permite las dos orientaciones horizontales al montar', async () => {
    await renderHook(() => useLandscapeLock());
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledTimes(1);
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    );
  });

  it('si el equipo no lo admite, no rompe', async () => {
    jest.mocked(ScreenOrientation.lockAsync).mockReturnValueOnce(Promise.reject(new Error('no')));
    await expect(renderHook(() => useLandscapeLock())).resolves.toBeTruthy();
  });
});
