import { fireEvent, render, screen } from '@testing-library/react-native';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { DevSlider, ratioToValue, valueToRatio } from './DevSlider';

async function renderSlider(value = 5, onChange = jest.fn()) {
  await render(
    <DevSlider
      label="Agarre"
      value={value}
      min={0}
      max={10}
      step={0.5}
      onChange={onChange}
      formatValue={(v) => `${v} /s`}
      testID="grip"
    />,
  );
  await fireEvent(screen.getByTestId('grip-track'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } },
  });
  return onChange;
}

type PanHandlers = {
  onStart?: (event: { x: number }) => void;
  onUpdate?: (event: { x: number }) => void;
};

/**
 * Arrastra por las posiciones dadas llamando a los callbacks del gesto.
 * (fireGestureHandler usa el fireEvent asíncrono de RNTL 14 sin esperarlo y
 * provoca avisos de act() superpuestos.)
 */
function drag(...xs: number[]) {
  const handlers = getByGestureTestId('grip-gesture').handlers as PanHandlers;
  handlers.onStart?.({ x: xs[0] });
  xs.slice(1).forEach((x) => handlers.onUpdate?.({ x }));
}

describe('ratioToValue', () => {
  it('convierte la fracción en valor y redondea al paso', () => {
    expect(ratioToValue(0.5, 0, 10, 1)).toBe(5);
    expect(ratioToValue(0.33, 0, 10, 0.5)).toBe(3.5);
  });

  it('limita a los extremos', () => {
    expect(ratioToValue(-1, 2, 8, 1)).toBe(2);
    expect(ratioToValue(2, 2, 8, 1)).toBe(8);
  });

  it('no deja ruido de coma flotante', () => {
    expect(ratioToValue(0.3, 0, 1, 0.1)).toBe(0.3);
  });
});

describe('valueToRatio', () => {
  it('es la inversa en el rango', () => {
    expect(valueToRatio(5, 0, 10)).toBe(0.5);
  });

  it('no divide por cero con un rango vacío', () => {
    expect(valueToRatio(3, 4, 4)).toBe(0);
  });
});

describe('DevSlider', () => {
  it('muestra la etiqueta y el valor formateado', async () => {
    await renderSlider(2.5);
    expect(screen.getByText('Agarre')).toBeTruthy();
    expect(screen.getByText('2.5 /s')).toBeTruthy();
  });

  it('arrastrar cambia el valor según la posición del dedo', async () => {
    const onChange = await renderSlider(5);
    drag(150);
    expect(onChange).toHaveBeenLastCalledWith(7.5);
  });

  it('solo avisa cuando el valor redondeado cambia', async () => {
    const onChange = await renderSlider(5);
    drag(100, 101, 102, 160);
    expect(onChange.mock.calls).toEqual([[8]]);
  });

  it('no supera los extremos al arrastrar fuera de la pista', async () => {
    const onChange = await renderSlider(5);
    drag(-50);
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('es ajustable con lector de pantalla', async () => {
    const onChange = await renderSlider(5);
    await fireEvent(screen.getByTestId('grip-track'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(onChange).toHaveBeenLastCalledWith(5.5);
  });
});
