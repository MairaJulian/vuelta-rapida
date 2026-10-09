import { createEventBus } from './EventBus';

type TestEvent = { type: 'ping'; count: number } | { type: 'pong' };

describe('EventBus', () => {
  it('avisa cada evento solo a quienes escuchan su tipo', () => {
    const bus = createEventBus<TestEvent>();
    const pings: number[] = [];
    const pongs = jest.fn();
    bus.on('ping', (event) => pings.push(event.count));
    bus.on('pong', pongs);

    bus.emit({ type: 'ping', count: 1 });
    bus.emit({ type: 'ping', count: 2 });

    expect(pings).toEqual([1, 2]);
    expect(pongs).not.toHaveBeenCalled();
  });

  it('onAny recibe todos los eventos en orden', () => {
    const bus = createEventBus<TestEvent>();
    const seen: string[] = [];
    bus.onAny((event) => seen.push(event.type));
    bus.emitAll([{ type: 'ping', count: 1 }, { type: 'pong' }, { type: 'ping', count: 2 }]);
    expect(seen).toEqual(['ping', 'pong', 'ping']);
  });

  it('llama a los escuchas en el orden en que se suscribieron', () => {
    const bus = createEventBus<TestEvent>();
    const order: string[] = [];
    bus.on('pong', () => order.push('a'));
    bus.onAny(() => order.push('b'));
    bus.on('pong', () => order.push('c'));
    bus.emit({ type: 'pong' });
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('desuscribirse corta los avisos; hacerlo dos veces no rompe nada', () => {
    const bus = createEventBus<TestEvent>();
    const listener = jest.fn();
    const off = bus.on('pong', listener);
    bus.emit({ type: 'pong' });
    off();
    off();
    bus.emit({ type: 'pong' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount()).toBe(0);
  });

  it('suscribirse durante un aviso vale desde el próximo evento', () => {
    const bus = createEventBus<TestEvent>();
    const late = jest.fn();
    bus.on('pong', () => {
      bus.on('pong', late);
    });
    bus.emit({ type: 'pong' });
    expect(late).not.toHaveBeenCalled();
    bus.emit({ type: 'pong' });
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('si un escucha falla, los demás reciben el evento y el error se relanza', () => {
    const bus = createEventBus<TestEvent>();
    const after = jest.fn();
    bus.on('pong', () => {
      throw new Error('falló el sonido');
    });
    bus.on('pong', after);
    expect(() => bus.emit({ type: 'pong' })).toThrow('falló el sonido');
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('emitAll avisa todos los eventos aunque uno falle', () => {
    const bus = createEventBus<TestEvent>();
    const pings: number[] = [];
    bus.on('ping', (event) => {
      if (event.count === 1) throw new Error('uno');
      pings.push(event.count);
    });
    expect(() =>
      bus.emitAll([
        { type: 'ping', count: 1 },
        { type: 'ping', count: 2 },
      ]),
    ).toThrow('uno');
    expect(pings).toEqual([2]);
  });
});
