import { renderHook } from '@testing-library/react-native';

import { NEUTRAL_INPUT, useDrivingInput } from './InputControls';

describe('InputControls', () => {
  it('la entrada neutra no dobla ni frena', () => {
    expect(NEUTRAL_INPUT).toEqual({ steer: 0, brake: 0 });
  });

  it('la entrada neutra no se puede modificar por accidente', () => {
    expect(Object.isFrozen(NEUTRAL_INPUT)).toBe(true);
  });

  it('useDrivingInput arranca en la entrada neutra', async () => {
    const { result } = await renderHook(() => useDrivingInput());
    expect(result.current.value).toEqual(NEUTRAL_INPUT);
  });
});
