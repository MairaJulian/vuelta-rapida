import type { BusEvent, EventBus, EventListener, Unsubscribe } from './EventBus.types';

interface Subscription<E> {
  /** `null` escucha todos los tipos. */
  type: string | null;
  listener: EventListener<E>;
}

/**
 * Bus de eventos tipado. Los escuchas se llaman en el orden en que se suscribieron.
 * Si uno falla, los demás igual reciben el evento y el primer error se relanza al
 * final: un fallo del sonido no deja sin vibración, pero tampoco queda escondido.
 */
export function createEventBus<E extends BusEvent>(): EventBus<E> {
  let subscriptions: Subscription<E>[] = [];

  const subscribe = (subscription: Subscription<E>): Unsubscribe => {
    subscriptions = [...subscriptions, subscription];
    return () => {
      subscriptions = subscriptions.filter((current) => current !== subscription);
    };
  };

  const emit = (event: E) => {
    // Copia: suscribirse o desuscribirse durante el aviso vale para el próximo evento.
    const current = subscriptions;
    let firstError: unknown = null;
    let failed = false;
    for (const subscription of current) {
      if (subscription.type !== null && subscription.type !== event.type) {
        continue;
      }
      try {
        subscription.listener(event);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
        }
      }
    }
    if (failed) {
      throw firstError;
    }
  };

  return {
    on: (type, listener) => subscribe({ type, listener: listener as EventListener<E> }),
    onAny: (listener) => subscribe({ type: null, listener }),
    emit,
    emitAll: (events) => {
      let firstError: unknown = null;
      let failed = false;
      for (const event of events) {
        try {
          emit(event);
        } catch (error) {
          if (!failed) {
            failed = true;
            firstError = error;
          }
        }
      }
      if (failed) {
        throw firstError;
      }
    },
    listenerCount: () => subscriptions.length,
  };
}
